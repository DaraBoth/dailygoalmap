# Database Schema Setup

This document contains the complete database schema for the Goal Tracker application. Run these SQL commands in your Supabase SQL Editor in the order provided.

## Tables Creation

### 1. User Profiles Table

```sql
-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 2. Goals Table

```sql
-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',
  metadata JSONB,
  share_code UUID DEFAULT gen_random_uuid(),
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own and shared goals" ON public.goals
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM goal_members 
      WHERE goal_members.goal_id = goals.id 
      AND goal_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view public goals" ON public.goals
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create their own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. Goal Members Table

```sql
-- Create goal_members table
CREATE TABLE public.goal_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view goal members" ON public.goal_members
  FOR SELECT USING (user_is_goal_member(goal_id));

CREATE POLICY "Users can insert themselves as members" ON public.goal_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only creators can add members (fixed)" ON public.goal_members
  FOR INSERT WITH CHECK (is_goal_creator(goal_id));

CREATE POLICY "Users can leave a goal" ON public.goal_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Only creators can remove members (fixed)" ON public.goal_members
  FOR DELETE USING (is_goal_creator(goal_id));
```

### 4. Tasks Table

```sql
-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  daily_start_time TIME WITHOUT TIME ZONE,
  daily_end_time TIME WITHOUT TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view tasks from accessible goals" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM goal_members 
      WHERE goal_members.goal_id = tasks.goal_id 
      AND goal_members.user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = tasks.goal_id 
      AND goals.is_public = true
    )
  );

CREATE POLICY "Users can create their own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert tasks into their own and shared goals" ON public.tasks
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM goal_members 
      WHERE goal_members.goal_id = tasks.goal_id 
      AND goal_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can update tasks from their own and shared goals" ON public.tasks
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM goal_members 
      WHERE goal_members.goal_id = tasks.goal_id 
      AND goal_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete tasks from their own and shared goals" ON public.tasks
  FOR DELETE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM goal_members 
      WHERE goal_members.goal_id = tasks.goal_id 
      AND goal_members.user_id = auth.uid()
    )
  );
```

### 5. API Keys Table

```sql
-- Create api_keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  key_name TEXT NOT NULL,
  key_type TEXT NOT NULL,
  key_value TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own API keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);
```

### 6. Notifications Table

```sql
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  invitation_status TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "notifications_select_receiver" ON public.notifications
  FOR SELECT USING (auth.uid() = receiver_id);

CREATE POLICY "notifications_insert_sender" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "notifications_update_receiver" ON public.notifications
  FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
```

### 7. Push Subscriptions Table

```sql
-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
```

## Database Functions

### Helper Functions

