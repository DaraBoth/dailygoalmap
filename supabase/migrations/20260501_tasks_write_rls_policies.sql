-- ============================================================
-- Add missing INSERT / UPDATE / DELETE RLS policies for tasks
-- Without these policies all writes are silently rejected by
-- Supabase because only a SELECT policy exists on the table.
-- ============================================================

-- Enable RLS on the tasks table (was never explicitly enabled,
-- which means ALL policies above were being silently ignored
-- and every user could read/write all rows).
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Helper: returns true if the current user has access to the goal
-- (goal owner OR goal member)
-- Used in all policies below.

-- INSERT: any goal owner or member can insert tasks
DROP POLICY IF EXISTS "Users can insert tasks into accessible goals" ON tasks;
CREATE POLICY "Users can insert tasks into accessible goals"
ON tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_members.goal_id = tasks.goal_id
      AND goal_members.user_id = auth.uid()
  )
);

-- UPDATE: any goal owner or member can update any task in the goal
DROP POLICY IF EXISTS "Users can update tasks in accessible goals" ON tasks;
CREATE POLICY "Users can update tasks in accessible goals"
ON tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_members.goal_id = tasks.goal_id
      AND goal_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_members.goal_id = tasks.goal_id
      AND goal_members.user_id = auth.uid()
  )
);

-- DELETE: any goal owner or member can delete tasks in the goal
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks"
ON tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_members.goal_id = tasks.goal_id
      AND goal_members.user_id = auth.uid()
  )
);
