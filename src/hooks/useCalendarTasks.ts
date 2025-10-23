
import { useState, useEffect, useCallback, useRef } from "react";
import { Task } from "@/components/calendar/types";
import { useTaskManager } from "@/components/calendar/TaskManager";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import {
  findNextDayWithTasks,
  findPreviousDayWithTasks,
  filterTasksByDate,
  getNextDay,
  getPreviousDay
} from "@/components/calendar/utils/dateUtils";

interface FinancialData {
  goalId: string;
  monthlyIncome: number;
}

interface UseCalendarTasksProps {
  goalId: string;
  goalTitle: string;
  goalDescription?: string;
  allTasks?: Task[];
  isLoadingAllTasks?: boolean;
}

export const useCalendarTasks = ({
  goalId,
  goalTitle,
  goalDescription,
  allTasks,
  isLoadingAllTasks = false
}: UseCalendarTasksProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [dailySpendingLimit, setDailySpendingLimit] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const { toast } = useToast();
  const initialLoadCompleted = useRef(false);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Update internal tasks state when allTasks prop changes
  useEffect(() => {
    if (allTasks) {
      setTasks(allTasks);
      setIsLoading(false);
    }
  }, [allTasks]);

  const { loadTasks, getTasksForDate, toggleTaskCompletion, enableRealtimeForTasks } = useTaskManager({
    goalId,
    goalTitle,
    goalDescription
  });

  // Enable realtime updates for tasks
  useEffect(() => {
    if (goalId) {
      enableRealtimeForTasks();
    }
  }, [goalId, enableRealtimeForTasks]); // Added enableRealtimeForTasks to dependencies

  const getTasksForDateWrapper = useCallback((date: Date) => {
    // Prioritize allTasks if provided, otherwise use internal tasks state
    const currentTasks = allTasks || tasks;
    return filterTasksByDate(currentTasks, date);
  }, [allTasks, tasks]); // Removed filterTasksByDate from dependency array

  useEffect(() => {
    const loadFinancialData = () => {
      const storedData = localStorage.getItem('financialData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const goalData: FinancialData | undefined = parsedData.find((data: FinancialData) => data.goalId === goalId);
        if (goalData) {
          setFinancialData(goalData);

          const limit = calculateDailySpendingLimit(goalData.monthlyIncome, 20);
          setDailySpendingLimit(limit);
        }
      }
    };

    loadFinancialData();
  }, [goalId]);

  useEffect(() => {
    let isMounted = true;

    // If allTasks are provided, we don't need to load tasks internally
    if (allTasks) {
      setIsLoading(false);
      // Ensure tasks state is set if allTasks is available on initial render
      if (tasks.length === 0 && allTasks.length > 0) {
        setTasks(allTasks);
      }
      return;
    }

    // Existing logic for loading tasks if allTasks is not provided
    const initializeTasks = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      setError(null);

      try {
        const loadedTasks = await loadTasks();
        if (isMounted) {
          setTasks(loadedTasks);
        }
      } catch (error) {
        console.error("Failed to initialize calendar data:", error);
        if (isMounted) {
          setError("Failed to load calendar data. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeTasks();

    return () => {
      isMounted = false;
    };
  }, [loadTasks, allTasks, tasks.length]); // Added tasks.length to dependency array

  const handleDateChange = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
    // Don't auto-select task on date change
    setSelectedTask(null);
    setSelectedTaskIndex(0);
  }, []);

  const handleToggleTaskCompletion = async (taskId: string) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const newCompletedState = !taskToUpdate.completed;
    
    // Update local state FIRST for immediate UI feedback
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: newCompletedState } 
        : task
    );
    setTasks(updatedTasks);

    // Update selectedTask if it's the one being toggled
    if (selectedTask && selectedTask.id === taskId) {
      const updatedSelectedTask = {
        ...selectedTask,
        completed: newCompletedState
      };
      setSelectedTask(updatedSelectedTask);
    }

    // Now update the backend
    try {
      await toggleTaskCompletion(tasks, taskId);
      
      // Format datetime for notification
      const startDate = new Date(taskToUpdate.start_date);
      const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = taskToUpdate.daily_start_time 
        ? new Date(`2000-01-01T${taskToUpdate.daily_start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '';
      const datetimeInfo = timeStr ? `${dateStr} at ${timeStr}` : dateStr;
      
      // Send internal notification only (push notifications handled by database trigger)
      const { createTaskUpdateNotification } = await import('@/services/internalNotifications');
      
      // Build a deep link URL so notification opens the goal page with date and task selected
      const deepLinkUrl = `/goal/${goalId}?date=${encodeURIComponent(startDate.toISOString())}&taskId=${encodeURIComponent(taskId)}`;

      await createTaskUpdateNotification(
        goalId,
        taskToUpdate.user_id,
        'task_updated',
        {
          task_title: taskToUpdate.title || taskToUpdate.description,
          task_id: taskId,
          action: newCompletedState ? 'completed' : 'reopened',
          datetime: datetimeInfo,
          url: deepLinkUrl
        }
      );
    } catch (error) {
      console.error("Failed to toggle task completion:", error);
      // Revert local state on error
      setTasks(tasks);
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(taskToUpdate);
      }
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNavigateTask = useCallback((direction: 'next' | 'prev' | 'current', specificIndex?: number) => {
    const baseDate = selectedTask ? new Date(selectedTask.start_date) : selectedDate;
    if (!baseDate) return;

    // Always derive the tasks list from the currently selected task's day if available
    const tasksForThisDay = getTasksForDateWrapper(baseDate);

    // Helper function to batch state updates with animation frame scheduling
    const updateTaskStates = (date: Date, task: Task | null, index: number) => {
      // Cancel any pending animation frames to prevent race conditions
      if (typeof window !== 'undefined') {
        window.cancelAnimationFrame(window.requestAnimationFrame(() => {}));
      }
      // Schedule the update in the next animation frame
      requestAnimationFrame(() => {
        setSelectedDate(date);
        setSelectedTask(task);
        setSelectedTaskIndex(index);
      });
    };

    // Handle direct index selection (stay on same date and only update selection)
    if (direction === 'current' && typeof specificIndex === 'number') {
      if (specificIndex >= 0 && specificIndex < tasksForThisDay.length) {
        const taskAtIndex = tasksForThisDay[specificIndex] || null;
        // Update synchronously to avoid any race with other state setters
        setSelectedTask(taskAtIndex);
        setSelectedTaskIndex(specificIndex);
      }
      return;
    }

    const tasksList = allTasks || tasks;

    // Handle next task navigation
    if (direction === 'next') {
      // First try to navigate within current day (based on selectedTask's date if set)
      if (selectedTaskIndex < tasksForThisDay.length - 1) {
        const newIndex = selectedTaskIndex + 1;
        const nextTask = tasksForThisDay[newIndex];
        if (nextTask) {
          updateTaskStates(baseDate, nextTask, newIndex);
          return;
        }
      }

      // Then look for next day with tasks
      const nextDayWithTasks = findNextDayWithTasks(baseDate, tasksList);

      if (nextDayWithTasks) {
        const tasksForNextDay = getTasksForDateWrapper(nextDayWithTasks.date);
        if (tasksForNextDay.length > 0) {
          updateTaskStates(nextDayWithTasks.date, tasksForNextDay[0], 0);
          return;
        }
      }

      // Finally, move to next empty day if no tasks found
      const nextDay = getNextDay(baseDate);
      updateTaskStates(nextDay, null, 0);

    // Handle previous task navigation
    } else if (direction === 'prev') {
      // First try to navigate within current day (based on selectedTask's date if set)
      if (selectedTaskIndex > 0) {
        const newIndex = selectedTaskIndex - 1;
        const prevTask = tasksForThisDay[newIndex];
        if (prevTask) {
          updateTaskStates(baseDate, prevTask, newIndex);
          return;
        }
      }

      // Then look for previous day with tasks
      const prevDayWithTasks = findPreviousDayWithTasks(baseDate, tasksList);

      if (prevDayWithTasks) {
        const tasksForPrevDay = getTasksForDateWrapper(prevDayWithTasks.date);
        if (tasksForPrevDay.length > 0) {
          const lastIndex = tasksForPrevDay.length - 1;
          updateTaskStates(prevDayWithTasks.date, tasksForPrevDay[lastIndex], lastIndex);
          return;
        }
      }

      // Finally, move to previous empty day if no tasks found
      const prevDay = getPreviousDay(baseDate);
      updateTaskStates(prevDay, null, 0);
    }
  }, [selectedDate, selectedTask, selectedTaskIndex, getTasksForDateWrapper, allTasks]);

  // Keep selectedTaskIndex in sync with the actual selectedTask when dialog reopens or tasks change
  useEffect(() => {
    if (!selectedDate || !selectedTask) return;

    // Only sync if we're not in the middle of a task completion operation
    // This prevents race conditions that might trigger unwanted navigation
    const tasksForDate = getTasksForDateWrapper(selectedDate);
    const idx = tasksForDate.findIndex(t => t.id === selectedTask.id);

    // If the selected task is no longer found (e.g., it was deleted)
    if (idx === -1) {
      // Clear the selection to prevent navigation issues when a task is deleted
      setSelectedTask(null);
      setSelectedTaskIndex(0);
      return;
    }

    // Only update if the task is found and the index is different
    // This prevents setting selectedTaskIndex to -1 which could cause navigation issues
    if (idx >= 0 && idx !== selectedTaskIndex) {
      setSelectedTaskIndex(idx);
    }
  }, [selectedDate, selectedTask, selectedTaskIndex, getTasksForDateWrapper]);


  const handleAddTask = async (
    description: string,
    date: Date,
    time?: string,
    range?: {
      title?: string;
      start_date?: Date;
      end_date?: Date;
      daily_start_time?: string; // 'HH:mm'
      daily_end_time?: string;   // 'HH:mm'
      completed?: boolean;
    }
  ) => {

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Authentication required",
          description: "Please log in to add tasks.",
          variant: "destructive",
        });
        return;
      }

      const taskId = crypto.randomUUID();

      const taskDate = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        taskDate.setHours(hours, minutes);
      }

      // Build insert payload using unified fields
      const payload: any = {
        id: taskId,
        goal_id: goalId,
        user_id: userData.user.id,
        description: description,
        completed: range?.completed ?? false,

      };

      if (range?.title) payload.title = range.title;
      // Determine unified fields: prefer provided range values; fallback to selected date/time
      const startForInsert = range?.start_date ? new Date(range.start_date) : taskDate;
      const endForInsert = range?.end_date ? new Date(range.end_date) : startForInsert;
      payload.start_date = startForInsert.toISOString();
      payload.end_date = endForInsert.toISOString();
      const startTimeStr = range?.daily_start_time || time || null;
      const endTimeStr = range?.daily_end_time || time || null;
      payload.daily_start_time = startTimeStr ? `${startTimeStr}:00` : null;
      payload.daily_end_time = endTimeStr ? `${endTimeStr}:00` : null;

      const { error: saveError } = await supabase
        .from('tasks')
        .insert(payload);

      if (saveError) {
        throw saveError;
      }

      const newTask: Task = {
        id: taskId,
        description,
        completed: range?.completed ?? false,
        user_id: userData.user.id,
        title: range?.title,
        start_date: startForInsert.toISOString(),
        end_date: endForInsert.toISOString(),
        daily_start_time: startTimeStr ? `${startTimeStr}:00` : null,
        daily_end_time: endTimeStr ? `${endTimeStr}:00` : null,
      };

      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);

      // Format datetime for notification
      const startDate = new Date(newTask.start_date);
      const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = newTask.daily_start_time 
        ? new Date(`2000-01-01T${newTask.daily_start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '';
      const datetimeInfo = timeStr ? `${dateStr} at ${timeStr}` : dateStr;

      // Send internal notification only (push notifications handled by database trigger)
      const { createTaskUpdateNotification } = await import('@/services/internalNotifications');
      
      await createTaskUpdateNotification(
        goalId,
        newTask.user_id,
        'task_updated',
        {
          task_title: newTask.title || newTask.description,
          task_id: taskId,
          action: 'added',
          datetime: datetimeInfo
        }
      );

      toast({
        title: "Task added",
        description: `Task "${range?.title || description}" has been added.`,
      });

      // Anchor selection on start date
      const anchorDate = startForInsert;
      setSelectedDate(anchorDate);

      if (getTasksForDateWrapper(anchorDate).length === 0) {
        // After state update, selection index will be set when tasks re-filter
        setSelectedTask(newTask);
        setSelectedTaskIndex(0);
      }
    } catch (error: unknown) {
      console.error("Failed to add task:", error);
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    isTaskDetailsOpen,
    setIsTaskDetailsOpen,
    selectedTask,
    setSelectedTask,
    selectedTaskIndex,
    setSelectedTaskIndex,
    financialData,
    dailySpendingLimit,
    isLoading,
    error,
    tasks: allTasks || tasks,
    isAddTaskDialogOpen,
    setIsAddTaskDialogOpen,
    handleDateChange,
    handleToggleTaskCompletion,
    handleNavigateTask,
    handleAddTask,
    getTasksForDateWrapper,
    setTasks // Expose setTasks
  };
};

function calculateDailySpendingLimit(monthlyIncome?: number, daysPerMonth: number = 30): number | undefined {
  if (!monthlyIncome) return undefined;
  return monthlyIncome / daysPerMonth;
}
