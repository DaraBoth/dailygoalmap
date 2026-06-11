import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

const APP_ORIGIN = "https://dailygoalmap.vercel.app";
const TINYNOTIE_PUSH_URL = "https://tinynotie-api.vercel.app/openai/push";

// ── Timed-task alert types (extensible — add more rows here to add new alert milestones) ──
// minutesFromNow: negative = past (overdue), positive = future (upcoming)
const TIMED_ALERT_TYPES = [
  {
    type: "overdue-nearby",
    minMinutes: -240,               // up to 4 h overdue
    maxMinutes: 0,
    titleFn: (goal: string) => `[${goal}] Overdue`,
    bodyFn:  (task: string)  => `"${task}" just passed its deadline`,
  },
  {
    type: "upcoming-soon",
    minMinutes: 0,
    maxMinutes: 24 * 60,            // due within the next 24 h
    titleFn: (goal: string) => `[${goal}] Due soon`,
    bodyFn:  (task: string)  => `"${task}" is due within 24 hours`,
  },
  {
    type: "upcoming-1month",
    minMinutes: 25 * 24 * 60,       // 25–35 days ahead
    maxMinutes: 35 * 24 * 60,
    titleFn: (goal: string) => `[${goal}] Coming up`,
    bodyFn:  (task: string)  => `"${task}" is due in about 1 month`,
  },
  {
    type: "overdue-3months",
    minMinutes: -(95 * 24 * 60),    // 85–95 days overdue
    maxMinutes: -(85 * 24 * 60),
    titleFn: (goal: string) => `[${goal}] Still incomplete`,
    bodyFn:  (task: string)  => `"${task}" is 3 months overdue — don't forget!`,
  },
] as const;

