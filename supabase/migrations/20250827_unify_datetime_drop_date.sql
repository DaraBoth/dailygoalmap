-- Migration: Unify tasks date/time and drop legacy date + is_range_task
-- Steps:
-- 1. Backfill start/end and daily times from legacy date where needed
-- 2. Add constraint end_date >= start_date
-- 3. Drop legacy constraints referencing is_range_task
-- 4. Drop columns: date, is_range_task
-- 5. Create helpful indexes if missing

BEGIN;

-- 1) Backfill from legacy 'date' column when new fields are null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tasks' AND column_name='date'
  ) THEN
    UPDATE public.tasks
    SET 
      start_date = COALESCE(start_date, date_trunc('day', date)),
      end_date = COALESCE(end_date, date_trunc('day', date)),
      daily_start_time = COALESCE(daily_start_time, CAST(date AS time)),
      daily_end_time = COALESCE(daily_end_time, CAST(date AS time));
  END IF;
END $$;

-- 2) Ensure end_date >= start_date (create or replace style)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_date_range_order_chk') THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_date_range_order_chk;
  END IF;
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_date_range_order_chk
    CHECK (
      start_date IS NULL OR end_date IS NULL OR end_date >= start_date
    );
END $$;

-- 3) Drop any constraint that referenced is_range_task (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_daily_time_order_chk') THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_daily_time_order_chk;
  END IF;
END $$;

-- 4) Drop legacy columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tasks' AND column_name='date'
  ) THEN
    ALTER TABLE public.tasks DROP COLUMN date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='tasks' AND column_name='is_range_task'
  ) THEN
    ALTER TABLE public.tasks DROP COLUMN is_range_task;
  END IF;
END $$;

-- 5) Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_tasks_goal_start ON public.tasks (goal_id, start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_end   ON public.tasks (goal_id, end_date);

COMMIT;

