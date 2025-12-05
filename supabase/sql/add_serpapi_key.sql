-- Add your SerpAPI key to the database
-- Run this manually in Supabase SQL Editor

-- Insert SerpAPI key for your user
INSERT INTO public.api_keys (user_id, key_name, key_type, key_value, is_default)
VALUES (
  auth.uid(), -- This will use the authenticated user's ID
  'My SerpAPI Key',
  'serpapi',
  'e705c8f69bcc0b66ad03cd65607eb8e3b333522dd2d7b2f91390c5f53d4af9ed',
  true
)
ON CONFLICT DO NOTHING;

-- Or if you want to add it for a specific user ID, replace auth.uid() with your user UUID:
-- VALUES (
--   'your-user-uuid-here',
--   'My SerpAPI Key',
--   'serpapi',
--   'e705c8f69bcc0b66ad03cd65607eb8e3b333522dd2d7b2f91390c5f53d4af9ed',
--   true
-- );
