import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

const APP_ORIGIN = "https://dailygoalmap.vercel.app";
const TINYNOTIE_PUSH_URL = "https://tinynotie-api.vercel.app/openai/push";

// ── Overdue bands (timed tasks only, is_anytime = false/null) ──────────────────
// minutesFromNow is NEGATIVE for past tasks (end_date already passed)
// Each band fires exactly once per task per hourly cron run.
const OVERDUE_BANDS = [
  {
    label: "overdue-1h",
    minMinutes: -60,    // 0–60 min overdue
    maxMinutes: 0,
    title: "⚠️ Task just missed",
    bodyFn: (task: string, goal: string) =>
      `"${task}" in "${goal}" just passed its deadline and is still not completed.`,
  },
  {
    label: "overdue-3h",
    minMinutes: -180,   // 1–3h overdue
    maxMinutes: -60,
    title: "⚠️ Task still overdue",
    bodyFn: (task: string, goal: string) =>
      `"${task}" in "${goal}" has been overdue for over an hour. Don't forget to complete it!`,
  },
  {
    label: "overdue-24h",
    minMinutes: -1440,  // 3–24h overdue
    maxMinutes: -180,
    title: "⚠️ Task overdue reminder",
    bodyFn: (task: string, goal: string) =>
      `"${task}" in "${goal}" is still incomplete and has been overdue for several hours.`,
  },
] as const;

// ── Anytime task reminder window ──────────────────────────────────────────────
// Fire when the task's date is roughly "tomorrow" (12–24h from now).
// Only one alert per anytime task, no "due in X hours" language.
const ANYTIME_REMINDER = {
  label: "anytime-tomorrow",
  minMinutes: 720,    // 12h from now
  maxMinutes: 1440,   // 24h from now
};

type WindowLabel = "overdue-1h" | "overdue-3h" | "overdue-24h" | "anytime-tomorrow";

function toAppUrl(path: string | null | undefined): string {
  if (!path) return `${APP_ORIGIN}/dashboard`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${APP_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

interface AlertItem {
  receiver_id: string;
  goal_id: string;
  window: WindowLabel;
  pushTitle: string;
  pushBody: string;
  payload: Record<string, unknown>;
  url: string;
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
    console.error("deadline-alerts: push subscriptions failed", error);
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

    const url = toAppUrl(alert.url);
    try {
      const res = await fetch(TINYNOTIE_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          payload: {
            title: alert.pushTitle,
            body: alert.pushBody,
            // tag deduplicates on device: same task+window won't stack
            tag: `task-alert:${alert.payload.task_id}:${alert.window}`,
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

  // Fetch the full window we care about:
  //   - anytime tasks: up to 24h in the future
  //   - overdue timed tasks: up to 24h in the past
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, end_date, goal_id, user_id, is_anytime")
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

  const alerts: AlertItem[] = [];

  for (const task of tasks) {
    const minutesFromNow = (new Date(task.end_date).getTime() - now.getTime()) / 60000;
    const taskTitle  = task.title || task.description || "Untitled task";
    const goalTitle  = goalTitleMap[task.goal_id] ?? "your goal";
    const isAnytime  = task.is_anytime === true;

    let window: WindowLabel | null = null;
    let pushTitle = "";
    let pushBody  = "";

    if (isAnytime) {
      // ── Anytime task: only remind when it's "tomorrow" ──────────────────────
      if (minutesFromNow >= ANYTIME_REMINDER.minMinutes && minutesFromNow < ANYTIME_REMINDER.maxMinutes) {
        window    = "anytime-tomorrow";
        pushTitle = "📅 Upcoming task tomorrow";
        pushBody  = `Reminder: "${taskTitle}" is scheduled for tomorrow in "${goalTitle}". Don't forget!`;
      }
    } else {
      // ── Timed task: only alert when already overdue ──────────────────────────
      const band = OVERDUE_BANDS.find(
        (b) => minutesFromNow >= b.minMinutes && minutesFromNow < b.maxMinutes,
      );
      if (band) {
        window    = band.label;
        pushTitle = band.title;
        pushBody  = band.bodyFn(taskTitle, goalTitle);
      }
    }

    if (!window) continue;

    const receivers = [...new Set([
      ...(goalMembersMap[task.goal_id] ?? []),
      goalOwnerMap[task.goal_id],
      task.user_id,
    ].filter(Boolean))] as string[];

    for (const userId of receivers) {
      alerts.push({
        receiver_id: userId,
        goal_id: task.goal_id,
        window,
        pushTitle,
        pushBody,
        payload: {
          task_id:    task.id,
          task_title: taskTitle,
          goal_title: goalTitle,
          window,
          end_date:   task.end_date,
          is_anytime: isAnytime,
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

  const push = await sendPushNotifications(supabase, alerts);

  console.log(`deadline-alerts: ${alerts.length} alerts processed`, { push });
  return new Response(
    JSON.stringify({ ok: true, alerted: alerts.length, push }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
