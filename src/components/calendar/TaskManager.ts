
import { isSameDay, addDays, format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { Task, TaskManagerProps } from "./types";
import { 
  fetchUserTasks, 
  saveTaskToSupabase, 
  updateTaskCompletion,
  fetchGoalTargetDate,
  enableRealtimeForTable
} from "./taskDatabase";
import {
  loadTasksFromLocalStorage,
  saveTasksToLocalStorage
} from "./localStorage";
import {
  generateSingleTask
} from "./taskGenerator";
import { 
  saveTaskForSync, 
  isOnline, 
  registerSyncEvent 
} from "@/utils/offlineSync";

export const useTaskManager = ({ goalId, goalTitle, goalDescription }: TaskManagerProps) => {
  // Function to load tasks from Supabase database or generate with AI
  const loadTasks = async (): Promise<Task[]> => {
    try {
      // First try to load tasks from Supabase
      const tasks = await fetchUserTasks(goalId);
      
      if (tasks.length > 0) {
        return tasks;
      }
      
      // If no tasks found in database, generate a new one
      const today = new Date();
      const newTask = await generateSingleTask(today, goalId, goalTitle, goalDescription);
      
      // Save task to Supabase
      await saveTaskToSupabase(newTask, goalId);
      
      return [newTask];
    } catch (error) {
      console.error("Error loading tasks:", error);
      // Fallback to localStorage if there's an error
      return loadTasksFromLocalStorage(goalId);
    }
  };

  // Function to get tasks for a specific date - made into a pure function
  const getTasksForDate = (tasks: Task[], date: Date): Task[] => {
    return tasks.filter(task => isSameDay(new Date(task.start_date), date));
  };

  // Function to toggle task completion status
  const toggleTaskCompletion = async (tasks: Task[], taskId: string): Promise<Task[]> => {
    // Find the task to update
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate) {
      return tasks;
    }
    
    const newCompletedState = !taskToUpdate.completed;
    
    // Try to update task in Supabase if online
    if (isOnline()) {
      try {
        await updateTaskCompletion(taskId, newCompletedState);
      } catch (error) {
        console.error("Failed to update task in Supabase:", error);
        
        // If online update fails, save for offline sync
        saveTaskForSync({
          operation: 'update',
          taskData: {
            id: taskId,
            goal_id: goalId,
            completed: newCompletedState
          }
        }, 'online_write_failed');
        
        await registerSyncEvent();
      }
    } else {
      // We're offline, save for sync later
      saveTaskForSync({
        operation: 'update',
        taskData: {
          id: taskId,
          goal_id: goalId,
          completed: newCompletedState
        }
      }, 'offline');
      
      await registerSyncEvent();
    }
    
    // Update local tasks array regardless of Supabase result
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: newCompletedState } 
        : task
    );
    
    // Update localStorage as fallback
    saveTasksToLocalStorage(updatedTasks, goalId);
    
    return updatedTasks;
  };

  // Function to add a new task for a specific date
  const addTaskForDate = async (tasks: Task[], date: Date): Promise<Task[]> => {
    try {
      // Get authentication user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("No authenticated user found");
      }
      
      // Generate a new task for the date
      const newTask = await generateSingleTask(date, goalId, goalTitle, goalDescription);
      
      if (isOnline()) {
        // Try to save to Supabase if online
        try {
          await saveTaskToSupabase(newTask, goalId);
        } catch (error) {
          console.error("Failed to save task to Supabase:", error);
          
          // If online save fails, save for offline sync
          saveTaskForSync({
            operation: 'create',
            taskData: {
              id: newTask.id,
              goal_id: goalId,
              user_id: userData.user.id,
              title: newTask.description,
              description: newTask.description,
              start_date: newTask.start_date,
              end_date: newTask.end_date,
              completed: newTask.completed
            }
          }, 'online_write_failed');
          
          await registerSyncEvent();
        }
      } else {
        // We're offline, save for sync later
        saveTaskForSync({
          operation: 'create',
          taskData: {
            id: newTask.id,
            goal_id: goalId,
            user_id: userData.user.id,
            title: newTask.description,
            description: newTask.description,
            start_date: newTask.start_date,
            end_date: newTask.end_date,
            completed: newTask.completed
          }
        }, 'offline');
        
        await registerSyncEvent();
      }
      
      const updatedTasks = [...tasks, newTask];
      
      // Update localStorage as fallback
      saveTasksToLocalStorage(updatedTasks, goalId);
      
      return updatedTasks;
    } catch (error) {
      console.error("Failed to add task for date:", error);
      
      // Fallback to simple task creation if AI generation fails
      const fallbackTask: Task = {
        id: uuidv4(),
        start_date: date.toISOString(),
        end_date: date.toISOString(),
        description: `Task for ${format(date, 'MMM d')}`,
        user_id: '',
        completed: false
      };
      
      const updatedTasks = [...tasks, fallbackTask];
      saveTasksToLocalStorage(updatedTasks, goalId);
      
      return updatedTasks;
    }
  };

  // Enable realtime for the tasks table
  const enableRealtimeForTasks = async () => {
    try {
      await enableRealtimeForTable("tasks");
      return true;
    } catch (error) {
      console.error("Error enabling realtime for tasks:", error);
      return false;
    }
  };

  return {
    loadTasks,
    getTasksForDate,
    toggleTaskCompletion,
    addTaskForDate,
    enableRealtimeForTasks
  };
};
