
import { supabase } from "@/integrations/supabase/client";
import { Goal, GoalMember, SortOption, GoalMetadata } from "@/types/goal";

/**
 * Utility functions for Supabase database operations
 * This file centralizes database operations to make them more consistent
 */

/**
 * Fetch all goals for the current user
 */
export const fetchUserGoals = async (sortOption: SortOption): Promise<Goal[]> => {
  try {
    // Get the current user's ID
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error("Failed to fetch user information");
    }

    const userId = userData.user.id;

    // Fetch goals the user has joined
    const { data: joinedGoals, error: joinedGoalsError } = await supabase
      .from('goal_members')
      .select('goal_id, goals(*)')
      .eq('user_id', userId);

    if (joinedGoalsError) throw joinedGoalsError;

    // Combine created and joined goals
    const allGoals = [
      ...(joinedGoals?.map((member) => member.goals) || []),
    ];

    // Convert the Supabase data to Goal objects with proper metadata typing
    const typedGoals: Goal[] = (allGoals || []).map(goal => ({
      ...goal,
      metadata: typeof goal.metadata === 'string'
        ? JSON.parse(goal.metadata)
        : (goal.metadata || {
            goal_type: 'general',
            start_date: new Date().toISOString().split('T')[0]
          }) as GoalMetadata,
      taskCounts: { total: 0, completed: 0, incomplete: 0 } // Initialize task counts
    }));

    // Fetch task counts for each goal
    for (const goal of typedGoals) {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id, completed')
        .eq('goal_id', goal.id);

      if (!taskError && taskData) {
        const totalTasks = taskData.length;
        const completedTasks = taskData.filter(task => task.completed).length;

        goal.taskCounts = {
          total: totalTasks,
          completed: completedTasks,
          incomplete: totalTasks - completedTasks
        };
      }
    }

    return typedGoals;
  } catch (error) {
    console.error("Error fetching goals:", error);
    throw error;
  }
};

/**
 * Create a new goal
 */
export const createGoal = async (goalData: Partial<Goal>): Promise<Goal> => {
  try {
    // Ensure required fields are present
    if (!goalData.title || !goalData.user_id) {
      throw new Error("Goal title and user_id are required");
    }

    // Explicitly create an object with the expected structure
    const goalToCreate = {
      title: goalData.title,
      description: goalData.description || '',
      target_date: goalData.target_date || null,
      status: goalData.status || 'active',
      user_id: goalData.user_id,
      metadata: goalData.metadata || {
        goal_type: 'general',
        start_date: new Date().toISOString().split('T')[0]
      }
    };

    const { data, error } = await supabase
      .from('goals')
      .insert(goalToCreate) 
      .select()
      .single();

    if (error) throw error;

    // Add the current user as creator
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("User not authenticated");

    const { error: memberError } = await supabase.rpc(
      'join_goal',
      { 
        p_goal_id: data.id, 
        p_user_id: userData.user.id, 
        p_role: 'creator' 
      }
    );

    if (memberError) throw memberError;

    // Transform the response to match Goal type
    const createdGoal: Goal = {
      ...data,
      metadata: typeof data.metadata === 'string' 
        ? JSON.parse(data.metadata) 
        : (data.metadata || {
            goal_type: 'general',
            start_date: new Date().toISOString().split('T')[0]
          }) as GoalMetadata
    };

    return createdGoal;
  } catch (error) {
    console.error("Error creating goal:", error);
    throw error;
  }
};

/**
 * Update an existing goal
 */
