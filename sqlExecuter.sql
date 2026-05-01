-- ============================================
-- FIX conversation_memory TABLE SCHEMA MISMATCH
-- The table was created with 'content TEXT'+'metadata JSONB' columns
-- but the app code expects 'memory_value JSONB'. Run this first.
-- ============================================

ALTER TABLE conversation_memory ADD COLUMN IF NOT EXISTS memory_value JSONB;

UPDATE conversation_memory
SET memory_value = to_jsonb(content)
WHERE memory_value IS NULL AND content IS NOT NULL AND content != '';

UPDATE conversation_memory SET memory_value = 'null'::jsonb WHERE memory_value IS NULL;

ALTER TABLE conversation_memory ALTER COLUMN memory_value SET DEFAULT 'null'::jsonb;
ALTER TABLE conversation_memory ALTER COLUMN memory_value SET NOT NULL;

ALTER TABLE conversation_memory DROP CONSTRAINT IF EXISTS conversation_memory_memory_type_check;
ALTER TABLE conversation_memory ADD CONSTRAINT conversation_memory_memory_type_check
CHECK (memory_type IN (
  'chat_session', 'chat_history', 'task_memory',
  'ai_file', 'task_mapping', 'context', 'preference'
));

-- ============================================

-- INSERT: any authenticated user who owns the goal or is a member can create tasks
DROP POLICY IF EXISTS "Users can insert tasks into accessible goals" ON tasks;
CREATE POLICY "Users can insert tasks into accessible goals"
ON tasks
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM goal_members
      WHERE goal_members.goal_id = tasks.goal_id
      AND goal_members.user_id = auth.uid()
    )
  )
);

-- UPDATE: task owner OR any goal member can update (needed for completion toggle by members)
DROP POLICY IF EXISTS "Users can update tasks in accessible goals" ON tasks;
CREATE POLICY "Users can update tasks in accessible goals"
ON tasks
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_members.goal_id = tasks.goal_id
    AND goal_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
    AND goals.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_members.goal_id = tasks.goal_id
    AND goal_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
    AND goals.user_id = auth.uid()
  )
);

-- DELETE: only the task owner or goal owner can delete tasks
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks"
ON tasks
FOR DELETE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = tasks.goal_id
    AND goals.user_id = auth.uid()
  )
);

-- ============================================
-- UPDATE NOTIFICATIONS TABLE TYPE CONSTRAINT
-- Add task-related notification types to support real-time notifications
-- ============================================

-- Drop the old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with additional notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'invitation',
  'removal', 
  'member_left',
  'member_joined',
  'task_created',
  'task_updated',
  'task_deleted'
));

-- ============================================
-- ENABLE REAL-TIME FOR NOTIFICATIONS TABLE
-- Required for real-time toast notifications across all pages
-- ============================================

-- Set replica identity to FULL so Supabase can track all changes
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Add notifications table to the supabase_realtime publication
-- This enables real-time subscriptions in the client
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- ============================================
-- CONVERSATION MEMORY TABLE
-- Stores task ID mappings and conversation context for AI agents
-- ============================================

-- Create conversation_memory table
CREATE TABLE IF NOT EXISTS conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('task_mapping', 'context', 'preference')),
  memory_key TEXT NOT NULL, -- e.g., 'task_1', 'task_2', 'last_query_date'
  memory_value JSONB NOT NULL, -- Stores task details: {id: uuid, title: string, position: number}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_memory_session 
ON conversation_memory(session_id, user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_goal 
ON conversation_memory(user_id, goal_id);

CREATE INDEX IF NOT EXISTS idx_conversation_memory_type 
ON conversation_memory(memory_type);

CREATE INDEX IF NOT EXISTS idx_conversation_memory_expires 
ON conversation_memory(expires_at);

-- Unique constraint required for upsert onConflict: 'session_id,memory_key'
ALTER TABLE conversation_memory
DROP CONSTRAINT IF EXISTS conversation_memory_session_id_memory_key_key;

ALTER TABLE conversation_memory
ADD CONSTRAINT conversation_memory_session_id_memory_key_key
UNIQUE (session_id, memory_key);

-- RLS Policies
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation memory"
ON conversation_memory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation memory"
ON conversation_memory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation memory"
ON conversation_memory FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation memory"
ON conversation_memory FOR DELETE
USING (auth.uid() = user_id);

-- Auto-cleanup expired memories (run this periodically via cron or edge function)
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_memory()
RETURNS void AS $$
BEGIN
  DELETE FROM conversation_memory
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant service role access for edge functions
GRANT ALL ON conversation_memory TO service_role;

-- Comments
COMMENT ON TABLE conversation_memory IS 'Stores conversation context and task mappings for AI agents';
COMMENT ON COLUMN conversation_memory.memory_type IS 'Type of memory: task_mapping (task ID lookup), context (conversation state), preference (user preferences)';
COMMENT ON COLUMN conversation_memory.memory_key IS 'Lookup key like task_1, task_2, or context keys';
COMMENT ON COLUMN conversation_memory.memory_value IS 'JSON data: for task_mapping stores {id: uuid, title: string, position: number, start_date: string}';
COMMENT ON COLUMN conversation_memory.expires_at IS 'Auto-cleanup timestamp, default 24 hours';

-- Verify the table
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_memory'
ORDER BY ordinal_position;

-- ============================================
-- TASK TIME MIGRATION: ANYTIME + DURATION
-- Adds support for all-day/anytime tasks and explicit duration in minutes
-- ============================================

-- 1) Add new columns (idempotent)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_anytime boolean NOT NULL DEFAULT false;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- 2) Backfill anytime for tasks that have no explicit time
UPDATE tasks
SET is_anytime = true
WHERE is_anytime = false
  AND daily_start_time IS NULL
  AND daily_end_time IS NULL;

-- 3) Backfill duration for timed tasks
UPDATE tasks
SET duration_minutes = GREATEST(
  0,
  EXTRACT(EPOCH FROM (daily_end_time - daily_start_time)) / 60
)::integer
WHERE duration_minutes IS NULL
  AND daily_start_time IS NOT NULL
  AND daily_end_time IS NOT NULL;

-- 4) Keep data valid
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_duration_minutes_non_negative;

ALTER TABLE tasks
ADD CONSTRAINT tasks_duration_minutes_non_negative
CHECK (duration_minutes IS NULL OR duration_minutes >= 0);

-- 5) Helpful index for newest-first task lists
CREATE INDEX IF NOT EXISTS idx_tasks_goal_created_at
ON tasks(goal_id, created_at DESC);

-- ============================================
-- GOALS: NO DURATION FLAG
-- Prevents no-duration goals from being treated as due-today
-- ============================================

-- 1) Add column (idempotent)
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS no_duration boolean NOT NULL DEFAULT false;

-- 2) Backfill from metadata.no_duration for existing rows (safe)
UPDATE goals
SET no_duration = true
WHERE COALESCE(no_duration, false) = false
  AND COALESCE((metadata ->> 'no_duration')::boolean, false) = true;

-- 3) Optional index for filtering no-duration goals quickly
CREATE INDEX IF NOT EXISTS idx_goals_no_duration
ON goals(no_duration);
