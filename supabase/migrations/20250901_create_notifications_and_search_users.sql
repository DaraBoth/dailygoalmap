-- Create notifications table and search_users function
BEGIN;

-- 1) Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('invitation','removal','member_left')),
  goal_id uuid NULL REFERENCES public.goals(id) ON DELETE SET NULL,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb DEFAULT '{}'::jsonb,
  invitation_status text NULL CHECK (invitation_status IN ('pending','accepted','declined')),
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_notifications_receiver_created ON public.notifications(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_goal ON public.notifications(goal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(receiver_id) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- Receivers can read their notifications
DROP POLICY IF EXISTS notifications_select_receiver ON public.notifications;
CREATE POLICY notifications_select_receiver ON public.notifications
FOR SELECT USING (auth.uid() = receiver_id);

-- Senders can insert notifications where they are the sender
DROP POLICY IF EXISTS notifications_insert_sender ON public.notifications;
CREATE POLICY notifications_insert_sender ON public.notifications
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Receivers can update read_at and invitation_status on their own notifications
DROP POLICY IF EXISTS notifications_update_receiver ON public.notifications;
CREATE POLICY notifications_update_receiver ON public.notifications
FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

-- Optional: allow senders to delete notifications they sent (not required now)
-- DROP POLICY IF EXISTS notifications_delete_sender ON public.notifications;
-- CREATE POLICY notifications_delete_sender ON public.notifications
-- FOR DELETE USING (auth.uid() = sender_id);

-- 2) search_users function: search by display_name (user_profiles) or email (auth.users)
CREATE OR REPLACE FUNCTION public.search_users(p_query text, p_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    up.display_name,
    up.avatar_url
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON up.id = u.id
  WHERE 
    (up.display_name ILIKE '%' || p_query || '%')
    OR (u.email ILIKE '%' || p_query || '%')
  ORDER BY u.created_at DESC
  LIMIT COALESCE(p_limit, 10);
END;
$$;

COMMIT;