```sql
-- Function to check if user is goal member
CREATE OR REPLACE FUNCTION public.user_is_goal_member(p_goal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM goal_members 
    WHERE goal_id = p_goal_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- Function to check if user is goal creator
CREATE OR REPLACE FUNCTION public.is_goal_creator(p_goal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM goal_members 
    WHERE goal_id = p_goal_id 
    AND user_id = auth.uid()
    AND role = 'creator'
  );
END;
$$;

-- Function to check goal membership with parameters
CREATE OR REPLACE FUNCTION public.check_goal_membership(p_goal_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM goal_members 
    WHERE goal_id = p_goal_id 
    AND user_id = p_user_id
  );
END;
$$;

-- Function to join a goal
CREATE OR REPLACE FUNCTION public.join_goal(p_goal_id UUID, p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO goal_members (goal_id, user_id, role)
  VALUES (p_goal_id, p_user_id, p_role);
END;
$$;

-- Function to get goal members
CREATE OR REPLACE FUNCTION public.get_goal_members(p_goal_id UUID)
RETURNS TABLE(
  id UUID,
  goal_id UUID,
  user_id UUID,
  joined_at TIMESTAMP WITH TIME ZONE,
  role TEXT,
  avatar_url TEXT,
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id,
    gm.goal_id,
    gm.user_id,
    gm.joined_at,
    gm.role,
    up.avatar_url,
    up.display_name
  FROM 
    goal_members gm
  LEFT JOIN 
    user_profiles up ON gm.user_id = up.id
  WHERE 
    gm.goal_id = p_goal_id;
END;
$$;

-- Function to remove goal member
CREATE OR REPLACE FUNCTION public.remove_goal_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal_id UUID;
  v_user_id UUID;
  v_is_creator BOOLEAN;
BEGIN
  -- Get goal_id from member id
  SELECT goal_id INTO v_goal_id
  FROM goal_members
  WHERE id = p_member_id;
  
  -- Check if current user is creator
  SELECT EXISTS (
    SELECT 1 
    FROM goal_members 
    WHERE goal_id = v_goal_id 
    AND user_id = auth.uid()
    AND role = 'creator'
  ) INTO v_is_creator;
  
  -- Validate creator status
  IF NOT v_is_creator THEN
    RAISE EXCEPTION 'Only the goal creator can remove members';
  END IF;
  
  -- Cannot remove self as creator
  SELECT user_id INTO v_user_id
  FROM goal_members
  WHERE id = p_member_id;
  
  IF v_user_id = auth.uid() AND (SELECT role FROM goal_members WHERE id = p_member_id) = 'creator' THEN
    RAISE EXCEPTION 'Creator cannot remove themselves from the goal';
  END IF;
  
  -- Delete the member
  DELETE FROM goal_members
  WHERE id = p_member_id;
END;
$$;

-- Function to regenerate goal share code
CREATE OR REPLACE FUNCTION public.regenerate_goal_share_code(p_goal_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_share_code UUID;
    v_is_creator BOOLEAN;
BEGIN
    -- Check if user is creator
    SELECT EXISTS (
        SELECT 1 FROM goal_members 
        WHERE goal_id = p_goal_id 
        AND user_id = auth.uid() 
        AND role = 'creator'
    ) INTO v_is_creator;
    
    IF NOT v_is_creator THEN
        RAISE EXCEPTION 'Only the goal creator can regenerate the share code';
    END IF;
    
    -- Generate new share code
    v_new_share_code := gen_random_uuid();
    
    -- Update goal with new share code
    UPDATE goals
    SET share_code = v_new_share_code
    WHERE id = p_goal_id;
    
    RETURN v_new_share_code;
END;
$$;

-- Function to search users
CREATE OR REPLACE FUNCTION public.search_users_profile(p_query TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(id UUID, email TEXT, display_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Function to toggle goal public status
CREATE OR REPLACE FUNCTION public.toggle_goal_public(p_goal_id UUID, p_is_public BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_member BOOLEAN;
  v_current_slug TEXT;
  v_new_slug TEXT;
BEGIN
  -- Check if user is creator or member
  SELECT EXISTS (
    SELECT 1 FROM goal_members 
    WHERE goal_id = p_goal_id 
    AND user_id = auth.uid()
  ) INTO v_is_member;
  
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Only goal members can change goal visibility';
  END IF;
  
  -- Get current slug
  SELECT public_slug INTO v_current_slug FROM goals WHERE id = p_goal_id;
  
  -- If setting to public and no slug exists, generate one
  IF p_is_public = true AND v_current_slug IS NULL THEN
    SELECT REPLACE(encode(uuid_send(gen_random_uuid()), 'base64'), '=', '') 
    INTO v_new_slug;
    v_new_slug := SUBSTRING(v_new_slug, 1, 12);
    
    UPDATE goals
    SET is_public = p_is_public, public_slug = v_new_slug
    WHERE id = p_goal_id;
  ELSE
    -- Otherwise just update visibility
    UPDATE goals
    SET is_public = p_is_public
    WHERE id = p_goal_id;
  END IF;
  
  RETURN p_is_public;
END;
$$;
```

### User Profile Functions

```sql
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

-- Function to update user device ID
CREATE OR REPLACE FUNCTION public.update_user_device_id(user_id_param UUID, device_id_param TEXT)
RETURNS VOID
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

-- Function to get user device ID
CREATE OR REPLACE FUNCTION public.get_user_device_id(user_id_param UUID)
RETURNS TEXT
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

-- Function to check if user has device ID
CREATE OR REPLACE FUNCTION public.has_device_id(user_id_param UUID)
RETURNS BOOLEAN
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
```

### Push Subscription Functions

```sql
-- Function to check if user has push subscription
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

-- Function to get user push subscription
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

-- Function to upsert push subscription
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

-- Function to delete push subscription
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
```

## Triggers

```sql
-- Trigger to automatically add creator as member when goal is created
CREATE OR REPLACE FUNCTION public.add_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO goal_members (goal_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'creator');
  RETURN NEW;
END;
$$;

CREATE TRIGGER add_creator_as_member_trigger
  AFTER INSERT ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_member();

-- Trigger to automatically create user profile when user signs up
CREATE TRIGGER handle_new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Real-time Setup

```sql
-- Enable real-time for all tables
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.goal_members REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
```

## Indexes (Optional for Performance)

```sql
-- Create indexes for better performance
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_share_code ON public.goals(share_code);
CREATE INDEX idx_goals_public_slug ON public.goals(public_slug);
CREATE INDEX idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_goal_members_goal_id ON public.goal_members(goal_id);
CREATE INDEX idx_goal_members_user_id ON public.goal_members(user_id);
CREATE INDEX idx_notifications_receiver_id ON public.notifications(receiver_id);
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
```

## Important Notes

1. Run all SQL commands in order
2. Make sure Row Level Security (RLS) is enabled on all tables
3. All functions use `SECURITY DEFINER` for proper permissions
4. Real-time is enabled for collaborative features
5. Triggers automatically handle user profile creation and goal membership

After running this schema, your database will be ready for the Goal Tracker application!