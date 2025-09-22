-- RPC: search_users_profile – search users by display_name or email for invitations
-- Safe to run multiple times; idempotent CREATE OR REPLACE

BEGIN;

CREATE OR REPLACE FUNCTION public.search_users_profile(p_query text, p_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    up.display_name::text,
    up.avatar_url::text
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON up.id = u.id
  WHERE u.id <> auth.uid()
    AND (
      COALESCE(up.display_name, '') ILIKE '%' || p_query || '%'
      OR COALESCE(u.email, '') ILIKE '%' || p_query || '%'
    )
  ORDER BY u.created_at DESC
  LIMIT COALESCE(p_limit, 10);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users_profile(text, integer) TO authenticated;

-- Ensure PostgREST picks up changes immediately
NOTIFY pgrst, 'reload schema';

COMMIT;

