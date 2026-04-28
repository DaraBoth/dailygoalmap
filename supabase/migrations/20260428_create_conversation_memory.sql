-- Create conversation_memory table for AI chat session storage
DROP TABLE IF EXISTS conversation_memory;

CREATE TABLE conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('chat_session', 'ai_file', 'task_mapping', 'context', 'preference')),
  memory_key TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, memory_key)
);

CREATE INDEX idx_cm_session ON conversation_memory(session_id);
CREATE INDEX idx_cm_user ON conversation_memory(user_id);
CREATE INDEX idx_cm_goal ON conversation_memory(goal_id);
CREATE INDEX idx_cm_type ON conversation_memory(memory_type);

ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversation memory"
  ON conversation_memory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory"
  ON conversation_memory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory"
  ON conversation_memory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory"
  ON conversation_memory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON conversation_memory TO service_role;
