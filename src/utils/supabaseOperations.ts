import { supabase } from "@/integrations/supabase/client";
import { Goal, GoalMember, SortOption, GoalMetadata } from "@/types/goal";
import { saveTaskForOfflineSync, attemptSyncNow } from '@/pwa/offlineTaskSync';

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

    // Fetch goals created by the user
    const { data: createdGoals, error: createdGoalsError } = await supabase
      .from('goals')
      .select(`
        *,
        goal_themes(*)
      `)
      .eq('user_id', userId);

    if (createdGoalsError) throw createdGoalsError;

    // Fetch goals the user has joined
    const { data: joinedGoals, error: joinedGoalsError } = await supabase
      .from('goal_members')
      .select('goal_id, goals(*,goal_themes(*))')
      .eq('user_id', userId);

    if (joinedGoalsError) throw joinedGoalsError;

    // Combine created and joined goals, avoiding duplicates
    const joinedGoalsList = (
      joinedGoals?.map((member) => member.goals) || []
    ).filter(Boolean);
    const createdGoalsList = createdGoals || [];

    // Remove duplicates by filtering out joined goals that are already in created goals
    const uniqueJoinedGoals = joinedGoalsList.filter(
      (joinedGoal) =>
        joinedGoal &&
        !createdGoalsList.some(
          (createdGoal) => createdGoal.id === joinedGoal.id
        )
    );

    const allGoals = [...createdGoalsList, ...uniqueJoinedGoals];

    // Convert the Supabase data to Goal objects with proper metadata typing
    const typedGoals: Goal[] = (allGoals || []).map(goal => ({
      ...goal,
      metadata: typeof goal.metadata === 'string'
        ? JSON.parse(goal.metadata)
        : (goal.metadata || {
            goal_type: 'general',
            start_date: new Date().toISOString().split('T')[0]
          }) as GoalMetadata,
      taskCounts: { total: 0, completed: 0, incomplete: 0 }, // Initialize task counts
      memberCounts: { total: 0 }, // Initialize member counts
      members: []
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

      // Fetch member counts
      const { data: memberData, error: memberError } = await supabase
        .from('goal_members')
        .select('id')
        .eq('goal_id', goal.id);

      if (!memberError && memberData) {
        goal.memberCounts = {
          total: memberData.length
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
    if (!navigator.onLine) {
      saveTaskForOfflineSync({ id: taskId, ...updates }, 'update');
      return { offline: true, taskId, updates };
    }

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

    // Send notifications for task content updates (not just completion)
    try {
      const hasContentChanges = 
        (updates.title && updates.title !== originalTask.title) ||
        (updates.description && updates.description !== originalTask.description) ||
        (updates.start_date && updates.start_date !== originalTask.start_date) ||
        (updates.end_date && updates.end_date !== originalTask.end_date);

      const hasCompletionChange = 
        updates.completed !== undefined && updates.completed !== originalTask.completed;

      if (hasContentChanges || hasCompletionChange) {
        const { notifyTaskUpdated } = await import('@/services/notificationService');
        
        // Get goal information
        const { data: goalData } = await supabase
          .from('goals')
          .select('*')
          .eq('id', originalTask.goal_id)
          .single();

        const goalTitle = goalData?.title || 'your goal';
        
        // Determine the action
        let action: 'completed' | 'uncompleted' | 'edited';
        if (hasCompletionChange) {
          action = updates.completed ? 'completed' : 'uncompleted';
        } else {
          action = 'edited';
        }
        
        await notifyTaskUpdated(
          originalTask.goal_id,
          user.id,
          originalTask.title,
          taskId,
          goalTitle,
          updates.start_date || originalTask.start_date,
          action
        );
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
    // Check if offline
    if (!navigator.onLine) {
      saveTaskForOfflineSync(taskData, 'create');
      return { offline: true, taskData };
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select();

    if (error) throw error;

    // Send notifications for new task creation
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data && data[0]) {
        const newTask = data[0];
        const { notifyTaskCreated } = await import('@/services/notificationService');
        
        // Get goal information
        const { data: goalData } = await supabase
          .from('goals')
          .select('*')
          .eq('id', newTask.goal_id)
          .single();

        const goalTitle = goalData?.title || 'your goal';
        
        await notifyTaskCreated(
          newTask.goal_id,
          user.id,
          newTask.title || 'A new task',
          newTask.id,
          goalTitle,
          newTask.start_date
        );
      }
    } catch (notifError) {
      console.error('Error sending task creation notifications:', notifError);
      // Don't throw - task creation succeeded
    }

    return data;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

export const deleteTaskFromDatabase = async (taskId: string): Promise<void> => {
  try {
    if (!navigator.onLine) {
      saveTaskForOfflineSync({ id: taskId }, 'delete');
      return;
    }

    // Get task data before deletion for notification
    const { data: taskData, error: fetchError } = await supabase
      .from('tasks')
      .select('*, goals(*)')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      console.error('Error fetching task for deletion:', fetchError);
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    // Send notifications for task deletion
    if (taskData) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { notifyTaskDeleted } = await import('@/services/notificationService');
          
          const goalTitle = taskData.goals?.title || 'your goal';

          await notifyTaskDeleted(
            taskData.goal_id,
            user.id,
            taskData.title || 'A task',
            taskId,
            goalTitle,
            taskData.start_date
          );
        }
      } catch (notifError) {
        console.error('Error sending task deletion notifications:', notifError);
        // Don't throw - task deletion succeeded
      }
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};
