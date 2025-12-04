/**
 * Comprehensive Notification System
 * Handles all notification events for tasks, goals, and goal memberships
 */

import { supabase } from "@/integrations/supabase/client";
import { sendNotificationToGoalMembers, sendNotificationToUser } from "./notificationService";

// ==================== TASK NOTIFICATIONS ====================

/**
 * Send notification when a task is completed
 */
export async function notifyTaskCompleted(
  taskId: string,
  goalId: string,
  userId: string,
  taskTitle: string
): Promise<void> {
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    const displayName = userProfile?.display_name || 'Someone';

    await sendNotificationToGoalMembers(
      goalId,
      userId,
      `Task completed: ${taskTitle}`,
      `${displayName} marked "${taskTitle}" as complete`,
      {
        type: 'task_completed',
        taskId,
        goalId,
        url: `/goal/${goalId}?task=${taskId}`,
      }
    );
  } catch (error) {
    console.error('Error sending task completed notification:', error);
  }
}

/**
 * Send notification when a task is marked as incomplete
 */
export async function notifyTaskIncompleted(
  taskId: string,
  goalId: string,
  userId: string,
  taskTitle: string
): Promise<void> {
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    const displayName = userProfile?.display_name || 'Someone';

    await sendNotificationToGoalMembers(
      goalId,
      userId,
      `Task reopened: ${taskTitle}`,
      `${displayName} marked "${taskTitle}" as incomplete`,
      {
        type: 'task_incompleted',
        taskId,
        goalId,
        url: `/goal/${goalId}?task=${taskId}`,
      }
    );
  } catch (error) {
    console.error('Error sending task incompleted notification:', error);
  }
}

/**
 * Send notification when a task is updated
 */
export async function notifyTaskUpdated(
  taskId: string,
  goalId: string,
  userId: string,
  taskTitle: string,
  updateType?: string // e.g., 'description', 'date', 'title'
): Promise<void> {
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    const displayName = userProfile?.display_name || 'Someone';
    const changeText = updateType ? ` (${updateType} changed)` : '';

    await sendNotificationToGoalMembers(
      goalId,
      userId,
      `Task updated: ${taskTitle}`,
      `${displayName} updated "${taskTitle}"${changeText}`,
      {
        type: 'task_updated',
        taskId,
        goalId,
        updateType,
        url: `/goal/${goalId}?task=${taskId}`,
      }
    );
  } catch (error) {
    console.error('Error sending task updated notification:', error);
  }
}

/**
 * Send notification when a task is deleted
 */
export async function notifyTaskDeleted(
  taskTitle: string,
  goalId: string,
  userId: string
): Promise<void> {
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    const displayName = userProfile?.display_name || 'Someone';

    await sendNotificationToGoalMembers(
      goalId,
      userId,
      `Task deleted: ${taskTitle}`,
      `${displayName} deleted "${taskTitle}"`,
      {
        type: 'task_deleted',
        goalId,
        url: `/goal/${goalId}`,
      }
    );
  } catch (error) {
    console.error('Error sending task deleted notification:', error);
  }
}

/**
 * Send notification when a new task is created
 */
export async function notifyTaskCreated(
  taskId: string,
  goalId: string,
  userId: string,
  taskTitle: string
): Promise<void> {
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    const displayName = userProfile?.display_name || 'Someone';

    await sendNotificationToGoalMembers(
      goalId,
      userId,
      `New task: ${taskTitle}`,
      `${displayName} created a new task "${taskTitle}"`,
      {
        type: 'task_created',
        taskId,
        goalId,
        url: `/goal/${goalId}?task=${taskId}`,
      }
    );
  } catch (error) {
    console.error('Error sending task created notification:', error);
  }
}

// ==================== GOAL NOTIFICATIONS ====================

/**
 * Send notification when a goal is updated
 */
export async function notifyGoalUpdated(
  goalId: string,
  userId: string,
  goalTitle: string,
  changes: string[] // e.g., ['title', 'description', 'target_date']
): Promise<void> {
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    const displayName = userProfile?.display_name || 'Someone';
    const changesText = changes.length > 0 ? ` (${changes.join(', ')} updated)` : '';

    await sendNotificationToGoalMembers(
      goalId,
      userId,
      `Goal updated: ${goalTitle}`,
      `${displayName} updated the goal "${goalTitle}"${changesText}`,
      {
        type: 'goal_updated',
        goalId,
        changes,
        url: `/goal/${goalId}`,
      }
    );
  } catch (error) {
    console.error('Error sending goal updated notification:', error);
  }
}

/**
 * Send notification when a goal is completed
 */
export async function notifyGoalCompleted(
  goalId: string,
  userId: string,
  goalTitle: string
): Promise<void> {
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    const displayName = userProfile?.display_name || 'Someone';

    await sendNotificationToGoalMembers(
      goalId,
      userId,
      `Goal completed! 🎉`,
      `${displayName} marked "${goalTitle}" as complete! Great work team!`,
      {
        type: 'goal_completed',
        goalId,
        url: `/goal/${goalId}`,
      }
    );
  } catch (error) {
    console.error('Error sending goal completed notification:', error);
  }
}

