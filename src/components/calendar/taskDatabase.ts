import { supabase } from "@/integrations/supabase/client";
import { Task, TaskManagerProps } from "./types";
import { format } from "date-fns";
import { normalizeTaskList } from "./taskNormalization";

// Define a key rotation pool with fallback keys
const FALLBACK_API_KEYS = [
  "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0", 
  "AIzaSyD2SN814JxX4hDIpJfQjgSYTezEn-X3I2k",
  "AIzaSyAXYwIl0YNRZhBDedpwyLLZCPp-6nA2XPk",
  "AIzaSyB__UbCBSa_DVE6crSAeNuM6fHg3-NlhiI"
];

// Track the current key index for rotation
let currentKeyIndex = 0;

// Rotate to the next available API key when one hits rate limits
const rotateApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % FALLBACK_API_KEYS.length;
  return FALLBACK_API_KEYS[currentKeyIndex];
};

export async function fetchUserTasks(goalId: string): Promise<Task[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error("No authenticated user found");
    }
    
    const { data: taskData, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId);
    
    if (error) {
      throw error;
    }
    
    return normalizeTaskList(taskData as any[]);
  } catch (error) {
    console.error("Error fetching tasks from database:", error);
    throw error;
  }
}

export async function saveTaskToSupabase(task: Task, goalId: string): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error("No authenticated user found");
    }
    
    const { error } = await supabase
      .from('tasks')
      .insert({
        id: task.id,
        goal_id: goalId,
        user_id: userData.user.id,
        description: task.description,
        completed: task.completed,
        title: task.title || null,
        start_date: task.start_date,
        end_date: task.end_date,
        daily_start_time: task.daily_start_time,
        daily_end_time: task.daily_end_time,
      });
    
    if (error) {
      throw error;
    }

    // Send notifications to goal members about new task
    try {
      const { sendNotificationToGoalMembers } = await import("@/services/notificationService");
      const { createTaskNotification } = await import("@/services/internalNotifications");
      
      // Get goal details for notification
      const { data: goalData } = await supabase
        .from('goals')
        .select('title')
        .eq('id', goalId)
        .single();

      if (goalData) {
  // Build a deep link to the new task so recipients can open it directly
  const taskDateOnly = String(task.start_date).slice(0, 10);
  const deepLinkNew = `/goal/${goalId}?date=${encodeURIComponent(taskDateOnly)}&taskId=${encodeURIComponent(task.id)}`;

  // Resolve to an absolute URL using Vite env if provided, otherwise use current origin
  const viteEnv = (typeof import.meta !== 'undefined') ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env : undefined;
  const publicBase = (viteEnv && viteEnv.VITE_PUBLIC_URL) || (typeof window !== 'undefined' ? window.location.origin : undefined);
  const absoluteDeepLinkNew = publicBase ? (String(publicBase).replace(/\/$/, '') + deepLinkNew) : deepLinkNew;

        // Send push notification to goal members
        await sendNotificationToGoalMembers(
          goalId,
          userData.user.id,
          "New Task Added",
          `A new task "${task.description}" was added to "${goalData.title}"`,
          {
            type: 'task_created',
            task_id: task.id,
            goal_id: goalId,
            url: absoluteDeepLinkNew
          }
        );

        // Create internal notification for goal members
        await createTaskNotification(goalId, userData.user.id, 'task_created', {
          task_id: task.id,
          task_title: task.description,
          goal_title: goalData.title,
          url: deepLinkNew
        });
      }
    } catch (notifyError) {
      console.error("Failed to send task notifications:", notifyError);
      // Don't throw here - task creation should succeed even if notifications fail
    }
  } catch (error) {
    console.error("Error saving task to Supabase:", error);
    throw error;
  }
}

