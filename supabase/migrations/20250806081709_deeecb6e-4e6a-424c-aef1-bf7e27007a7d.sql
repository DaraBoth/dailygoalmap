-- Fix: Ensure creators are automatically added as members when creating a goal
-- First, add any existing goal creators as members

INSERT INTO goal_members (goal_id, user_id, role)
SELECT g.id, g.user_id, 'creator'
FROM goals g
WHERE NOT EXISTS (
  SELECT 1 FROM goal_members gm 
  WHERE gm.goal_id = g.id 
  AND gm.user_id = g.user_id
);

-- Create a trigger function to automatically add creators as members
CREATE OR REPLACE FUNCTION public.add_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO goal_members (goal_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'creator');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add creator as member when goal is created
CREATE TRIGGER add_creator_as_member_trigger
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_member();