export const updateGoal = async (goalId: string, goalData: Partial<Goal>): Promise<Goal> => {
  try {
    // Ensure required fields are present
    if (!goalId) {
      throw new Error("Goal ID is required for update");
    }

    // Get current user to verify ownership
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("User not authenticated");

    // Get original goal data for comparison
    const { data: originalGoal } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();

    // Prepare the update object
    const goalToUpdate: any = {};

    if (goalData.title !== undefined) goalToUpdate.title = goalData.title;
    if (goalData.description !== undefined) goalToUpdate.description = goalData.description;
    if (goalData.target_date !== undefined) goalToUpdate.target_date = goalData.target_date;
    if (goalData.status !== undefined) goalToUpdate.status = goalData.status;
    if (goalData.metadata !== undefined) goalToUpdate.metadata = goalData.metadata;

    // Always update the updated_at timestamp
    goalToUpdate.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('goals')
      .update(goalToUpdate)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;

    // Send notification for goal updates
    if (originalGoal) {
      try {
        const changes: string[] = [];
        if (goalData.title && goalData.title !== originalGoal.title) changes.push('title');
        if (goalData.description && goalData.description !== originalGoal.description) changes.push('description');
        if (goalData.target_date && goalData.target_date !== originalGoal.target_date) changes.push('target date');
        if (goalData.status && goalData.status !== originalGoal.status) {
          changes.push('status');
          // Check if goal was marked as completed
          if (goalData.status === 'completed') {
            const { notifyGoalCompleted } = await import('@/services/notificationEvents');
            await notifyGoalCompleted(
              goalId,
              userData.user.id,
              data.title
            );
          }
        }

        if (changes.length > 0 && goalData.status !== 'completed') {
          const { notifyGoalUpdated } = await import('@/services/notificationEvents');
          await notifyGoalUpdated(
            goalId,
            userData.user.id,
            data.title,
            changes
          );
        }
      } catch (notifError) {
        console.error('Error sending goal update notification:', notifError);
      }
    }

    // Transform the response to match Goal type
    const updatedGoal: Goal = {
      ...data,
      metadata: typeof data.metadata === 'string'
        ? JSON.parse(data.metadata)
        : (data.metadata || {
            goal_type: 'general',
            start_date: new Date().toISOString().split('T')[0]
          }) as GoalMetadata
    };

    return updatedGoal;
  } catch (error) {
    console.error("Error updating goal:", error);
    throw error;
  }
};

/**
 * Delete a goal
 */
export const deleteGoal = async (goalId: string): Promise<void> => {
  try {
    // First delete tasks to prevent foreign key constraint errors
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('goal_id', goalId);

    if (tasksError) throw tasksError;

    // Then delete the goal
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting goal:", error);
    throw error;
  }
};

/**
 * Fetch members of a goal
 */
export const fetchGoalMembers = async (goalId: string): Promise<GoalMember[]> => {
  try {
    const { data, error } = await supabase.rpc(
      'get_goal_members',
      { p_goal_id: goalId }
    );

    if (error) throw error;

    // Format the members data
    const formattedMembers: GoalMember[] = (data || []).map((member: any) => ({
      id: member.id,
      goal_id: member.goal_id,
      user_id: member.user_id,
      joined_at: member.joined_at,
      role: member.role as 'creator' | 'member',
      user_profile: {
        avatar_url: member.avatar_url,
        display_name: member.display_name || 'User'
      }
    }));

    return formattedMembers;
  } catch (error) {
    console.error("Error fetching goal members:", error);
    throw error;
  }
};

/**
 * Join a goal with a share code
 */
export const joinGoalWithShareCode = async (shareCode: string): Promise<Goal> => {
  try {
    // First, find the goal with this share code
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('share_code', shareCode)
      .single();

    if (goalError) throw new Error("Invalid share code or goal not found");

    // Get the current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("User not authenticated");

    // Check if user is already a member
    const { data: isMember } = await supabase.rpc(
      'check_goal_membership',
      { 
        p_goal_id: goalData.id, 
        p_user_id: userData.user.id 
      }
    );

    if (isMember) throw new Error("You are already a member of this goal");

    // Join the goal
    const { error: joinError } = await supabase.rpc(
      'join_goal',
      { 
        p_goal_id: goalData.id, 
        p_user_id: userData.user.id, 
        p_role: 'member' 
      }
    );

    if (joinError) throw joinError;

    // Send notification that user joined the goal
    try {
      const { notifyGoalMemberJoined } = await import('@/services/notificationEvents');
      await notifyGoalMemberJoined(
        goalData.id,
        userData.user.id,
        goalData.title
      );
    } catch (notifError) {
      console.error('Error sending goal member joined notification:', notifError);
    }

    // Transform the response to match Goal type
    const joinedGoal: Goal = {
      ...goalData,
      metadata: typeof goalData.metadata === 'string' 
        ? JSON.parse(goalData.metadata) 
        : (goalData.metadata || {
            goal_type: 'general',
            start_date: new Date().toISOString().split('T')[0]
          }) as GoalMetadata
    };

    return joinedGoal;
  } catch (error) {
    console.error("Error joining goal:", error);
    throw error;
  }
};

