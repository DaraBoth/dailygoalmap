import { supabase } from '@/integrations/supabase/client';

export interface GoalAccessResult {
  hasAccess: boolean;
  isPublic: boolean;
  goalExists: boolean;
  error?: string;
}

/**
 * Check if a user has access to a specific goal
 * @param goalId - The ID of the goal to check
 * @param userId - The ID of the user (optional, if not provided, checks for public access only)
 * @returns Promise<GoalAccessResult>
 */
export const checkGoalAccess = async (
  goalId: string, 
  userId?: string
): Promise<GoalAccessResult> => {
  try {
    // First, check if the goal exists and get its public status
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .select('id, is_public, title')
      .eq('id', goalId)
      .single();

    if (goalError) {
      if (goalError.code === 'PGRST116') {
        // Goal not found
        return {
          hasAccess: false,
          isPublic: false,
          goalExists: false,
          error: 'Goal not found'
        };
      }
      throw goalError;
    }

    const isPublic = goalData.is_public;

    // If goal is public, allow access regardless of authentication
    if (isPublic) {
      return {
        hasAccess: true,
        isPublic: true,
        goalExists: true
      };
    }

    // Goal is private, check if user is provided and has access
    if (!userId) {
      return {
        hasAccess: false,
        isPublic: false,
        goalExists: true,
        error: 'Authentication required for private goals'
      };
    }

    // Check if user has access to the private goal
    const { data: membershipData, error: membershipError } = await supabase
      .rpc('user_is_goal_member', { p_goal_id: goalId });

    if (membershipError) {
      throw membershipError;
    }

    const hasAccess = membershipData === true;

    return {
      hasAccess,
      isPublic: false,
      goalExists: true,
      error: hasAccess ? undefined : 'You do not have access to this private goal'
    };

  } catch (error: any) {
    console.error('Error checking goal access:', error);
    return {
      hasAccess: false,
      isPublic: false,
      goalExists: false,
      error: error.message || 'Failed to check goal access'
    };
  }
};

/**
 * Get the current authenticated user ID
 * @returns Promise<string | null>
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user?.id || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Check if the current user has access to a goal
 * @param goalId - The ID of the goal to check
 * @returns Promise<GoalAccessResult>
 */
export const checkCurrentUserGoalAccess = async (goalId: string): Promise<GoalAccessResult> => {
  const userId = await getCurrentUserId();
  return checkGoalAccess(goalId, userId || undefined);
};
