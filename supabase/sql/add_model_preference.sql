-- Add model_preference column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS model_preference TEXT DEFAULT 'gemini' CHECK (model_preference IN ('gemini', 'openai', 'claude'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_model_preference ON user_profiles(model_preference);

-- Add comment
COMMENT ON COLUMN user_profiles.model_preference IS 'Preferred AI model for the user: gemini, openai, or claude';
