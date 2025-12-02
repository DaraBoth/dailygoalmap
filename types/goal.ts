export interface GoalMetadata {
  version?: number;
  goal_type: 'general' | 'financial' | 'travel' | 'finance' | 'education';
  start_date?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    timeRange?: [string, string];
    daysOfWeek?: number[];
  };
  milestones?: Array<{
    title: string;
    due_date?: string;
  }>;
  template_id?: string;
  travel_destination?: string;
  travel_accommodation?: string;
  travel_transportation?: string;
  travel_budget?: string;
  travel_activities?: string[];
  financial_details?: {
    targetAmount?: number;
    currentSavings?: number;
    monthlySavingsTarget?: number;
    currency?: string;
  };
  [key: string]: any;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export type SortField = 'title' | 'target_date' | 'status' | 'created_at';

export type GoalType = "general" | "travel" | "finance" | "education" | "financial";

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata: GoalMetadata;
  user_id: string;
  share_code?: string;
  is_public?: boolean;
  public_slug?: string;
  theme_id?: string;
  taskCounts?: {
    total: number;
    completed: number;
    incomplete: number;
  };
  memberCounts?: {
    total: number;
  }
  goal_themes?: {
    card_background_image?: string
    created_at?: string
    goal_profile_image?: string
    id?: string
    name?: string
    page_background_image?: string
    updated_at?: string
    user_id?: string
  };
}

export interface GoalMember {
  id: string;
  goal_id: string;
  user_id: string;
  joined_at: string;
  role: 'creator' | 'member';
  user_profile?: {
    avatar_url?: string;
    display_name?: string;
  }
}

// Helper functions for converting between Goal and GoalData
export interface GoalData {
  title: string;
  description: string;
  target_date: string;
  goal_type: 'general' | 'financial' | 'travel' | 'finance' | 'education';
  start_date: string;
  status?: string;
  travel_details?: {
    destination?: string;
    accommodation?: string;
    transportation?: string;
    budget?: string;
    activities?: string[];
  };
  financial_details?: {
    targetAmount?: number;
    currentSavings?: number;
    monthlySavingsTarget?: number;
    currency?: string;
  };
}

export const goalDataToGoal = (goalData: GoalData, userId?: string): Partial<Goal> => {
  const { title, description, target_date, goal_type, start_date, status = 'active', ...restData } = goalData;
  
  return {
    title,
    description,
    target_date,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      goal_type,
      start_date,
      ...restData
    },
    user_id: userId || '',
  };
};

export const goalToGoalData = (goal: Goal): GoalData => {
  const { metadata } = goal;

  const goalData: GoalData = {
    title: goal.title,
    description: goal.description,
    target_date: goal.target_date,
    goal_type: metadata.goal_type,
    start_date: metadata.start_date,
    status: goal.status
  };

  // Add travel details if present
  if (metadata.travel_details) {
    goalData.travel_details = metadata.travel_details;
  }

  // Add financial details if present
  if (metadata.financial_details) {
    goalData.financial_details = metadata.financial_details;
  }

  return goalData;
};

// Helper function to convert Goal to form initialData format
export const goalToFormData = (goal: Goal) => {
  const { metadata } = goal;

  return {
    title: goal.title,
    description: goal.description,
    target_date: goal.target_date,
    goal_type: metadata.goal_type,
    travel_details: metadata.goal_type === 'travel' ? {
      destination: metadata.travel_destination || '',
      accommodation: metadata.travel_accommodation || '',
      transportation: metadata.travel_transportation || '',
      budget: metadata.travel_budget || '',
      activities: metadata.travel_activities || []
    } : undefined
  };
};
