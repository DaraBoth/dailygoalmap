DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;

-- Enable RLS on notifications table if not already enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert notifications where they are the sender
CREATE POLICY "Users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Allow users to see notifications meant for them
CREATE POLICY "Users can see their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    receiver_id = auth.uid() OR
    receiver_id IN (
        SELECT user_id
        FROM goal_members
        WHERE goal_id IN (
            SELECT goal_id
            FROM goal_members
            WHERE user_id = auth.uid()
        )
    )
);