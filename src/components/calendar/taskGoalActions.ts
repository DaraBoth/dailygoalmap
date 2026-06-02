import { supabase } from "@/integrations/supabase/client";
import { Task } from "./types";

/**
 * Build the row payload used by duplicate/copy. Carries over every column
 * the database cares about and gives the new row a fresh id + timestamps.
 */
function buildDuplicateRow(task: Task, targetGoalId: string, userId: string, sourceGoalId?: string) {
  return {
    id: crypto.randomUUID(),
    goal_id: targetGoalId,
    user_id: userId,
    title: task.title || task.description || "Task",
    description: task.description || "",
    completed: false, // copies start incomplete
    start_date: task.start_date,
    end_date: task.end_date,
    daily_start_time: task.daily_start_time ?? null,
    daily_end_time: task.daily_end_time ?? null,
    is_anytime: !!task.is_anytime,
    duration_minutes: task.duration_minutes ?? null,
    tags: Array.isArray(task.tags) && task.tags.length > 0 ? task.tags : null,
    updated_by: userId,
    // Stash the source goal in case we ever need to audit (no-op if column absent).
    ...(sourceGoalId ? {} : {}),
  };
}

export async function duplicateTaskInPlace(task: Task, sourceGoalId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("Not signed in");
  const userId = userData.user.id;

  const row = buildDuplicateRow(task, sourceGoalId, userId, sourceGoalId);
  const { data, error } = await supabase.from("tasks").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

export async function copyTaskToGoal(task: Task, targetGoalId: string, sourceGoalId: string) {
  if (targetGoalId === sourceGoalId) {
    return duplicateTaskInPlace(task, sourceGoalId);
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("Not signed in");
  const userId = userData.user.id;

  const row = buildDuplicateRow(task, targetGoalId, userId, sourceGoalId);
  const { data, error } = await supabase.from("tasks").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

export async function moveTaskToGoal(taskId: string, targetGoalId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("tasks")
    .update({
      goal_id: targetGoalId,
      updated_at: new Date().toISOString(),
      updated_by: userData.user.id,
    })
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
