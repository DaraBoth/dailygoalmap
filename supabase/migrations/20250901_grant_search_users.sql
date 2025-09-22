-- Ensure users can search each other via a safe, limited RPC
-- Recreate search_users with SECURITY DEFINER and grant execute

BEGIN;

-- Recreate with explicit search_path including auth
CREATE OR REPLACE FUNCTION public.search_users(p_query text, p_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
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

-- Allow both anon and authenticated to call the RPC via PostgREST
GRANT EXECUTE ON FUNCTION public.search_users(text, integer) TO anon, authenticated;

COMMIT;

