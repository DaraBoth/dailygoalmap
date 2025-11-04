-- Create a function to fetch enriched notifications with all related data in one query
CREATE OR REPLACE FUNCTION get_enriched_notifications(
  p_user_id UUID,
  p_limit INT DEFAULT 15,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_only_unread BOOLEAN DEFAULT FALSE,
  p_only_invites BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  goal_id UUID,
  sender_id UUID,
  receiver_id UUID,
  payload JSONB,
  invitation_status TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  url TEXT,
  -- Sender profile
  sender_display_name TEXT,
  sender_avatar_url TEXT,
  -- Goal info
  goal_title TEXT,
  goal_status TEXT,
  -- Membership check
  is_member BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.goal_id,
    n.sender_id,
    n.receiver_id,
    n.payload,
    n.invitation_status,
    n.read_at,
    n.created_at,
    n.url,
    -- Sender profile data
    up.display_name as sender_display_name,
    up.avatar_url as sender_avatar_url,
    -- Goal data
    g.title as goal_title,
    g.status as goal_status,
    -- Check if user is a member of the goal
    EXISTS(
      SELECT 1 FROM goal_members gm 
      WHERE gm.goal_id = n.goal_id 
      AND gm.user_id = p_user_id
    ) as is_member
  FROM notifications n
  LEFT JOIN user_profiles up ON up.id = n.sender_id
  LEFT JOIN goals g ON g.id = n.goal_id
  WHERE n.receiver_id = p_user_id
    AND (p_before IS NULL OR n.created_at < p_before)
    AND (NOT p_only_unread OR n.read_at IS NULL)
    AND (NOT p_only_invites OR n.type = 'invitation')
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;