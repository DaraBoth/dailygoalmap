-- ============================================
-- ADD color COLUMN TO tasks TABLE
-- Run this in the Supabase SQL Editor to support per-task color labeling.
-- ============================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;

COMMENT ON COLUMN tasks.color IS
  'Optional hex color string (e.g. #7c3aed) set by the user to visually label this task on the calendar.';

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

-- ============================================
-- TASK DEADLINE ALERTS — CRON JOB SETUP
-- Run these in the Supabase SQL Editor.
-- Requires: pg_cron and pg_net extensions enabled.
-- pg_net creates the `net` schema used by net.http_post.
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 1: Add 'task_deadline' to the notifications type constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'invitation',
  'removal',
  'member_left',
  'member_joined',
  'task_created',
  'task_updated',
  'task_deleted',
  'task_deadline'
));

-- Step 2: Schedule the deadline-alerts Edge Function to run every hour.
-- Replace YOUR_SERVICE_ROLE_KEY with your actual Supabase service role key.
-- Replace the URL project ref if it differs.
SELECT cron.schedule(
  'deadline-alerts-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url        := 'https://vddurwzfpcdoafgetnqo.supabase.co/functions/v1/deadline-alerts',
    headers    := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body       := jsonb_build_object('time', now()),
    timeout_milliseconds := 10000
  ) AS request_id;
  $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To check recent run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- To remove the job if needed:
-- SELECT cron.unschedule('deadline-alerts-hourly');

-- ============================================
-- CLEAN UP task_deadline NOTIFICATIONS
-- Run this to remove test/old deadline records
-- since deadline alerts no longer use the DB.
-- ============================================
DELETE FROM notifications WHERE type = 'task_deadline';

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
-- PROJECT API KEYS (EXTERNAL OPEN API ACCESS)
-- Per-goal secret keys used by /api/project-tasks endpoints
-- ============================================

CREATE TABLE IF NOT EXISTS project_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'External integration',
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_api_keys_goal_id ON project_api_keys(goal_id);
CREATE INDEX IF NOT EXISTS idx_project_api_keys_user_id ON project_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_project_api_keys_is_active ON project_api_keys(is_active);

ALTER TABLE project_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Goal owners can view project api keys" ON project_api_keys;
CREATE POLICY "Goal owners can view project api keys"
ON project_api_keys FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = project_api_keys.goal_id
      AND goals.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Goal owners can insert project api keys" ON project_api_keys;
CREATE POLICY "Goal owners can insert project api keys"
ON project_api_keys FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = project_api_keys.goal_id
      AND goals.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Goal owners can update project api keys" ON project_api_keys;
CREATE POLICY "Goal owners can update project api keys"
ON project_api_keys FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = project_api_keys.goal_id
      AND goals.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = project_api_keys.goal_id
      AND goals.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Goal owners can delete project api keys" ON project_api_keys;
CREATE POLICY "Goal owners can delete project api keys"
ON project_api_keys FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = project_api_keys.goal_id
      AND goals.user_id = auth.uid()
  )
);

GRANT ALL ON project_api_keys TO service_role;


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

