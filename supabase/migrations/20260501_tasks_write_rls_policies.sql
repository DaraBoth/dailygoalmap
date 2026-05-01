-- ============================================================
-- Add missing INSERT / UPDATE / DELETE RLS policies for tasks
-- Without these policies all writes are silently rejected by
-- Supabase because only a SELECT policy exists on the table.
-- ============================================================

-- Enable RLS on the tasks table (was never explicitly enabled,
-- which means ALL policies above were being silently ignored
-- and every user could read/write all rows).
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Fix the SELECT policy to include goal owners.
-- The original policy only covered task creators, goal members, and public goals
-- but NOT goal owners — so after enabling RLS, owners couldn't see member-created tasks.
DROP POLICY IF EXISTS "Users can view tasks from accessible goals" ON tasks;
CREATE POLICY "Users can view tasks from accessible goals"
ON tasks
FOR SELECT
USING (
  -- Task creator
  auth.uid() = user_id
  OR
  -- Goal owner can see all tasks in their goals
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
  )
  OR
  -- Goal member can see all tasks in shared goals
  EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_members.goal_id = tasks.goal_id
      AND goal_members.user_id = auth.uid()
  )
  OR
  -- Anyone can see tasks from public goals
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
      AND goals.is_public = true
  )
);

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
