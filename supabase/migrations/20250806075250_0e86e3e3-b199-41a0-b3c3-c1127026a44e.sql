-- Fix RLS policies for tasks table to ensure shared goal visibility

-- First, drop all existing SELECT policies on tasks table to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks from their own and shared goals" ON tasks;  
DROP POLICY IF EXISTS "Anyone can view tasks of public goals" ON tasks;

-- Create a comprehensive SELECT policy that covers all cases
CREATE POLICY "Users can view tasks from accessible goals" 
ON tasks 
FOR SELECT 
USING (
  -- User can see their own tasks
  (auth.uid() = user_id) 
  OR 
  -- User can see tasks from goals they are members of
  (EXISTS (
    SELECT 1 
    FROM goal_members 
    WHERE goal_members.goal_id = tasks.goal_id 
    AND goal_members.user_id = auth.uid()
  ))
  OR
  -- Anyone can see tasks from public goals
  (EXISTS (
    SELECT 1 
    FROM goals 
    WHERE goals.id = tasks.goal_id 
    AND goals.is_public = true
  ))
);

-- Also ensure the tasks table has REPLICA IDENTITY FULL for proper realtime updates
ALTER TABLE tasks REPLICA IDENTITY FULL;