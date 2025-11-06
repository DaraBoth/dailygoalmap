-- Create goal_themes table
CREATE TABLE IF NOT EXISTS public.goal_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  goal_profile_image TEXT,
  card_background_image TEXT,
  page_background_image TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own themes"
  ON public.goal_themes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own themes"
  ON public.goal_themes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
  ON public.goal_themes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes"
  ON public.goal_themes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add theme_id to goals table
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES public.goal_themes(id) ON DELETE SET NULL;

-- Create storage bucket for theme images
INSERT INTO storage.buckets (id, name, public)
VALUES ('goal-themes', 'goal-themes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for theme images
CREATE POLICY "Users can view theme images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'goal-themes');

CREATE POLICY "Users can upload their own theme images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'goal-themes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own theme images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'goal-themes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own theme images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'goal-themes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );