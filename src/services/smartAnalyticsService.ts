import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/components/calendar/types';

export interface SmartInsight {
  type: 'productivity' | 'trend' | 'recommendation' | 'prediction' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon?: string;
}

export interface SmartAnalyticsData {
  insights: SmartInsight[];
  productivityScore: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
  estimatedCompletionDate: Date | null;
  recommendations: string[];
}

/**
 * Analyze tasks and generate AI-powered insights
 */
export async function generateSmartInsights(
  tasks: Task[],
  goalTitle: string,
  goalDescription: string,
  targetDate?: string
): Promise<SmartAnalyticsData> {
  try {
    const analytics = analyzeTaskData(tasks, targetDate);

    // Get AI-powered insights from edge function
    const aiInsights = await getAIInsights(
      tasks,
      goalTitle,
      goalDescription,
      analytics,
      targetDate
    );

    return {
      insights: [...analytics.insights, ...aiInsights],
      productivityScore: analytics.productivityScore,
      velocityTrend: analytics.velocityTrend,
      estimatedCompletionDate: analytics.estimatedCompletionDate,
      recommendations: aiInsights.map(i => i.description),
    };
  } catch (error) {
    console.error('Error generating smart insights:', error);
    // Return basic analytics if AI fails
    return analyzeTaskData(tasks, targetDate);
  }
}

/**
 * Returns the date a completed task was finished (updated_at preferred over created_at).
 * Returns null for incomplete tasks or when no valid date is available.
 */
