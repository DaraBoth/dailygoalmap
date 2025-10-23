-- Migration to add tags support to tasks
ALTER TABLE tasks
ADD COLUMN tags text[] DEFAULT '{}';

-- Index for searching tags
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN (tags);