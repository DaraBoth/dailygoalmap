
-- Function to check if a user has a push subscription
CREATE OR REPLACE FUNCTION public.has_push_subscription(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM push_subscriptions
    WHERE user_id = user_id_param
  );
END;
$$;

-- Function to get a user's push subscription
CREATE OR REPLACE FUNCTION public.get_user_push_subscription(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_json TEXT;
BEGIN
  SELECT subscription INTO subscription_json
  FROM push_subscriptions
  WHERE user_id = user_id_param;
  
  RETURN subscription_json;
END;
$$;

-- Function to upsert a push subscription
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  user_id_param UUID,
  subscription_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO push_subscriptions (user_id, subscription)
  VALUES (user_id_param, subscription_param)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    subscription = subscription_param,
    updated_at = NOW();
END;
$$;

-- Function to delete a push subscription
CREATE OR REPLACE FUNCTION public.delete_push_subscription(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM push_subscriptions
  WHERE user_id = user_id_param;
END;
$$;
