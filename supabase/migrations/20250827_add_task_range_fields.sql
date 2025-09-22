-- Migration: Add task range/duration fields to tasks table
-- Safe, backward-compatible additions

BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS daily_start_time time without time zone,
  ADD COLUMN IF NOT EXISTS daily_end_time time without time zone,
  ADD COLUMN IF NOT EXISTS is_range_task boolean NOT NULL DEFAULT false;

-- Backfill a basic title from description when missing
UPDATE public.tasks
SET title = COALESCE(title, LEFT(description, 80))
WHERE title IS NULL AND description IS NOT NULL;

-- Consistency checks (non-breaking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_daily_time_order_chk'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_daily_time_order_chk
      CHECK (
        NOT is_range_task
        OR daily_start_time IS NULL
        OR daily_end_time IS NULL
        OR daily_end_time > daily_start_time
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_date_range_order_chk'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_date_range_order_chk
      CHECK (
        NOT is_range_task
        OR start_date IS NULL
        OR end_date IS NULL
        OR end_date >= start_date
      );
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tasks_goal_date ON public.tasks (goal_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_start ON public.tasks (goal_id, start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_end   ON public.tasks (goal_id, end_date);

COMMIT;

