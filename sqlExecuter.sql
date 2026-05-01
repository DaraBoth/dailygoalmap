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
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

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
