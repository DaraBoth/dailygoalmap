
-- Function to enable realtime for a table
CREATE OR REPLACE FUNCTION public.enable_realtime_for_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the table's replica identity to full
  EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY FULL', 'public', table_name);
  
  -- This function will only execute the ALTER TABLE command
  -- Supabase automatically handles publication setup
  
  -- Return success
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, we'll just log it and continue
    -- This prevents the function from breaking the application
    RAISE NOTICE 'Error enabling realtime for table %: %', table_name, SQLERRM;
END;
$$;

-- Grant execution permissions to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.enable_realtime_for_table(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enable_realtime_for_table(text) TO anon;

-- Execute the function to enable realtime for the tasks table
SELECT public.enable_realtime_for_table('tasks');

-- Add the tasks table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