// Anytime morning summary: UTC hours 1–3 (≈ 8–10 am UTC+7 / Cambodia)
const MORNING_START_UTC = 1;
const MORNING_END_UTC   = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toAppUrl(path: string | null | undefined): string {
  if (!path) return `${APP_ORIGIN}/dashboard`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${APP_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function makeDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Unique dedup key stored in deadline_alert_log.alert_key
function taskAlertKey(taskId: string, userId: string, alertType: string): string {
  return `task:${taskId}:user:${userId}:${alertType}`;
}
function dailyAlertKey(userId: string, alertType: string, dateStr: string): string {
  return `daily:user:${userId}:${alertType}:${dateStr}`;
}

interface PushCandidate {
  alert_key:  string;
  task_id:    string | null;
  user_id:    string;
  alert_type: string;
  receiver_id: string;
  goal_id:    string | null;
  pushTitle:  string;
  pushBody:   string;
  url:        string;
  payload:    Record<string, unknown>;
}

async function sendOnePush(identifier: string, c: PushCandidate): Promise<boolean> {
  try {
    const res = await fetch(TINYNOTIE_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        payload: {
          title: c.pushTitle,
          body:  c.pushBody,
          tag:   `orbit-alert:${c.alert_key}`,
          data:  { type: "task_deadline", goal_id: c.goal_id, url: toAppUrl(c.url), ...c.payload },
        },
        name:  "Orbit",
        appId: 2,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!req.headers.get("Authorization")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now      = new Date();
  const dateStr  = makeDateStr(now);
  const isMorning = now.getUTCHours() >= MORNING_START_UTC && now.getUTCHours() < MORNING_END_UTC;

  // Wide fetch window: 95 days past → 35 days future (covers all 4 alert types)
  const windowStart = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, end_date, goal_id, user_id, is_anytime")
    .eq("completed", false)   // completed tasks → no alerts, no log rows
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

  // Fetch supporting data
  const goalIds    = [...new Set(tasks.map((t: any) => t.goal_id).filter(Boolean))];
  const creatorIds = [...new Set(tasks.map((t: any) => t.user_id).filter(Boolean))];

  const [membersRes, goalsRes, profilesRes] = await Promise.all([
    supabase.from("goal_members").select("goal_id, user_id").in("goal_id", goalIds),
    supabase.from("goals").select("id, title, user_id").in("id", goalIds),
    supabase.from("user_profiles").select("id, display_name").in("id", creatorIds),
  ]);

  const goalMembersMap: Record<string, string[]> = {};
  for (const m of membersRes.data ?? []) {
    if (!goalMembersMap[m.goal_id]) goalMembersMap[m.goal_id] = [];
    goalMembersMap[m.goal_id].push(m.user_id);
  }

  const goalTitleMap: Record<string, string> = {};
  const goalOwnerMap: Record<string, string> = {};
  for (const g of goalsRes.data ?? []) {
    goalTitleMap[g.id] = g.title ?? "Goal";
    if (g.user_id) goalOwnerMap[g.id] = g.user_id;
  }

  const userNameMap: Record<string, string> = {};
  for (const p of profilesRes.data ?? []) {
    if (p.id && p.display_name) userNameMap[p.id] = p.display_name;
  }

  function receiversOf(task: any): string[] {
    return [...new Set([
      ...(goalMembersMap[task.goal_id] ?? []),
      goalOwnerMap[task.goal_id],
      task.user_id,
    ].filter(Boolean))] as string[];
  }

  // ── Build candidates ─────────────────────────────────────────────────────────

  const candidates: PushCandidate[] = [];

  // anytime morning accumulator: receiverId → { goalTitle, tasks[] }[]
  const anytimeByReceiver: Record<string, { goalTitle: string; goalId: string; tasks: any[] }[]> = {};

  for (const task of tasks) {
    const taskTitle       = task.title || task.description || "Untitled task";
    const goalTitle       = goalTitleMap[task.goal_id] ?? "your goal";
    const minutesFromNow  = (new Date(task.end_date).getTime() - now.getTime()) / 60000;
    const isAnytime       = task.is_anytime === true;
    const receivers       = receiversOf(task);

    if (isAnytime) {
      // Collect for morning summary — only during morning window
      // Include tasks whose end_date is "today" ± 36h (timezone-agnostic)
      if (!isMorning) continue;
      if (minutesFromNow < -12 * 60 || minutesFromNow > 36 * 60) continue;

      for (const uid of receivers) {
        if (!anytimeByReceiver[uid]) anytimeByReceiver[uid] = [];
        let grp = anytimeByReceiver[uid].find(g => g.goalId === task.goal_id);
        if (!grp) {
          grp = { goalTitle, goalId: task.goal_id, tasks: [] };
          anytimeByReceiver[uid].push(grp);
        }
        // Avoid duplicating the same task under the same user/goal
        if (!grp.tasks.find((t: any) => t.id === task.id)) grp.tasks.push(task);
      }
    } else {
      // Timed task: check each alert type
      for (const def of TIMED_ALERT_TYPES) {
        if (minutesFromNow < def.minMinutes || minutesFromNow >= def.maxMinutes) continue;

        for (const uid of receivers) {
          candidates.push({
            alert_key:  taskAlertKey(task.id, uid, def.type),
            task_id:    task.id,
            user_id:    uid,
            alert_type: def.type,
            receiver_id: uid,
            goal_id:    task.goal_id,
            pushTitle:  def.titleFn(goalTitle),
            pushBody:   def.bodyFn(taskTitle),
            url:        `/goal/${task.goal_id}?task=${task.id}`,
            payload: {
              task_id:    task.id,
              task_title: taskTitle,
              goal_title: goalTitle,
              alert_type: def.type,
              end_date:   task.end_date,
            },
          });
        }
      }
    }
  }

  // ── Build anytime morning summary candidates ─────────────────────────────────

  for (const [uid, goalGroups] of Object.entries(anytimeByReceiver)) {
    const totalCount = goalGroups.reduce((s, g) => s + g.tasks.length, 0);
    if (totalCount === 0) continue;

    // Summary body: up to 2 goals, up to 3 tasks each
    const summaryParts = goalGroups.slice(0, 2).map(g => {
      const names = g.tasks.slice(0, 3).map((t: any) => t.title || t.description || "Untitled");
      const more  = g.tasks.length > 3 ? ` +${g.tasks.length - 3} more` : "";
      return `${g.goalTitle}: ${names.join(", ")}${more}`;
    });
    if (goalGroups.length > 2) summaryParts.push(`...and ${goalGroups.length - 2} more goals`);

    candidates.push({
      alert_key:  dailyAlertKey(uid, "anytime-morning", dateStr),
      task_id:    null,
      user_id:    uid,
      alert_type: "anytime-morning",
      receiver_id: uid,
      goal_id:    goalGroups[0]?.goalId ?? null,
      pushTitle:  `Good morning! You have ${totalCount} task${totalCount !== 1 ? "s" : ""} today`,
      pushBody:   summaryParts.join(" • "),
      url:        "/dashboard",
      payload: {
        alert_type:  "anytime-morning",
        task_count:  totalCount,
        date:        dateStr,
      },
    });
  }

  if (candidates.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, alerted: 0, message: "No tasks matched alert windows" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Deduplicate against already-sent log ──────────────────────────────────────

  const allKeys = [...new Set(candidates.map(c => c.alert_key))];
  const { data: existingRows } = await supabase
    .from("deadline_alert_log")
    .select("alert_key")
    .in("alert_key", allKeys);

  const sentKeys = new Set((existingRows ?? []).map((r: any) => r.alert_key));
  const toSend   = candidates.filter(c => !sentKeys.has(c.alert_key));

  if (toSend.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, alerted: 0, message: "All eligible alerts already sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Fetch push subscriptions ──────────────────────────────────────────────────

  const receiverIds = [...new Set(toSend.map(c => c.receiver_id))];
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, identifier")
    .in("user_id", receiverIds);

  const identifierByUser = new Map<string, string>();
  for (const sub of subscriptions ?? []) {
    if (sub.user_id && sub.identifier) identifierByUser.set(sub.user_id, sub.identifier);
  }

  // ── Send and log ──────────────────────────────────────────────────────────────

  let sent = 0, skipped = 0, failed = 0;
  const logRows: any[] = [];

  await Promise.all(toSend.map(async (c) => {
    const identifier = identifierByUser.get(c.receiver_id);
    if (!identifier) { skipped++; return; }

    const ok = await sendOnePush(identifier, c);
    if (ok) {
      sent++;
      logRows.push({
        task_id:    c.task_id,
        user_id:    c.user_id,
        alert_type: c.alert_type,
        alert_key:  c.alert_key,
        metadata:   c.payload,
      });
    } else {
      failed++;
    }
  }));

  // Upsert log rows — ignore conflicts so parallel cron invocations are safe
  if (logRows.length > 0) {
    const { error: logError } = await supabase
      .from("deadline_alert_log")
      .upsert(logRows, { onConflict: "alert_key", ignoreDuplicates: true });

    if (logError) console.error("deadline-alerts: log insert failed", logError);
  }

  const summary = { attempted: toSend.length, sent, skipped, failed };
  console.log("deadline-alerts: done", summary);

  return new Response(
    JSON.stringify({ ok: true, alerted: sent, summary }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
