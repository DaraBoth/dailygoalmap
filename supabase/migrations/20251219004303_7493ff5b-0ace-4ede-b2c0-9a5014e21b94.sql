-- Add last_seen column to goal_members table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_members' AND column_name = 'last_seen') THEN
    ALTER TABLE public.goal_members ADD COLUMN last_seen timestamp with time zone DEFAULT NULL;
  END IF;
END $$;

-- Create index for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_goal_members_last_seen ON public.goal_members(goal_id, last_seen DESC);

-- Drop and recreate the get_goal_members function with last_seen
DROP FUNCTION IF EXISTS public.get_goal_members(uuid);

CREATE FUNCTION public.get_goal_members(p_goal_id uuid)
RETURNS TABLE(id uuid, goal_id uuid, user_id uuid, joined_at timestamp with time zone, role text, avatar_url text, display_name text, last_seen timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id,
    gm.goal_id,
    gm.user_id,
    gm.joined_at,
    gm.role,
    up.avatar_url,
    up.display_name,
    gm.last_seen
  FROM 
    goal_members gm
  LEFT JOIN 
    user_profiles up ON gm.user_id = up.id
  WHERE 
    gm.goal_id = p_goal_id;
END;
$$;

-- Function to update last_seen when a member views a goal
CREATE OR REPLACE FUNCTION public.update_member_last_seen(p_goal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE goal_members
  SET last_seen = NOW()
  WHERE goal_id = p_goal_id
  AND user_id = auth.uid();
END;
$$;