-- ============================================
-- TASK ATTACHMENTS STORAGE BUCKET
-- Used by the rich markdown description editor for image uploads.
-- Each user uploads under their own auth.uid() prefix, e.g.
--   {uid}/1727000000000-ab12cd.png
-- Public-read so the resulting URL can be embedded in markdown.
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
CREATE POLICY "Anyone can view task attachments"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Users can upload their own task attachments" ON storage.objects;
CREATE POLICY "Users can upload their own task attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own task attachments" ON storage.objects;
CREATE POLICY "Users can update their own task attachments"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own task attachments" ON storage.objects;
CREATE POLICY "Users can delete their own task attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

  -- ============================================
  -- GOAL NOTES (per-goal shared markdown notes with restricted visibility)
  -- Authors a note inside a goal; everyone in the goal can see when
  -- visibility='all', or only specifically invited members when
  -- visibility='restricted'. The creator and the goal owner always see.
  -- ============================================

  CREATE TABLE IF NOT EXISTS goal_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title       TEXT NOT NULL DEFAULT 'Untitled note',
    content     TEXT NOT NULL DEFAULT '',
    visibility  TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'restricted')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_goal_notes_goal_id    ON goal_notes(goal_id);
  CREATE INDEX IF NOT EXISTS idx_goal_notes_created_by ON goal_notes(created_by);
  CREATE INDEX IF NOT EXISTS idx_goal_notes_updated_at ON goal_notes(goal_id, updated_at DESC);

  -- Per-note explicit viewer list (only relevant when visibility='restricted').
  -- Composite PK guarantees one row per (note, user).
  CREATE TABLE IF NOT EXISTS goal_note_viewers (
    note_id  UUID NOT NULL REFERENCES goal_notes(id) ON DELETE CASCADE,
    user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (note_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_goal_note_viewers_user_id ON goal_note_viewers(user_id);

  -- Touch updated_at on every UPDATE so client-side "Last edited" stays honest
  -- without callers having to remember to set it explicitly.
  CREATE OR REPLACE FUNCTION touch_goal_notes_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS goal_notes_touch_updated_at ON goal_notes;
  CREATE TRIGGER goal_notes_touch_updated_at
  BEFORE UPDATE ON goal_notes
  FOR EACH ROW EXECUTE FUNCTION touch_goal_notes_updated_at();

  -- ─── RLS ─────────────────────────────────────────────────────────────────────
  ALTER TABLE goal_notes        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE goal_note_viewers ENABLE ROW LEVEL SECURITY;

  -- goal_notes SELECT: viewer must be a goal member AND the note must be either
  -- public-to-goal, authored by them, owned by them (goal owner), or share an
  -- explicit viewer row with them.
  DROP POLICY IF EXISTS "Goal members can view permitted goal notes" ON goal_notes;
  CREATE POLICY "Goal members can view permitted goal notes"
  ON goal_notes FOR SELECT
  USING (
    (
      -- must be in the goal at all
      EXISTS (
        SELECT 1 FROM goal_members
        WHERE goal_members.goal_id = goal_notes.goal_id
          AND goal_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM goals
        WHERE goals.id = goal_notes.goal_id
          AND goals.user_id = auth.uid()
      )
    )
    AND (
      visibility = 'all'
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM goals
        WHERE goals.id = goal_notes.goal_id
          AND goals.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM goal_note_viewers
        WHERE goal_note_viewers.note_id = goal_notes.id
          AND goal_note_viewers.user_id = auth.uid()
      )
    )
  );

  -- INSERT: any goal member can create a note, and they must mark themselves as
  -- the creator (auth.uid() = created_by).
  DROP POLICY IF EXISTS "Goal members can create goal notes" ON goal_notes;
  CREATE POLICY "Goal members can create goal notes"
  ON goal_notes FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (
        SELECT 1 FROM goal_members
        WHERE goal_members.goal_id = goal_notes.goal_id
          AND goal_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM goals
        WHERE goals.id = goal_notes.goal_id
          AND goals.user_id = auth.uid()
      )
    )
  );

  -- UPDATE: only the note's creator or the goal's owner can edit.
  DROP POLICY IF EXISTS "Note creator or goal owner can update goal notes" ON goal_notes;
  CREATE POLICY "Note creator or goal owner can update goal notes"
  ON goal_notes FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_notes.goal_id
        AND goals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_notes.goal_id
        AND goals.user_id = auth.uid()
    )
  );

  -- DELETE: same constraint as UPDATE.
  DROP POLICY IF EXISTS "Note creator or goal owner can delete goal notes" ON goal_notes;
  CREATE POLICY "Note creator or goal owner can delete goal notes"
  ON goal_notes FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_notes.goal_id
        AND goals.user_id = auth.uid()
    )
  );

  -- goal_note_viewers SELECT: anyone who can see the note can see its viewer
  -- list. (The viewer list itself is who's-invited metadata, not the content.)
  DROP POLICY IF EXISTS "Permitted readers can view note viewer rows" ON goal_note_viewers;
  CREATE POLICY "Permitted readers can view note viewer rows"
  ON goal_note_viewers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goal_notes
      WHERE goal_notes.id = goal_note_viewers.note_id
      -- This relies on the goal_notes SELECT policy applying to the inner row,
      -- which Postgres does evaluate. So if the user can't see the note, they
      -- can't see who else can.
    )
  );

  -- INSERT / DELETE on viewer list: only the note creator or goal owner.
  DROP POLICY IF EXISTS "Note creator or goal owner can manage viewers" ON goal_note_viewers;
  CREATE POLICY "Note creator or goal owner can manage viewers"
  ON goal_note_viewers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goal_notes
      WHERE goal_notes.id = goal_note_viewers.note_id
        AND (
          goal_notes.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = goal_notes.goal_id
              AND goals.user_id = auth.uid()
          )
        )
    )
  );

  DROP POLICY IF EXISTS "Note creator or goal owner can delete viewers" ON goal_note_viewers;
  CREATE POLICY "Note creator or goal owner can delete viewers"
  ON goal_note_viewers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goal_notes
      WHERE goal_notes.id = goal_note_viewers.note_id
        AND (
          goal_notes.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = goal_notes.goal_id
              AND goals.user_id = auth.uid()
          )
        )
    )
  );

  -- Enable realtime so the Notes tab can react to other members' edits live.
  ALTER TABLE goal_notes        REPLICA IDENTITY FULL;
  ALTER TABLE goal_note_viewers REPLICA IDENTITY FULL;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'goal_notes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE goal_notes;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'goal_note_viewers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE goal_note_viewers;
    END IF;
  END $$;

  GRANT ALL ON goal_notes        TO service_role;
  GRANT ALL ON goal_note_viewers TO service_role;

  COMMENT ON TABLE goal_notes IS
    'Shared markdown notes scoped to a goal. visibility=all means every goal member can read; visibility=restricted limits readers to the creator, goal owner, and rows in goal_note_viewers.';
  COMMENT ON COLUMN goal_notes.visibility IS
    '"all" = visible to every goal member. "restricted" = creator + goal owner + explicit goal_note_viewers rows only.';
  COMMENT ON TABLE goal_note_viewers IS
    'Per-note allowlist of additional viewers when goal_notes.visibility = restricted.';

  -- ============================================
  -- FIX: infinite recursion in goal_notes / goal_note_viewers policies
  -- The original SELECT policies referenced each other, so Postgres recursed
  -- forever evaluating one through the other. Wrap the cross-table visibility
  -- check in a SECURITY DEFINER function that bypasses RLS internally, then
  -- have both policies call that one function. Run this AFTER the initial
  -- goal_notes/goal_note_viewers DDL above.
  -- ============================================

  CREATE OR REPLACE FUNCTION user_can_view_goal_note(p_note_id UUID, p_user_id UUID)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  STABLE
  SET search_path = public
  AS $$
  DECLARE
    v_goal_id    UUID;
    v_visibility TEXT;
    v_created_by UUID;
  BEGIN
    IF p_user_id IS NULL THEN
      RETURN FALSE;
    END IF;

    SELECT goal_id, visibility, created_by
      INTO v_goal_id, v_visibility, v_created_by
      FROM goal_notes
    WHERE id = p_note_id;

    IF v_goal_id IS NULL THEN
      RETURN FALSE;
    END IF;

    -- Goal owner always sees.
    IF EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = v_goal_id
        AND goals.user_id = p_user_id
    ) THEN
      RETURN TRUE;
    END IF;

    -- Otherwise the viewer must be a member of the goal.
    IF NOT EXISTS (
      SELECT 1 FROM goal_members
      WHERE goal_members.goal_id = v_goal_id
        AND goal_members.user_id = p_user_id
    ) THEN
      RETURN FALSE;
    END IF;

    -- visibility=all: every goal member sees.
    IF v_visibility = 'all' THEN
      RETURN TRUE;
    END IF;

    -- Author can see their own restricted note.
    IF v_created_by = p_user_id THEN
      RETURN TRUE;
    END IF;

    -- Explicit per-note allowlist.
    IF EXISTS (
      SELECT 1 FROM goal_note_viewers
      WHERE note_id  = p_note_id
        AND user_id  = p_user_id
    ) THEN
      RETURN TRUE;
    END IF;

    RETURN FALSE;
  END;
  $$;

  REVOKE ALL ON FUNCTION user_can_view_goal_note(UUID, UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION user_can_view_goal_note(UUID, UUID) TO authenticated, service_role;

  -- Replace the original recursive SELECT policies with calls into the helper.
  DROP POLICY IF EXISTS "Goal members can view permitted goal notes" ON goal_notes;
  CREATE POLICY "Goal members can view permitted goal notes"
  ON goal_notes FOR SELECT
  USING (user_can_view_goal_note(id, auth.uid()));

  DROP POLICY IF EXISTS "Permitted readers can view note viewer rows" ON goal_note_viewers;
  CREATE POLICY "Permitted readers can view note viewer rows"
  ON goal_note_viewers FOR SELECT
  USING (user_can_view_goal_note(note_id, auth.uid()));

  -- ============================================
  -- FIX 2: INSERT/UPDATE/DELETE policies on goal_notes & goal_note_viewers
  -- used `EXISTS (SELECT FROM goal_members ...)` directly, which is evaluated
  -- under the caller's RLS. If goal_members hides rows from regular members
  -- the EXISTS returns false → "new row violates row-level security policy"
  -- even when the user really IS a goal member. Route those checks through a
  -- SECURITY DEFINER helper that bypasses RLS internally.
  -- ============================================

  CREATE OR REPLACE FUNCTION user_can_access_goal(p_goal_id UUID, p_user_id UUID)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  STABLE
  SET search_path = public
  AS $$
  BEGIN
    IF p_user_id IS NULL THEN
      RETURN FALSE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = p_goal_id
        AND goals.user_id = p_user_id
    ) THEN
      RETURN TRUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM goal_members
      WHERE goal_members.goal_id = p_goal_id
        AND goal_members.user_id = p_user_id
    ) THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END;
  $$;

  REVOKE ALL ON FUNCTION user_can_access_goal(UUID, UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION user_can_access_goal(UUID, UUID) TO authenticated, service_role;

  CREATE OR REPLACE FUNCTION user_owns_goal(p_goal_id UUID, p_user_id UUID)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  STABLE
  SET search_path = public
  AS $$
  BEGIN
    IF p_user_id IS NULL THEN
      RETURN FALSE;
    END IF;
    RETURN EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = p_goal_id
        AND goals.user_id = p_user_id
    );
  END;
  $$;

  REVOKE ALL ON FUNCTION user_owns_goal(UUID, UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION user_owns_goal(UUID, UUID) TO authenticated, service_role;

  -- Rewrite the write policies on goal_notes to use the helpers.

  DROP POLICY IF EXISTS "Goal members can create goal notes" ON goal_notes;
  CREATE POLICY "Goal members can create goal notes"
  ON goal_notes FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND user_can_access_goal(goal_id, auth.uid())
  );

  DROP POLICY IF EXISTS "Note creator or goal owner can update goal notes" ON goal_notes;
  CREATE POLICY "Note creator or goal owner can update goal notes"
  ON goal_notes FOR UPDATE
  USING (
    created_by = auth.uid()
    OR user_owns_goal(goal_id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR user_owns_goal(goal_id, auth.uid())
  );

  DROP POLICY IF EXISTS "Note creator or goal owner can delete goal notes" ON goal_notes;
  CREATE POLICY "Note creator or goal owner can delete goal notes"
  ON goal_notes FOR DELETE
  USING (
    created_by = auth.uid()
    OR user_owns_goal(goal_id, auth.uid())
  );

  -- And the viewer-row management policies. Looking up the parent note via
  -- a direct subquery would again hit RLS — so check via the helpers too.

  DROP POLICY IF EXISTS "Note creator or goal owner can manage viewers" ON goal_note_viewers;
  CREATE POLICY "Note creator or goal owner can manage viewers"
  ON goal_note_viewers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goal_notes
      WHERE goal_notes.id = goal_note_viewers.note_id
        AND (
          goal_notes.created_by = auth.uid()
          OR user_owns_goal(goal_notes.goal_id, auth.uid())
        )
    )
  );

  DROP POLICY IF EXISTS "Note creator or goal owner can delete viewers" ON goal_note_viewers;
  CREATE POLICY "Note creator or goal owner can delete viewers"
  ON goal_note_viewers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goal_notes
      WHERE goal_notes.id = goal_note_viewers.note_id
        AND (
          goal_notes.created_by = auth.uid()
          OR user_owns_goal(goal_notes.goal_id, auth.uid())
        )
    )
  );

  -- ============================================
  -- DIAGNOSTIC: paste your goal id where indicated and run these one at a time
  -- to figure out which RLS condition is failing on goal_notes INSERT.
  -- Tell me what each row returns and I'll know exactly what to fix.
  -- ============================================

  -- A. Confirm the helper functions exist and have SECURITY DEFINER.
  --    prosecdef = true means SECURITY DEFINER. Should be 3 rows.
  SELECT proname, prosecdef, proowner::regrole AS owner
    FROM pg_proc
  WHERE proname IN ('user_can_view_goal_note', 'user_can_access_goal', 'user_owns_goal');

  -- B. List ALL policies currently active on goal_notes. There should be
  --    exactly four: SELECT / INSERT / UPDATE / DELETE.
  SELECT policyname, cmd, qual::text AS using_expr, with_check::text AS with_check_expr
    FROM pg_policies
  WHERE tablename = 'goal_notes';

  -- C. Confirm who Supabase thinks you are right now in the SQL Editor.
  --    This will be NULL when the editor is acting as the service role.
  SELECT auth.uid() AS current_uid;

  -- ============================================
  -- FALLBACK: create_goal_note RPC
  -- The INSERT policy keeps misfiring for at least one user (the WITH CHECK
  -- expression is evaluating to false even when membership looks correct).
  -- This RPC sidesteps that entirely: it runs SECURITY DEFINER, validates
  -- membership in code via the same helper, and inserts the row without
  -- going through the goal_notes INSERT policy.
  -- ============================================

  CREATE OR REPLACE FUNCTION create_goal_note(p_goal_id UUID)
  RETURNS SETOF goal_notes
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    uid UUID := auth.uid();
  BEGIN
    IF uid IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT user_can_access_goal(p_goal_id, uid) THEN
      RAISE EXCEPTION 'You must be a member or owner of this goal to create a note';
    END IF;

    RETURN QUERY
    INSERT INTO goal_notes (goal_id, created_by, updated_by, title, content, visibility)
    VALUES (p_goal_id, uid, uid, '', '', 'all')
    RETURNING *;
  END;
  $$;

  REVOKE ALL ON FUNCTION create_goal_note(UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION create_goal_note(UUID) TO authenticated, service_role;

-- ============================================
-- DIAGNOSTIC (optional): if you still want to figure out why the direct
-- INSERT policy fails, you can run this. Otherwise skip — the app will use
-- the RPC above.
-- ============================================

-- D. Edit ONE place: the goal-id below. Get it from your goal page URL,
--    e.g. /goal/7c4d9a2e-aaaa-bbbb-cccc-1234567890ab → paste that UUID
--    between the single quotes. Then run the whole block.
WITH params AS (
  SELECT 'de44294c-5265-4edb-80ec-2797540c93dc'::uuid AS goal_id
  --       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ replace this UUID
)
SELECT
  params.goal_id                                                       AS goal_id,
  auth.uid()                                                           AS my_uid,
  EXISTS(SELECT 1 FROM goals
          WHERE id = params.goal_id AND user_id = auth.uid())          AS am_i_owner,
  EXISTS(SELECT 1 FROM goal_members
          WHERE goal_id = params.goal_id AND user_id = auth.uid())     AS am_i_member,
  user_can_access_goal(params.goal_id, auth.uid())                     AS function_says
FROM params;

-- ============================================
-- FIX: goal_note_viewers missing `role` column
-- The app queries SELECT user_id, role and INSERT role, but the table was
-- created without a role column, causing a 400 Bad Request on every load.
-- Run this once in Supabase SQL Editor.
-- ============================================
ALTER TABLE goal_note_viewers
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('viewer', 'editor'));

