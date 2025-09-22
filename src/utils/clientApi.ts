
import { supabase } from "@/integrations/supabase/client";
import { saveTaskForSync, isOnline, registerSyncEvent } from "./offlineSync";

// API endpoint to handle task synchronization from service worker
export const setupClientApi = () => {
  // Register the endpoint that the service worker will call for syncing
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'SYNC_REQUEST') {
        const task = event.data.task;
        
        try {
          // Process the task based on the operation type
          let result;
          
          switch (task.operation) {
            case 'create':
              result = await createTask(task.taskData);
              break;
            case 'update':
              result = await updateTask(task.taskData);
              break;
            case 'delete':
              result = await deleteTask(task.taskData.id);
              break;
            default:
              throw new Error(`Unknown operation: ${task.operation}`);
          }
          
          // Send back the result to the service worker
          event.source.postMessage({
            type: 'SYNC_RESPONSE',
            taskId: task.taskData.id,
            success: true
          });
          
        } catch (error) {
          console.error(`Error processing sync request for task ${task.taskData.id}:`, error);
          
          // Inform the service worker that the operation failed
          event.source.postMessage({
            type: 'SYNC_RESPONSE',
            taskId: task.taskData.id,
            success: false,
            error: error.message
          });
        }
      }
    });
  }
};

// Function to create a task in Supabase
const createTask = async (taskData: any) => {
  const { error } = await supabase
    .from('tasks')
    .insert({
      id: taskData.id,
      goal_id: taskData.goal_id,
      user_id: taskData.user_id,
      title: taskData.title || 'Task',
      description: taskData.description,
      start_date: taskData.start_date,
      end_date: taskData.end_date,
      daily_start_time: taskData.daily_start_time,
      daily_end_time: taskData.daily_end_time,
      completed: taskData.completed
    });
  
  if (error) throw error;
  return true;
};

// Function to update a task in Supabase
const updateTask = async (taskData: any) => {
  const updateData: Record<string, any> = {};
  
  // Only include fields that are present in the task data
  if ('description' in taskData) updateData.description = taskData.description;
  if ('completed' in taskData) updateData.completed = taskData.completed;
  if ('date' in taskData) updateData.date = taskData.date;
  
  updateData.updated_at = new Date().toISOString();
  
  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskData.id);
  
  if (error) throw error;
  return true;
};

// Function to delete a task in Supabase
const deleteTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) throw error;
  return true;
};

// Initialize the client API when the app starts
export const initializeClientApi = () => {
  setupClientApi();
};
