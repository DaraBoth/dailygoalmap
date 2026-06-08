import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

// Alert windows: notify when task is within X minutes of end_date
const WINDOWS = [
  { label: "1h",  minutes: 60   },
  { label: "3h",  minutes: 180  },
  { label: "24h", minutes: 1440 },
];

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
    supabase.from("goals").select("id, title").in("id", goalIds),
  ]);

  const goalMembersMap: Record<string, string[]> = {};
  for (const m of membersRes.data ?? []) {
    if (!goalMembersMap[m.goal_id]) goalMembersMap[m.goal_id] = [];
    goalMembersMap[m.goal_id].push(m.user_id);
  }

  const goalTitleMap: Record<string, string> = {};
  for (const g of goalsRes.data ?? []) {
    goalTitleMap[g.id] = g.title;
  }

  // 3. Fetch already-sent deadline alerts for these tasks (last 25h covers all windows)
  const taskIds = tasks.map((t: any) => t.id);
  const { data: existingAlerts } = await supabase
    .from("notifications")
    .select("payload")
    .eq("type", "task_deadline")
    .gte("created_at", new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString());

  const alreadySent = new Set<string>();
  for (const n of existingAlerts ?? []) {
    const p = n.payload as any;
    if (p?.task_id && p?.window) {
      alreadySent.add(`${p.task_id}:${p.window}`);
    }
  }

  // 4. Build notification inserts
  const inserts: any[] = [];

  for (const task of tasks) {
    const minutesUntilEnd = (new Date(task.end_date).getTime() - now.getTime()) / 60000;
    const taskTitle = task.title || task.description || "Untitled task";
    const goalTitle = goalTitleMap[task.goal_id] ?? "your goal";
    const receivers = goalMembersMap[task.goal_id] ?? [];

    for (const w of WINDOWS) {
      if (minutesUntilEnd > w.minutes) continue; // not within this window yet

      const dedupeKey = `${task.id}:${w.label}`;
      if (alreadySent.has(dedupeKey)) continue; // already notified

      // Mark sent for subsequent windows in this same run
      alreadySent.add(dedupeKey);

      for (const userId of receivers) {
        inserts.push({
          type: "task_deadline",
          goal_id: task.goal_id,
          sender_id: task.user_id ?? userId,
          receiver_id: userId,
          payload: {
            task_id: task.id,
            task_title: taskTitle,
            goal_title: goalTitle,
            window: w.label,
            end_date: task.end_date,
          },
          url: `/goal/${task.goal_id}`,
        });
      }
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

  console.log(`deadline-alerts: inserted ${inserts.length} notifications`);
  return new Response(
    JSON.stringify({ ok: true, alerted: inserts.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
