import { differenceInDays, isToday, isPast, parseISO, format } from "date-fns";
import { Goal } from "@/types/goal";

export type GoalDeadlineStatus = 
  | "on_track"
  | "approaching_deadline" 
  | "due_today"
  | "overdue"
  | "completed";

export interface GoalDeadlineInfo {
  status: GoalDeadlineStatus;
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  progressPercentage: number;
  urgencyLevel: "low" | "medium" | "high" | "critical";
  statusMessage: string;
  actionSuggestions: string[];
}

/**
 * Calculate deadline status and information for a goal
 */
export const calculateGoalDeadlineInfo = (goal: Goal): GoalDeadlineInfo => {
  const isNoDuration = Boolean(goal.no_duration || goal.metadata?.no_duration);
  const targetDateStr = goal.target_date || new Date().toISOString().split('T')[0];
  const targetDate = parseISO(targetDateStr);
  const startDateStr = goal.metadata?.start_date || new Date().toISOString().split('T')[0];
  const startDate = parseISO(startDateStr);
  const today = new Date();

  if (isNoDuration) {
    return {
      status: "on_track",
      daysRemaining: 0,
      daysElapsed: Math.max(0, differenceInDays(today, startDate)),
      totalDays: 0,
      progressPercentage: 0,
      urgencyLevel: "low",
      statusMessage: "No deadline",
      actionSuggestions: ["View tasks", "Update progress"],
    };
  }
  
  // Calculate days
  const daysRemaining = differenceInDays(targetDate, today);
  const daysElapsed = differenceInDays(today, startDate);
  const totalDays = differenceInDays(targetDate, startDate);
  
  // Calculate progress percentage
  const progressPercentage = totalDays > 0 ? Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100)) : 0;
  
  // Determine status
  let status: GoalDeadlineStatus;
  let urgencyLevel: "low" | "medium" | "high" | "critical";
  let statusMessage: string;
  let actionSuggestions: string[];

  // Check if goal is completed
  if (goal.status === "completed") {
    status = "completed";
    urgencyLevel = "low";
    statusMessage = "Goal completed successfully!";
    actionSuggestions = ["View achievements", "Set new goal"];
  }
  // Check if overdue
  else if (isPast(targetDate) && !isToday(targetDate)) {
    status = "overdue";
    urgencyLevel = "critical";
    const overdueDays = Math.abs(daysRemaining);
    statusMessage = `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
    actionSuggestions = ["Mark as complete", "Extend deadline", "Archive goal"];
  }
  // Check if due today
  else if (isToday(targetDate)) {
    status = "due_today";
    urgencyLevel = "critical";
    statusMessage = "Due today!";
    actionSuggestions = ["Mark as complete", "Extend deadline", "Focus mode"];
  }
  // Check if approaching deadline (within 7 days)
  else if (daysRemaining <= 7 && daysRemaining > 0) {
    status = "approaching_deadline";
    urgencyLevel = daysRemaining <= 3 ? "high" : "medium";
    statusMessage = `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;
    actionSuggestions = ["Focus mode", "Review progress", "Extend deadline"];
  }
  // On track
  else {
    status = "on_track";
    urgencyLevel = "low";
    statusMessage = `${daysRemaining} days remaining`;
    actionSuggestions = ["View tasks", "Update progress"];
  }

  return {
    status,
    daysRemaining,
    daysElapsed,
    totalDays,
    progressPercentage,
    urgencyLevel,
    statusMessage,
    actionSuggestions
  };
};

/**
 * Get visual styling for deadline status
 */
export const getDeadlineStatusStyling = (status: GoalDeadlineStatus, urgencyLevel: "low" | "medium" | "high" | "critical") => {
  switch (status) {
    case "completed":
      return {
        borderColor: "border-green-200 dark:border-green-800",
        backgroundColor: "bg-green-50/60 dark:bg-green-900/20",
        badgeColor: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
        iconColor: "text-green-600 dark:text-green-400",
        progressColor: "bg-green-500"
      };
    case "overdue":
      return {
        borderColor: "border-red-300 dark:border-red-700",
        backgroundColor: "bg-red-50/60 dark:bg-red-900/20",
        badgeColor: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
        iconColor: "text-red-600 dark:text-red-400",
        progressColor: "bg-red-500"
      };
    case "due_today":
      return {
        borderColor: "border-orange-300 dark:border-orange-700",
        backgroundColor: "bg-orange-50/60 dark:bg-orange-900/20",
        badgeColor: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        iconColor: "text-orange-600 dark:text-orange-400",
        progressColor: "bg-orange-500"
      };
    case "approaching_deadline":
      return {
        borderColor: urgencyLevel === "high" ? "border-yellow-300 dark:border-yellow-700" : "border-yellow-200 dark:border-yellow-800",
        backgroundColor: "bg-yellow-50/60 dark:bg-yellow-900/20",
        badgeColor: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        progressColor: "bg-yellow-500"
      };
    default: // on_track
      return {
        borderColor: "border-blue-200 dark:border-blue-800",
        backgroundColor: "bg-blue-50/60 dark:bg-blue-900/20",
        badgeColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        iconColor: "text-blue-600 dark:text-blue-400",
        progressColor: "bg-blue-500"
      };
  }
};

/**
 * Get icon for deadline status
 */
export const getDeadlineStatusIcon = (status: GoalDeadlineStatus) => {
  switch (status) {
    case "completed":
      return "CheckCircle2";
    case "overdue":
      return "AlertTriangle";
    case "due_today":
      return "Clock";
    case "approaching_deadline":
      return "Timer";
    default: // on_track
      return "Target";
  }
};

/**
 * Filter goals by deadline status
 */
export const filterGoalsByDeadlineStatus = (goals: Goal[], status: GoalDeadlineStatus): Goal[] => {
  return goals.filter(goal => calculateGoalDeadlineInfo(goal).status === status);
};

/**
 * Get deadline notification message for dashboard
 */
export const getDeadlineNotificationMessage = (goals: Goal[]): string | null => {
  const overdueGoals = filterGoalsByDeadlineStatus(goals, "overdue");
  const dueTodayGoals = filterGoalsByDeadlineStatus(goals, "due_today");
  const approachingGoals = filterGoalsByDeadlineStatus(goals, "approaching_deadline");

  if (overdueGoals.length > 0) {
    return `You have ${overdueGoals.length} overdue goal${overdueGoals.length === 1 ? '' : 's'}. Take action to get back on track!`;
  }
  
  if (dueTodayGoals.length > 0) {
    return `${dueTodayGoals.length} goal${dueTodayGoals.length === 1 ? ' is' : 's are'} due today. Time to finish strong!`;
  }
  
  if (approachingGoals.length > 0) {
    return `${approachingGoals.length} goal${approachingGoals.length === 1 ? ' is' : 's are'} approaching the deadline. Stay focused!`;
  }

  return null;
};
