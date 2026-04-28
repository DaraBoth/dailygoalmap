-- Add preferences JSONB columns to user_profiles and goals for AI personalization
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