-- ============================================
-- RECURRING TASKS: task_series table
-- Stores the recurrence template for a group of linked tasks.
-- Each occurrence is a normal `tasks` row with series_id set.
-- When series_detached = true the task has been individually edited
-- and will no longer receive bulk-series updates.
-- ============================================

CREATE TABLE IF NOT EXISTS task_series (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id          UUID NOT NULL REFERENCES goals(id)      ON DELETE CASCADE,
  frequency        TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly','days_of_week')),
  days_of_week     INT[]   DEFAULT NULL,  -- [0=Sun … 6=Sat], used when frequency='days_of_week'
  title            TEXT,
  description      TEXT DEFAULT '',
  daily_start_time TEXT,
  daily_end_time   TEXT,
  is_anytime       BOOLEAN DEFAULT false,
  duration_minutes INT,
  tags             TEXT[],
  color            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_series_user_id ON task_series(user_id);
CREATE INDEX IF NOT EXISTS idx_task_series_goal_id ON task_series(goal_id);

ALTER TABLE task_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own task series" ON task_series;
CREATE POLICY "Users can view their own task series"
ON task_series FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own task series" ON task_series;
CREATE POLICY "Users can insert their own task series"
ON task_series FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own task series" ON task_series;
CREATE POLICY "Users can update their own task series"
ON task_series FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own task series" ON task_series;
CREATE POLICY "Users can delete their own task series"
ON task_series FOR DELETE USING (auth.uid() = user_id);

-- Add series columns to the tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS series_id       UUID    REFERENCES task_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_detached BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_series_id ON tasks(series_id) WHERE series_id IS NOT NULL;
