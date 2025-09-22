-- Remove FCM tokens table and related functions since we're switching to tinynotie-api
DROP TABLE IF EXISTS public.fcm_tokens;

-- Remove FCM-related functions
DROP FUNCTION IF EXISTS public.upsert_fcm_token(uuid, text);
DROP FUNCTION IF EXISTS public.delete_fcm_token(uuid);
DROP FUNCTION IF EXISTS public.has_fcm_token(uuid);
DROP FUNCTION IF EXISTS public.has_push_subscription(uuid);

-- Update user_profiles table to have device_id for tinynotie-api integration
-- This will store the latest device_id for each user (one per user)
ALTER TABLE public.user_profiles 
ALTER COLUMN device_id DROP DEFAULT,
ALTER COLUMN device_id TYPE text;

-- Add a unique constraint to ensure one device_id per user
-- (This is already handled by the primary key on user_profiles.id)

-- Create function to update user device_id (replaces old one)
CREATE OR REPLACE FUNCTION public.update_user_device_id(user_id_param uuid, device_id_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.user_profiles
    SET device_id = device_id_param,
        updated_at = now()
    WHERE id = user_id_param;
    
    -- If no row was updated, the user doesn't have a profile yet
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
END;
$$;

-- Create function to get user device_id
CREATE OR REPLACE FUNCTION public.get_user_device_id(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    device_id_result text;
BEGIN
    SELECT device_id INTO device_id_result
    FROM public.user_profiles
    WHERE id = user_id_param;
    
    RETURN device_id_result;
END;
$$;

-- Create function to check if user has device_id
CREATE OR REPLACE FUNCTION public.has_device_id(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    has_device boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = user_id_param
        AND device_id IS NOT NULL
        AND device_id != ''
    ) INTO has_device;
    
    RETURN has_device;
END;
$$;