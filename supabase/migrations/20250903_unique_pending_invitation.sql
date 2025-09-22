-- Enforce at-most-one pending invitation per (goal_id, receiver_id)
-- Implemented via a partial unique index
BEGIN;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation
  ON public.notifications (goal_id, receiver_id)
  WHERE type = 'invitation' AND invitation_status = 'pending' AND read_at IS NULL;
EXCEPTION WHEN others THEN
  -- ignore
  NULL;
END $$;

COMMIT;