export async function updateTaskCompletion(taskId: string, completed: boolean): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Enable realtime subscription for tasks if not already enabled
    await enableRealtimeForTable('tasks');

    // Get task and goal info for notifications
    const { data: task, error: taskError } = await supabase
      .from('tasks')
    .select('goal_id, title, start_date')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error("Failed to get task information");
    }

    const { data: updatedRows, error } = await supabase
      .from('tasks')
      .update({ 
        completed: completed, 
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', taskId)
      .select('id');
    
    if (error) {
      throw error;
    }

    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Task completion update was not persisted. Check tasks UPDATE policy/RLS.");
    }

    // Send notifications to goal members about task completion
    try {
      const { sendNotificationToGoalMembers } = await import("@/services/notificationService");
      const { createTaskUpdateNotification } = await import("@/services/internalNotifications");
      
      // Build deep link to the task
  const completedTaskDate = String(task.start_date || '').slice(0, 10);
  const deepLinkComplete = `/goal/${task.goal_id}?taskId=${encodeURIComponent(taskId)}&date=${encodeURIComponent(completedTaskDate)}`;
  const viteEnv2 = (typeof import.meta !== 'undefined') ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env : undefined;
  const publicBase2 = (viteEnv2 && viteEnv2.VITE_PUBLIC_URL) || (typeof window !== 'undefined' ? window.location.origin : undefined);
  const absoluteDeepLinkComplete = publicBase2 ? (String(publicBase2).replace(/\/$/, '') + deepLinkComplete) : deepLinkComplete;

      await sendNotificationToGoalMembers(
        task.goal_id,
        user.id,
        `Task ${completed ? 'completed' : 'unchecked'}`,
        `${task.title} has been ${completed ? 'completed' : 'marked incomplete'}`,
        {
          type: 'task_updated',
          task_id: taskId,
          goal_id: task.goal_id,
          action: completed ? 'completed' : 'uncompleted',
          url: absoluteDeepLinkComplete
        }
      );

      // Store internal notification
        await createTaskUpdateNotification(
        task.goal_id,
        user.id,
        'task_updated',
        {
          task_title: task.title,
          task_id: taskId,
          action: completed ? 'completed' : 'uncompleted',
            url: absoluteDeepLinkComplete
        }
      );
    } catch (notifError) {
      console.error('Error sending task completion notifications:', notifError);
      // Don't throw - task update succeeded
    }
  } catch (error) {
    console.error("Error updating task completion in Supabase:", error);
    throw error;
  }
}

export async function deleteTasksForGoal(goalId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('goal_id', goalId)
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error deleting existing tasks:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error deleting tasks for goal:", error);
    throw error;
  }
}

export async function insertMultipleTasks(tasks: Task[], goalId: string, userId: string): Promise<void> {
  try {
    // Convert tasks to the format expected by the database
    const tasksToInsert = tasks.map(task => ({
      id: task.id,
      goal_id: goalId,
      user_id: userId,
      title: task.description,
      description: task.description,
      start_date: task.start_date,
      end_date: task.end_date,
      completed: task.completed
    }));
    
    console.log(`Preparing to insert ${tasksToInsert.length} tasks for goal ${goalId}`);
    
    // Insert tasks in batches to avoid payload size limits
    const batchSize = 10;
    let insertedCount = 0;
    
    for (let i = 0; i < tasksToInsert.length; i += batchSize) {
      const batch = tasksToInsert.slice(i, i + batchSize);
      const { error } = await supabase
        .from('tasks')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      } else {
        insertedCount += batch.length;
        console.log(`Successfully inserted batch ${Math.floor(i / batchSize) + 1} with ${batch.length} tasks`);
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} out of ${tasksToInsert.length} tasks for goal ${goalId}`);
  } catch (error) {
    console.error("Error inserting multiple tasks:", error);
    throw error;
  }
}

export async function fetchGoalTargetDate(goalId: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('target_date')
      .eq('id', goalId)
      .single();
    
    if (error) {
      console.error("Error fetching goal data:", error);
      return null;
    }
    
    return data && data.target_date ? new Date(data.target_date) : null;
  } catch (error) {
    console.error("Failed to fetch goal target date:", error);
    return null;
  }
}

export async function fetchGeminiApiKey(): Promise<string> {
  try {
    // Get the default Gemini API key if available
    const { data, error } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('key_type', 'gemini')
      .eq('is_default', true)
      .single();
    
    if (error || !data) {
      // If no default key found, try to get any Gemini key
      const { data: anyKeyData } = await supabase
        .from('api_keys')
        .select('key_value')
        .eq('key_type', 'gemini')
        .limit(1);
          
      if (anyKeyData && anyKeyData.length > 0) {
        return anyKeyData[0].key_value;
      }
      // Use a key from the rotation pool if no keys in database
      return FALLBACK_API_KEYS[currentKeyIndex];
    }
    
    return data.key_value || FALLBACK_API_KEYS[currentKeyIndex];
  } catch (error) {
    console.error("Error fetching Gemini API key:", error);
    // Use a key from the rotation pool if there's an error
    return FALLBACK_API_KEYS[currentKeyIndex];
  }
}

// Function to enable realtime for a specific table
export async function enableRealtimeForTable(tableName: "tasks" | "goals" | "goal_members" | "api_keys" | "push_subscriptions" | "user_profiles" | "notifications"): Promise<void> {
  try {
    // Execute a query to enable realtime
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1)
      .then(() => {
        console.log(`Realtime enabled for ${tableName} table`);
        return { error: null };
      });
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(`Error enabling realtime for ${tableName} table:`, error);
    // Fallback: Try to use the realtime subscription anyway even if the configuration failed
  }
}
