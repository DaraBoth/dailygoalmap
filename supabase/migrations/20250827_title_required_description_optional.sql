-- Migration: Make title required, description optional; backfill title from description
-- Safe to run multiple times

BEGIN;

-- 1) Backfill title from description where title is NULL or empty/whitespace
UPDATE public.tasks
SET title = COALESCE(NULLIF(trim(title), ''), trim(description))
WHERE (title IS NULL OR length(trim(title)) = 0);

-- 2) Fallback to a placeholder if still NULL after backfill
UPDATE public.tasks
SET title = 'Untitled Task'
WHERE title IS NULL;

-- 3) Make description optional (drop NOT NULL if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tasks' AND column_name='description' AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.tasks ALTER COLUMN description DROP NOT NULL;
  END IF;
END $$;

-- 4) Enforce NOT NULL on title
DO $$
BEGIN
  -- Ensure no NULLs remain
  UPDATE public.tasks SET title = 'Untitled Task' WHERE title IS NULL;
  -- Apply constraint if not already present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tasks' AND column_name='title'
  ) THEN
    ALTER TABLE public.tasks ALTER COLUMN title SET NOT NULL;
  END IF;
END $$;

COMMIT;

