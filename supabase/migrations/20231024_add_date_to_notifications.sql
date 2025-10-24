-- Add date column to notifications table
ALTER TABLE public.notifications
ADD COLUMN date timestamp with time zone;

-- Update existing rows to have a date (using created_at as default)
UPDATE public.notifications
SET date = created_at
WHERE date IS NULL;

-- Add an index for better query performance
CREATE INDEX idx_notifications_date ON public.notifications(date);

-- Note: Not making the column required (NOT NULL) to maintain backward compatibility
COMMENT ON COLUMN public.notifications.date IS 'The date associated with the notification, particularly for task-related notifications';