/**
 * Fetch tasks for a goal
 */
export const fetchGoalTasks = async (goalId: string) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }
};

/**
 * Update a task
 */
export const updateTask = async (taskId: string, updates: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get original task data for comparison
    const { data: originalTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !originalTask) {
      throw new Error("Failed to fetch original task data");
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select();

    if (error) throw error;

    // Send notifications for task updates (excluding completion state)
    try {
      const hasContentChanges = 
        (updates.title && updates.title !== originalTask.title) ||
        (updates.description && updates.description !== originalTask.description) ||
        (updates.start_date && updates.start_date !== originalTask.start_date) ||
        (updates.end_date && updates.end_date !== originalTask.end_date) ||
        (updates.daily_start_time && updates.daily_start_time !== originalTask.daily_start_time) ||
        (updates.daily_end_time && updates.daily_end_time !== originalTask.daily_end_time);

      // Check if completion state changed
      const completionChanged = typeof updates.completed !== 'undefined' && 
                               updates.completed !== originalTask.completed;

      if (hasContentChanges) {
        // Task content was updated (title, description, dates, etc.)
        const { notifyTaskUpdated } = await import('@/services/notificationEvents');
        const taskTitle = updates.title || originalTask.title;
        const changedFields = [];
        if (updates.title && updates.title !== originalTask.title) changedFields.push('title');
        if (updates.description && updates.description !== originalTask.description) changedFields.push('description');
        if (updates.start_date && updates.start_date !== originalTask.start_date) changedFields.push('date');
        if (updates.daily_start_time && updates.daily_start_time !== originalTask.daily_start_time) changedFields.push('time');
        
        await notifyTaskUpdated(
          taskId,
          originalTask.goal_id,
          user.id,
          taskTitle,
          changedFields.join(', ')
        );
      }

      if (completionChanged) {
        // Task completion state changed
        if (updates.completed) {
          // Task was completed
          const { notifyTaskCompleted } = await import('@/services/notificationEvents');
          await notifyTaskCompleted(
            taskId,
            originalTask.goal_id,
            user.id,
            updates.title || originalTask.title
          );
        } else {
          // Task was marked incomplete
          const { notifyTaskIncompleted } = await import('@/services/notificationEvents');
          await notifyTaskIncompleted(
            taskId,
            originalTask.goal_id,
            user.id,
            updates.title || originalTask.title
          );
        }
      }
    } catch (notifError) {
      console.error('Error sending task update notifications:', notifError);
      // Don't throw - task update succeeded
    }

    return data?.[0];
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

/**
 * Create a new task
 */
export const insertTask = async (taskData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select();

    if (error) throw error;

    // Send notification for new task creation
    if (data && data[0] && taskData.goal_id) {
      try {
        const { notifyTaskCreated } = await import('@/services/notificationEvents');
        await notifyTaskCreated(
          data[0].id,
          taskData.goal_id,
          user.id,
          taskData.title || 'New Task'
        );
      } catch (notifError) {
        console.error('Error sending task created notification:', notifError);
      }
    }

    return data;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

export const deleteTaskFromDatabase = async (taskId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get task data before deletion for notification
    const { data: taskData } = await supabase
      .from('tasks')
      .select('title, goal_id')
      .eq('id', taskId)
      .single();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    // Send notification for task deletion
    if (taskData) {
      try {
        const { notifyTaskDeleted } = await import('@/services/notificationEvents');
        await notifyTaskDeleted(
          taskData.title || 'Task',
          taskData.goal_id,
          user.id
        );
      } catch (notifError) {
        console.error('Error sending task deleted notification:', notifError);
      }
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};
