import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

const APP_ORIGIN = "https://dailygoalmap.vercel.app";
const TINYNOTIE_PUSH_URL = "https://tinynotie-api.vercel.app/openai/push";

// Alert windows: notify when task is within X minutes of end_date
const WINDOWS = [
  { label: "1h",  minutes: 60   },
  { label: "3h",  minutes: 180  },
  { label: "24h", minutes: 1440 },
] as const;

function formatWindowLabel(label: string | undefined): string {
  if (label === "1h") return "1 hour";
  if (label === "3h") return "3 hours";
  if (label === "24h") return "24 hours";
  return label || "24 hours";
}

function toAppUrl(path: string | null | undefined): string {
  if (!path) return `${APP_ORIGIN}/dashboard`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${APP_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendDeadlinePushNotifications(
  supabase: any,
  inserts: Array<{
    goal_id: string;
    receiver_id: string;
    payload: Record<string, any>;
    url: string;
  }>,
): Promise<{ attempted: number; sent: number; skipped: number; failed: number }> {
  const receiverIds = [...new Set(inserts.map((item) => item.receiver_id).filter(Boolean))];
  if (receiverIds.length === 0) {
    return { attempted: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, identifier")
    .in("user_id", receiverIds);

  if (error) {
    console.error("deadline-alerts: push subscription query failed", error);
    return { attempted: 0, sent: 0, skipped: receiverIds.length, failed: 0 };
  }

  const identifierByUser = new Map<string, string>();
  for (const subscription of subscriptions ?? []) {
    if (subscription.user_id && subscription.identifier) {
      identifierByUser.set(subscription.user_id, subscription.identifier);
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const attempts = inserts.map(async (item) => {
    const identifier = identifierByUser.get(item.receiver_id);
    if (!identifier) {
      skipped += 1;
      return;
    }

    const taskTitle = item.payload.task_title || "A task";
    const goalTitle = item.payload.goal_title || "your goal";
    const windowLabel = formatWindowLabel(item.payload.window);
    const url = toAppUrl(item.url);

    try {
      const response = await fetch(TINYNOTIE_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          payload: {
            title: "Task deadline approaching",
            body: `"${taskTitle}" is due within ${windowLabel} in "${goalTitle}".`,
            tag: `task-deadline:${item.payload.task_id}:${item.payload.window}`,
            data: {
              type: "task_deadline",
              goal_id: item.goal_id,
              task_id: item.payload.task_id,
              url,
              timestamp: item.payload.end_date || new Date().toISOString(),
              ...item.payload,
            },
          },
          name: "Orbit",
          appId: 2,
        }),
      });

      if (!response.ok) {
        failed += 1;
        console.error("deadline-alerts: push send failed", {
          receiver_id: item.receiver_id,
          status: response.status,
          statusText: response.statusText,
        });
        return;
      }

      sent += 1;
    } catch (pushError) {
      failed += 1;
      console.error("deadline-alerts: push send error", {
        receiver_id: item.receiver_id,
        error: pushError,
      });
    }
  });

  await Promise.all(attempts);

  return {
    attempted: inserts.length,
    sent,
    skipped,
    failed,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Must be triggered by the cron job or an internal call
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1. Fetch all incomplete tasks ending within the next 24h
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, end_date, goal_id, user_id")
    .eq("completed", false)
    .gte("end_date", now.toISOString())
    .lte("end_date", windowEnd.toISOString());

  if (tasksError) {
    console.error("deadline-alerts: tasks query failed", tasksError);
    return new Response(JSON.stringify({ error: tasksError.message }), { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, alerted: 0, message: "No upcoming deadlines" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const goalIds = [...new Set(tasks.map((t: any) => t.goal_id).filter(Boolean))];

  // 2. Fetch goal members and goal titles
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

  // 3. Fetch already-sent deadline alerts for these tasks (last 25h covers all windows)
  const { data: existingAlerts, error: existingAlertsError } = await supabase
    .from("notifications")
    .select("receiver_id, payload")
    .eq("type", "task_deadline")
    .gte("created_at", new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString());

  if (existingAlertsError) {
    console.error("deadline-alerts: existing alerts query failed", existingAlertsError);
    return new Response(JSON.stringify({ error: existingAlertsError.message }), { status: 500 });
  }

  const alreadySent = new Set<string>();
  for (const n of existingAlerts ?? []) {
    const p = n.payload as any;
    if (p?.task_id && p?.window) {
      alreadySent.add(`${n.receiver_id}:${p.task_id}:${p.window}`);
    }
  }

  // 4. Build notification inserts
  const inserts: any[] = [];

  for (const task of tasks) {
    const minutesUntilEnd = (new Date(task.end_date).getTime() - now.getTime()) / 60000;
    const taskTitle = task.title || task.description || "Untitled task";
    const goalTitle = goalTitleMap[task.goal_id] ?? "your goal";
    const receivers = [...new Set([
      ...(goalMembersMap[task.goal_id] ?? []),
      goalOwnerMap[task.goal_id],
      task.user_id,
    ].filter(Boolean))];
    const alertWindow = WINDOWS.find((w) => minutesUntilEnd <= w.minutes);

    if (!alertWindow) continue;

    for (const userId of receivers) {
      const dedupeKey = `${userId}:${task.id}:${alertWindow.label}`;
      if (alreadySent.has(dedupeKey)) continue; // already notified

      // Mark sent inside this run so duplicate membership rows cannot fan out.
      alreadySent.add(dedupeKey);

      inserts.push({
        type: "task_deadline",
        goal_id: task.goal_id,
        sender_id: task.user_id ?? goalOwnerMap[task.goal_id] ?? userId,
        receiver_id: userId,
        payload: {
          goal_id: task.goal_id,
          task_id: task.id,
          task_title: taskTitle,
          goal_title: goalTitle,
          window: alertWindow.label,
          window_minutes: alertWindow.minutes,
          end_date: task.end_date,
        },
        url: `/goal/${task.goal_id}?task=${task.id}`,
      });
    }
  }

  if (inserts.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, alerted: 0, message: "All alerts already sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error: insertError } = await supabase.from("notifications").insert(inserts);
  if (insertError) {
    console.error("deadline-alerts: insert failed", insertError);
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
  }

  const push = await sendDeadlinePushNotifications(supabase, inserts);

  console.log(`deadline-alerts: inserted ${inserts.length} notifications`, { push });
  return new Response(
    JSON.stringify({ ok: true, alerted: inserts.length, push }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
