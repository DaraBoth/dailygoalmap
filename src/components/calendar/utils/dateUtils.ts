
import { isSameDay, format, parseISO, isValid, addDays, subDays } from "date-fns";
import { parseYMD } from "@/utils/parseYMD";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseTaskDate = (raw?: string | null): Date | null => {
  if (!raw) return null;
  if (DATE_ONLY_RE.test(raw)) {
    return parseYMD(raw);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Filters tasks for a specific date
 */
export const filterTasksByDate = (tasks: any[], date: Date) => {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return tasks
    .filter(task => {
      // Handle legacy tasks that might not have start_date/end_date
      let startDate = task.start_date;
      let endDate = task.end_date;

      // If start_date/end_date are missing, use the legacy 'date' field
      if (!startDate && task.date) {
        startDate = task.date;
        endDate = task.date;
      }

      // Skip tasks that have no date information at all
      if (!startDate || !endDate) {
        console.warn('Task has no date information:', task);
        return false;
      }

      const start = parseTaskDate(startDate);
      const end = parseTaskDate(endDate);
      if (!start || !end) {
        return false;
      }
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return startDay <= day && day <= endDay;
    })
    .sort((a, b) => {
      // Sort by daily_start_time when available; else by start_date
      if (a.daily_start_time && b.daily_start_time) {
        return a.daily_start_time.localeCompare(b.daily_start_time);
      }
      if (a.daily_start_time) return -1;
      if (b.daily_start_time) return 1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
};

/**
 * Formats a date as a readable string
 */
export const formatDateForDisplay = (date: Date, pattern: string = "MMMM d, yyyy") => {
  return format(date, pattern);
};

/**
 * Formats a time for display
 */
export const formatTimeForDisplay = (date: Date, pattern: string = "h:mm a") => {
  return format(date, pattern);
};

/**
 * Combines a date and time string to create a single Date object
 */
export const combineDateAndTime = (date: Date, timeString: string): Date => {
  const result = new Date(date);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  if (!isNaN(hours) && !isNaN(minutes)) {
    result.setHours(hours, minutes, 0, 0);
  }
  
  return result;
};

/**
 * Extracts the time portion from a date as HH:MM
 */
export const getTimeFromDate = (date: Date): string => {
  return format(date, "HH:mm");
};

/**
 * Safely parses an ISO string to a Date
 */
export const parseISOSafely = (dateString: string): Date => {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : new Date();
  } catch (e) {
    return new Date();
  }
};

/**
 * Moves to the next day
 */
export const getNextDay = (date: Date): Date => {
  return addDays(date, 1);
};

/**
 * Moves to the previous day
 */
export const getPreviousDay = (date: Date): Date => {
  return subDays(date, 1);
};

/**
 * Find tasks for the next day that has tasks
 */
export const findNextDayWithTasks = (currentDate: Date, tasks: any[], maxDaysToCheck: number = 30): { date: Date, taskIndex: number } | null => {
  let checkDate = currentDate;
  
  for (let i = 1; i <= maxDaysToCheck; i++) {
    checkDate = addDays(checkDate, 1);
    const tasksForDate = filterTasksByDate(tasks, checkDate);
    
    if (tasksForDate.length > 0) {
      return { date: checkDate, taskIndex: 0 };
    }
  }
  
  return null; // No tasks found within the search range
};

/**
 * Find tasks for the previous day that has tasks
 */
export const findPreviousDayWithTasks = (currentDate: Date, tasks: any[], maxDaysToCheck: number = 30): { date: Date, taskIndex: number } | null => {
  let checkDate = currentDate;
  
  for (let i = 1; i <= maxDaysToCheck; i++) {
    checkDate = subDays(checkDate, 1);
    const tasksForDate = filterTasksByDate(tasks, checkDate);
    
    if (tasksForDate.length > 0) {
      return { date: checkDate, taskIndex: tasksForDate.length - 1 };
    }
  }
  
  return null; // No tasks found within the search range
};
