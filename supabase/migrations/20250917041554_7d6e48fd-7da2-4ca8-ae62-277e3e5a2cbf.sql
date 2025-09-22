-- Fix database functions security by adding proper search_path
-- This prevents potential SQL injection and ensures functions use the correct schema

-- Update existing functions to include search_path
CREATE OR REPLACE FUNCTION public.search_users_profile(p_query text, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, email text, display_name text, avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.search_users(p_query text, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, email text, display_name text, avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.upsert_fcm_token(user_id_param uuid, fcm_token_param text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    INSERT INTO public.fcm_tokens (user_id, fcm_token)
    VALUES (user_id_param, fcm_token_param)
    ON CONFLICT (fcm_token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        created_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_fcm_token(user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    DELETE FROM public.fcm_tokens
    WHERE user_id = user_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_fcm_token(user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    has_token boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.fcm_tokens
        WHERE user_id = user_id_param
    ) INTO has_token;
    
    RETURN has_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_push_subscription(user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    has_token boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.fcm_tokens
        WHERE user_id = user_id_param
    ) INTO has_token;
    
    RETURN has_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$function$;