function getCompletedAt(task: Task): Date | null {
  if (!task.completed) return null;
  const raw = task.updated_at || task.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Perform basic statistical analysis on tasks
 */
function analyzeTaskData(tasks: Task[], targetDate?: string): SmartAnalyticsData {
  const insights: SmartInsight[] = [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  if (totalTasks === 0) {
    return {
      insights: [{
        type: 'recommendation',
        title: 'Get Started',
        description: 'Add tasks to begin tracking your progress',
        priority: 'high',
      }],
      productivityScore: 0,
      velocityTrend: 'stable',
      estimatedCompletionDate: null,
      recommendations: ['Start by breaking down your goal into actionable tasks'],
    };
  }

  const completionRate = (completedTasks / totalTasks) * 100;

  // Calculate productivity score (0-100)
  const recentActivity = calculateRecentActivity(tasks);
  const consistencyScore = calculateConsistency(tasks);
  const productivityScore = Math.round((completionRate + recentActivity + consistencyScore) / 3);

  // Analyze velocity trend
  const velocityTrend = analyzeVelocityTrend(tasks);

  // Estimate completion date
  const estimatedCompletionDate = estimateCompletion(tasks, pendingTasks, targetDate);

  // Generate insights based on patterns
  if (completionRate < 30 && totalTasks > 5) {
    insights.push({
      type: 'warning',
      title: 'Low Completion Rate',
      description: `Only ${Math.round(completionRate)}% of tasks completed. Consider breaking down large tasks into smaller, manageable pieces.`,
      priority: 'high',
    });
  }

  if (velocityTrend === 'decreasing') {
    insights.push({
      type: 'trend',
      title: 'Decreasing Velocity',
      description: 'Your task completion rate is slowing down. Review your workload and priorities.',
      priority: 'medium',
    });
  } else if (velocityTrend === 'increasing') {
    insights.push({
      type: 'trend',
      title: 'Momentum Building',
      description: 'Great job! Your completion rate is accelerating. Keep up the excellent work!',
      priority: 'low',
    });
  }

  // Deadline analysis
  if (targetDate && estimatedCompletionDate) {
    const target = new Date(targetDate);
    const daysRemaining = Math.ceil((target.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const daysToEstimate = Math.ceil((estimatedCompletionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (daysToEstimate > daysRemaining && daysRemaining > 0) {
      insights.push({
        type: 'warning',
        title: 'Behind Schedule',
        description: `At current pace, you'll finish in ${daysToEstimate} days, but only ${daysRemaining} days remain. Consider increasing your daily task completion.`,
        priority: 'high',
      });
    } else if (daysRemaining > 0 && daysRemaining < 7) {
      insights.push({
        type: 'prediction',
        title: 'Deadline Approaching',
        description: `Only ${daysRemaining} days left. Focus on high-priority tasks.`,
        priority: 'high',
      });
    }
  }

  // Activity patterns
  const inactiveDays = calculateInactiveDays(tasks);
  if (inactiveDays > 3) {
    insights.push({
      type: 'productivity',
      title: 'Inactive Period Detected',
      description: `No activity for ${inactiveDays} days. Resume work to maintain momentum.`,
      priority: 'medium',
    });
  }

  // Productivity insights
  if (productivityScore >= 80) {
    insights.push({
      type: 'productivity',
      title: 'High Productivity',
      description: `Excellent! Your productivity score is ${productivityScore}/100. You're on track to achieve your goal.`,
      priority: 'low',
    });
  } else if (productivityScore < 50) {
    insights.push({
      type: 'recommendation',
      title: 'Productivity Boost Needed',
      description: `Your productivity score is ${productivityScore}/100. Try time-blocking or the Pomodoro technique to improve focus.`,
      priority: 'medium',
    });
  }

  return {
    insights,
    productivityScore,
    velocityTrend,
    estimatedCompletionDate,
    recommendations: insights.filter(i => i.type === 'recommendation').map(i => i.description),
  };
}

/**
 * Get AI-powered insights from Gemini/OpenAI
 */
async function getAIInsights(
  tasks: Task[],
  goalTitle: string,
  goalDescription: string,
  basicAnalytics: SmartAnalyticsData,
  targetDate?: string
): Promise<SmartInsight[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Prepare context for AI
    const tasksContext = tasks.map(t => ({
      title: t.title,
      completed: t.completed,
      created: t.created_at,
      start: t.start_date,
      end: t.end_date,
    }));

    const context = `
Goal: ${goalTitle}
Description: ${goalDescription}
Target Date: ${targetDate || 'Not set'}
Total Tasks: ${tasks.length}
Completed: ${tasks.filter(t => t.completed).length}
Productivity Score: ${basicAnalytics.productivityScore}
Velocity Trend: ${basicAnalytics.velocityTrend}

Recent Tasks:
${JSON.stringify(tasksContext.slice(-10), null, 2)}
`;

    const { data, error } = await supabase.functions.invoke('ai-agent', {
      body: {
        messages: [{
          role: 'user',
          content: `Analyze this goal progress and provide 2-3 specific, actionable insights or recommendations. Be concise and practical.

${context}

Respond in JSON format:
{
  "insights": [
    {"type": "productivity|trend|recommendation|prediction", "title": "Brief Title", "description": "Specific actionable advice", "priority": "high|medium|low"}
  ]
}`,
        }],
        goalContext: context,
        model: 'gemini',
      },
    });

    if (error) {
      console.error('AI insights error:', error);
      return [];
    }

    // Parse AI response
    try {
      const responseText = data.response || data.content || '';
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*"insights"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed.insights) ? parsed.insights : [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    return [];
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return [];
  }
}

/**
 * Calculate recent activity score (0-100)
 */
function calculateRecentActivity(tasks: Task[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCompletions = tasks.filter(t => {
    const d = getCompletedAt(t);
    return d !== null && d >= sevenDaysAgo;
  }).length;

  const totalTasks = tasks.length;
  if (totalTasks === 0) return 0;

  return Math.min(100, (recentCompletions / Math.max(1, totalTasks * 0.3)) * 100);
}

/**
 * Calculate consistency score based on task completion distribution
 */
function calculateConsistency(tasks: Task[]): number {
  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length < 3) return 50; // Not enough data

  const completionDates = completedTasks
    .map(t => getCompletedAt(t)?.getTime())
    .filter((v): v is number => v !== undefined)
    .sort((a, b) => a - b);

  // Calculate variance in completion intervals
  const intervals: number[] = [];
  for (let i = 1; i < completionDates.length; i++) {
    intervals.push(completionDates[i] - completionDates[i - 1]);
  }

  if (intervals.length === 0) return 50;

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, interval) => {
    return sum + Math.pow(interval - avgInterval, 2);
  }, 0) / intervals.length;

  // Lower variance = higher consistency
  const consistencyScore = Math.max(0, 100 - (variance / (1000 * 60 * 60 * 24 * 7))); // Normalize by week
  return Math.min(100, consistencyScore);
}

/**
 * Analyze velocity trend
 */
function analyzeVelocityTrend(tasks: Task[]): 'increasing' | 'stable' | 'decreasing' {
  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length < 4) return 'stable';

  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentWeek = completedTasks.filter(t => {
    const d = getCompletedAt(t);
    return d !== null && d >= oneWeekAgo;
  }).length;
  const previousWeek = completedTasks.filter(t => {
    const d = getCompletedAt(t);
    return d !== null && d >= twoWeeksAgo && d < oneWeekAgo;
  }).length;

  if (recentWeek > previousWeek * 1.2) return 'increasing';
  if (recentWeek < previousWeek * 0.8) return 'decreasing';
  return 'stable';
}

/**
 * Estimate goal completion date
 */
function estimateCompletion(tasks: Task[], pendingTasks: number, targetDate?: string): Date | null {
  if (pendingTasks === 0) return new Date();

  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length < 2) return targetDate ? new Date(targetDate) : null;

  // Calculate average completion rate
  const sortedCompletions = completedTasks
    .map(t => getCompletedAt(t)?.getTime())
    .filter((v): v is number => v !== undefined)
    .sort((a, b) => a - b);

  const timeSpan = sortedCompletions[sortedCompletions.length - 1] - sortedCompletions[0];
  const avgCompletionRate = completedTasks.length / (timeSpan / (1000 * 60 * 60 * 24)); // tasks per day

  if (avgCompletionRate === 0) return null;

  const daysToComplete = pendingTasks / avgCompletionRate;
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(daysToComplete));

  return estimatedDate;
}

/**
 * Calculate inactive days
 */
function calculateInactiveDays(tasks: Task[]): number {
  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length === 0) {
    // Check when the goal was created by looking at oldest task
    if (tasks.length > 0) {
      const oldestTask = tasks.reduce((oldest, t) =>
        new Date(t.created_at) < new Date(oldest.created_at) ? t : oldest
      );
      return Math.floor((new Date().getTime() - new Date(oldestTask.created_at).getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
  }

  const lastCompletedAt = completedTasks.reduce((latest, t) => {
    const d = getCompletedAt(t);
    return d && d.getTime() > latest ? d.getTime() : latest;
  }, 0);

  return Math.floor((new Date().getTime() - lastCompletedAt) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate daily completion data for trend charts (last 30 days)
 */
export function calculateDailyTrend(tasks: Task[]): Array<{ date: string; completed: number; total: number }> {
  const days = 30;
  const result: Array<{ date: string; completed: number; total: number }> = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Count tasks scheduled for this day (by start_date)
    const dayTasks = tasks.filter(task => {
      const taskDate = task.start_date
        ? new Date(task.start_date).toISOString().split('T')[0]
        : (task.created_at ? new Date(task.created_at).toISOString().split('T')[0] : null);
      return taskDate === dateStr;
    });

    // Count tasks completed on this day (by updated_at, falling back to created_at)
    const completed = tasks.filter(t => {
      const d = getCompletedAt(t);
      return d !== null && d.toISOString().split('T')[0] === dateStr;
    }).length;

    result.push({
      date: dateStr,
      completed,
      total: dayTasks.length
    });
  }

  return result;
}

/**
 * Calculate current streak of consecutive days with task completions
 */
export function calculateStreak(tasks: Task[]): { current: number; longest: number } {
  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length === 0) return { current: 0, longest: 0 };

  // Get unique completion dates (use updated_at for when task was completed)
  const completionDates = new Set(
    completedTasks
      .map(t => getCompletedAt(t)?.toISOString().split('T')[0])
      .filter((d): d is string => d !== undefined)
  );
  const sortedDates = Array.from(completionDates).sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Calculate current streak
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (sortedDates.includes(dateStr)) {
      currentStreak++;
    } else {
      // Allow one day gap for today if no tasks completed yet
      if (i === 0 && !sortedDates.includes(today) && sortedDates.includes(yesterdayStr)) {
        continue;
      }
      break;
    }
  }

  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return { current: currentStreak, longest: longestStreak };
}

/**
 * Calculate task completion distribution by time of day
 */
export function calculateTimeDistribution(tasks: Task[]): Array<{ hour: number; count: number }> {
  const distribution = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

  const completedTasks = tasks.filter(t => t.completed);

  completedTasks.forEach(task => {
    const d = getCompletedAt(task);
    if (d) distribution[d.getHours()].count++;
  });

  return distribution;
}

/**
 * Calculate velocity (tasks completed per week) over time
 */
export function calculateVelocityData(tasks: Task[]): Array<{ week: string; velocity: number }> {
  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length === 0) return [];

  const weeks = new Map<string, number>();

  completedTasks.forEach(task => {
    const date = getCompletedAt(task);
    if (!date) return;
    // Get week start (Monday)
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const weekKey = weekStart.toISOString().split('T')[0];

    weeks.set(weekKey, (weeks.get(weekKey) || 0) + 1);
  });

  return Array.from(weeks.entries())
    .map(([week, velocity]) => ({ week, velocity }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8); // Last 8 weeks
}

/**
 * Get productivity score breakdown for detailed view
 */
export function getProductivityBreakdown(tasks: Task[]): {
  completionRate: number;
  recentActivity: number;
  consistency: number;
  overall: number;
} {
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return { completionRate: 0, recentActivity: 0, consistency: 0, overall: 0 };
  }

  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = Math.round((completedTasks / totalTasks) * 100);
  const recentActivity = Math.round(calculateRecentActivity(tasks));
  const consistency = Math.round(calculateConsistency(tasks));
  const overall = Math.round((completionRate + recentActivity + consistency) / 3);

  return { completionRate, recentActivity, consistency, overall };
}
