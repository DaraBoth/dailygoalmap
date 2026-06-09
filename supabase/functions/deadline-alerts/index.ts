import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

const APP_ORIGIN = "https://dailygoalmap.vercel.app";
const TINYNOTIE_PUSH_URL = "https://tinynotie-api.vercel.app/openai/push";

// Non-overlapping time bands relative to now (minutesFromNow = end_date - now in minutes).
// Negative = already past due. Each task falls into at most one band per hourly cron run.
const WINDOWS = [
  { label: "overdue", minMinutes: -60,  maxMinutes: 0,    past: true  }, // just became overdue
  { label: "1h",      minMinutes: 0,    maxMinutes: 60,   past: false }, // due within 1h
  { label: "3h",      minMinutes: 60,   maxMinutes: 180,  past: false }, // due in 1–3h
  { label: "24h",     minMinutes: 180,  maxMinutes: 1440, past: false }, // due in 3–24h
] as const;

type WindowLabel = "overdue" | "1h" | "3h" | "24h";

function buildNotificationText(label: WindowLabel, taskTitle: string, goalTitle: string) {
  if (label === "overdue") {
    return {
      title: "⚠️ Task overdue",
      body: `"${taskTitle}" in "${goalTitle}" is now overdue!`,
    };
  }
  const windowMap: Record<string, string> = { "1h": "1 hour", "3h": "3 hours", "24h": "24 hours" };
  return {
    title: "⏰ Task deadline approaching",
    body: `"${taskTitle}" is due within ${windowMap[label]} in "${goalTitle}".`,
  };
}

function toAppUrl(path: string | null | undefined): string {
  if (!path) return `${APP_ORIGIN}/dashboard`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${APP_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

interface AlertItem {
  goal_id: string;
  receiver_id: string;
  payload: Record<string, unknown>;
  url: string;
  window: WindowLabel;
}

async function sendPushNotifications(
  supabase: ReturnType<typeof createClient>,
  alerts: AlertItem[],
): Promise<{ attempted: number; sent: number; skipped: number; failed: number }> {
  const receiverIds = [...new Set(alerts.map((a) => a.receiver_id))];
  if (receiverIds.length === 0) return { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, identifier")
    .in("user_id", receiverIds);

  if (error) {
    console.error("deadline-alerts: push subscription query failed", error);
    return { attempted: 0, sent: 0, skipped: receiverIds.length, failed: 0 };
  }

  const identifierByUser = new Map<string, string>();
  for (const sub of subscriptions ?? []) {
    if (sub.user_id && sub.identifier) identifierByUser.set(sub.user_id, sub.identifier);
  }

  let sent = 0, skipped = 0, failed = 0;

  await Promise.all(alerts.map(async (alert) => {
    const identifier = identifierByUser.get(alert.receiver_id);
    if (!identifier) { skipped++; return; }

    const taskTitle = String(alert.payload.task_title || "A task");
    const goalTitle = String(alert.payload.goal_title || "your goal");
    const { title, body } = buildNotificationText(alert.window, taskTitle, goalTitle);
    const url = toAppUrl(alert.url);

    try {
      const res = await fetch(TINYNOTIE_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          payload: {
            title,
            body,
            // tag deduplicates on the device: same task+window won't stack
            tag: `task-deadline:${alert.payload.task_id}:${alert.window}`,
            data: { type: "task_deadline", goal_id: alert.goal_id, url, ...alert.payload },
          },
          name: "Orbit",
          appId: 2,
        }),
      });

      if (!res.ok) {
        failed++;
        console.error("deadline-alerts: push failed", { status: res.status, receiver_id: alert.receiver_id });
      } else {
        sent++;
      }
    } catch (err) {
      failed++;
      console.error("deadline-alerts: push error", { receiver_id: alert.receiver_id, err });
    }
  }));

  return { attempted: alerts.length, sent, skipped, failed };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();

  // Fetch tasks that fall within any of our windows:
  // oldest window starts 60 min in the past (overdue band), newest ends 24h in the future
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);  // now - 1h
  const windowEnd   = new Date(now.getTime() + 24 * 60 * 60 * 1000); // now + 24h

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, end_date, goal_id, user_id")
    .eq("completed", false)
    .gte("end_date", windowStart.toISOString())
    .lte("end_date", windowEnd.toISOString());

  if (tasksError) {
    console.error("deadline-alerts: tasks query failed", tasksError);
    return new Response(JSON.stringify({ error: tasksError.message }), { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, alerted: 0, message: "No tasks in alert windows" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const goalIds = [...new Set(tasks.map((t: any) => t.goal_id).filter(Boolean))];

  const [membersRes, goalsRes] = await Promise.all([
    supabase.from("goal_members").select("goal_id, user_id").in("goal_id", goalIds),
    supabase.from("goals").select("id, title, user_id").in("id", goalIds),
  ]);

  const goalMembersMap: Record<string, string[]> = {};
  for (const m of membersRes.data ?? []) {
    if (!goalMembersMap[m.goal_id]) goalMembersMap[m.goal_id] = [];
    goalMembersMap[m.goal_id].push(m.user_id);
  }

  const goalTitleMap: Record<string, string> = {};
  const goalOwnerMap: Record<string, string> = {};
  for (const g of goalsRes.data ?? []) {
    goalTitleMap[g.id] = g.title;
    if (g.user_id) goalOwnerMap[g.id] = g.user_id;
  }

  // Build alerts — each task falls into exactly one non-overlapping band
  const alerts: AlertItem[] = [];

  for (const task of tasks) {
    const minutesFromNow = (new Date(task.end_date).getTime() - now.getTime()) / 60000;
    const window = WINDOWS.find(
      (w) => minutesFromNow >= w.minMinutes && minutesFromNow < w.maxMinutes,
    );
    if (!window) continue;

    const taskTitle = task.title || task.description || "Untitled task";
    const goalTitle = goalTitleMap[task.goal_id] ?? "your goal";

    const receivers = [...new Set([
      ...(goalMembersMap[task.goal_id] ?? []),
      goalOwnerMap[task.goal_id],
      task.user_id,
    ].filter(Boolean))] as string[];

    for (const userId of receivers) {
      alerts.push({
        goal_id: task.goal_id,
        receiver_id: userId,
        window: window.label,
        payload: {
          task_id: task.id,
          task_title: taskTitle,
          goal_title: goalTitle,
          window: window.label,
          end_date: task.end_date,
        },
        url: `/goal/${task.goal_id}?task=${task.id}`,
      });
    }
  }

  if (alerts.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, alerted: 0, message: "No tasks matched alert windows" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Send push notifications only — no DB inserts
  const push = await sendPushNotifications(supabase, alerts);

  console.log(`deadline-alerts: ${alerts.length} alerts processed`, { push });
  return new Response(
    JSON.stringify({ ok: true, alerted: alerts.length, push }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