// ==================== GOAL MEMBERSHIP NOTIFICATIONS ====================

/**
 * Send notification when user is invited to a goal
 */
export async function notifyGoalInvitation(
  goalId: string,
  invitedUserId: string,
  inviterUserId: string,
  goalTitle: string
): Promise<void> {
  try {
    const { data: inviterProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', inviterUserId)
      .single();

    const inviterName = inviterProfile?.display_name || 'Someone';

    await sendNotificationToUser(
      invitedUserId,
      `Invitation to join goal`,
      `${inviterName} invited you to join "${goalTitle}"`,
      {
        type: 'goal_invitation',
        goalId,
        inviterId: inviterUserId,
        url: `/goal/${goalId}`,
        userProfile: inviterProfile,
      }
    );
  } catch (error) {
    console.error('Error sending goal invitation notification:', error);
  }
}

/**
 * Send notification when user is removed from a goal
 */
export async function notifyGoalRemoval(
  goalId: string,
  removedUserId: string,
  removerUserId: string,
  goalTitle: string
): Promise<void> {
  try {
    const { data: removerProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', removerUserId)
      .single();

    const removerName = removerProfile?.display_name || 'Someone';

    await sendNotificationToUser(
      removedUserId,
      `Removed from goal`,
      `${removerName} removed you from "${goalTitle}"`,
      {
        type: 'goal_removal',
        goalId,
        removerId: removerUserId,
        url: `/dashboard`,
        userProfile: removerProfile,
      }
    );
  } catch (error) {
    console.error('Error sending goal removal notification:', error);
  }
}

/**
 * Send notification when a new user joins a goal
 */
export async function notifyGoalMemberJoined(
  goalId: string,
  newMemberId: string,
  goalTitle: string
): Promise<void> {
  try {
    const { data: newMemberProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', newMemberId)
      .single();

    const memberName = newMemberProfile?.display_name || 'Someone';

    await sendNotificationToGoalMembers(
      goalId,
      newMemberId,
      `New member joined`,
      `${memberName} joined "${goalTitle}"`,
      {
        type: 'goal_member_joined',
        goalId,
        newMemberId,
        url: `/goal/${goalId}`,
        userProfile: newMemberProfile,
      }
    );
  } catch (error) {
    console.error('Error sending goal member joined notification:', error);
  }
}

/**
 * Send notification when a user accepts a goal invitation
 */
export async function notifyGoalInvitationAccepted(
  goalId: string,
  acceptedUserId: string,
  inviterUserId: string,
  goalTitle: string
): Promise<void> {
  try {
    const { data: acceptedUserProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', acceptedUserId)
      .single();

    const userName = acceptedUserProfile?.display_name || 'Someone';

    // Notify the inviter
    await sendNotificationToUser(
      inviterUserId,
      `Invitation accepted`,
      `${userName} accepted your invitation to "${goalTitle}"`,
      {
        type: 'goal_invitation_accepted',
        goalId,
        acceptedUserId,
        url: `/goal/${goalId}`,
        userProfile: acceptedUserProfile,
      }
    );

    // Notify other members
    await notifyGoalMemberJoined(goalId, acceptedUserId, goalTitle);
  } catch (error) {
    console.error('Error sending goal invitation accepted notification:', error);
  }
}

/**
 * Send notification when a user declines a goal invitation
 */
export async function notifyGoalInvitationDeclined(
  goalId: string,
  declinedUserId: string,
  inviterUserId: string,
  goalTitle: string
): Promise<void> {
  try {
    const { data: declinedUserProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', declinedUserId)
      .single();

    const userName = declinedUserProfile?.display_name || 'Someone';

    await sendNotificationToUser(
      inviterUserId,
      `Invitation declined`,
      `${userName} declined your invitation to "${goalTitle}"`,
      {
        type: 'goal_invitation_declined',
        goalId,
        declinedUserId,
        url: `/goal/${goalId}`,
        userProfile: declinedUserProfile,
      }
    );
  } catch (error) {
    console.error('Error sending goal invitation declined notification:', error);
  }
}

/**
 * Send notification when a user leaves a goal
 */
export async function notifyGoalMemberLeft(
  goalId: string,
  leftUserId: string,
  goalTitle: string
): Promise<void> {
  try {
    const { data: leftUserProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', leftUserId)
      .single();

    const userName = leftUserProfile?.display_name || 'Someone';

    await sendNotificationToGoalMembers(
      goalId,
      leftUserId,
      `Member left`,
      `${userName} left "${goalTitle}"`,
      {
        type: 'goal_member_left',
        goalId,
        leftUserId,
        url: `/goal/${goalId}`,
        userProfile: leftUserProfile,
      }
    );
  } catch (error) {
    console.error('Error sending goal member left notification:', error);
  }
}
