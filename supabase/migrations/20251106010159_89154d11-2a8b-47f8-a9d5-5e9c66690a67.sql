-- Drop existing policies for goal_themes
DROP POLICY IF EXISTS "Goal members can view themes" ON goal_themes;
DROP POLICY IF EXISTS "Users can create themes" ON goal_themes;
DROP POLICY IF EXISTS "Users can delete own themes or goal creators can delete goal th" ON goal_themes;
DROP POLICY IF EXISTS "Users can update their own themes" ON goal_themes;

-- Allow users to view their own themes OR themes created by members of goals they belong to
CREATE POLICY "Users can view themes from their goals"
ON goal_themes
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  -- User is a member of a goal, and the theme was created by another member of that goal
  EXISTS (
    SELECT 1 
    FROM goal_members gm1
    INNER JOIN goal_members gm2 ON gm1.goal_id = gm2.goal_id
    WHERE gm1.user_id = auth.uid() 
    AND gm2.user_id = goal_themes.user_id
  )
  OR
  -- User is a member of a goal that is currently using this theme
  EXISTS (
    SELECT 1
    FROM goals g
    INNER JOIN goal_members gm ON g.id = gm.goal_id
    WHERE g.theme_id = goal_themes.id 
    AND gm.user_id = auth.uid()
  )
);

-- Users can create their own themes
CREATE POLICY "Users can create themes"
ON goal_themes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own themes
CREATE POLICY "Users can update their own themes"
ON goal_themes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own themes OR goal creators can delete any theme from goal members
CREATE POLICY "Users can delete own themes or creators can delete member themes"
ON goal_themes
FOR DELETE
USING (
  auth.uid() = user_id
  OR
  -- User is a creator of a goal, and the theme was created by a member of that goal
  EXISTS (
    SELECT 1
    FROM goal_members gm_creator
    INNER JOIN goal_members gm_theme_owner ON gm_creator.goal_id = gm_theme_owner.goal_id
    WHERE gm_creator.user_id = auth.uid()
    AND gm_creator.role = 'creator'
    AND gm_theme_owner.user_id = goal_themes.user_id
  )
);