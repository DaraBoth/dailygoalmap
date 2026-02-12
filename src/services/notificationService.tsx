
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { constructNotificationUrl } from "@/utils/urlUtils";
import { toast } from "sonner";
import React from "react";
import { router } from "@/router";

// Unified notification types
export type NotificationType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'invitation'
  | 'member_joined'
  | 'member_left'
  | 'removal';

export interface UnifiedNotificationOptions {
  type: NotificationType;
  goalId: string;
  senderId: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  deepLink?: string;
  showToast?: boolean;
  toastTitle?: string;
  toastDescription?: string | React.ReactNode;
}

/**
 * Unified notification service that sends notifications through all channels:
 * 1. Toast notification (local feedback)
 * 2. Push notification (via tinynotie API)
 * 3. Database notification (in-app notification list)
 */
export async function sendUnifiedNotification(options: UnifiedNotificationOptions): Promise<boolean> {
  const {
    type,
    goalId,
    senderId,
    title,
    body,
    payload = {},
    deepLink,
    showToast = true,
    toastTitle,
    toastDescription
  } = options;

  try {
    // Get current user to check if they're the sender
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isCurrentUserSender = currentUser?.id === senderId;

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', senderId)
      .single();

    // If no display name, fetch email from auth as fallback
    let senderName = senderProfile?.display_name;
    if (!senderName) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(senderId);
      senderName = userData?.user?.email || 'Someone';
    }
    const senderAvatar = senderProfile?.avatar_url;

    // 1. Show toast notification (local feedback) - BUT NOT to the sender
    if (showToast && !isCurrentUserSender) {
      const finalToastTitle = toastTitle || title;
      const finalToastDescription = toastDescription || body;

      toast(finalToastTitle, {
        description: (
          <div className="flex items-center gap-2">
            {senderAvatar && (
              <img
                src={senderAvatar}
                alt={senderName}
                className="w-6 h-6 rounded-full ring-2 ring-white/50 dark:ring-gray-700/50 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm">{finalToastDescription}</div>
              <div className="text-xs text-muted-foreground mt-0.5">by {senderName}</div>
            </div>
          </div>
        ),
        action: deepLink ? {
          label: "View",
          onClick: () => {
            // Extract path and search params from deepLink
            const url = new URL(deepLink, window.location.origin);
            const path = url.pathname;
            const searchParams = Object.fromEntries(url.searchParams);

            // Use router.navigate for SPA navigation without page reload
            router.navigate({
              to: path as any,
              search: searchParams as any
            });
          }
        } : undefined,
      });
    }

    // Prepare notification data
    const notificationData = {
      type,
      goal_id: goalId,
      sender_id: senderId,
      url: deepLink,
      userProfile: senderProfile,
      ...payload
    };

    // 2. Send push notifications to goal members (via tinynotie API)
    const pushResult = await sendNotificationToGoalMembers(
      goalId,
      senderId,
      title,
      body,
      notificationData
    );

    // 3. Store in database (in-app notifications)
    if (type === 'task_created') {
      const { createTaskNotification } = await import('./internalNotifications');
      await createTaskNotification(goalId, senderId, type, { ...payload, url: deepLink });
    } else if (type === 'task_updated' || type === 'task_deleted') {
      const { createTaskUpdateNotification } = await import('./internalNotifications');
      await createTaskUpdateNotification(goalId, senderId, type as 'task_updated', { ...payload, url: deepLink });
    } else if (type === 'member_joined') {
      const { createMemberJoinedNotifications } = await import('./internalNotifications');
      await createMemberJoinedNotifications(goalId, senderId, { ...payload, url: deepLink });
    } else if (type === 'member_left') {
      const { createMemberLeftNotifications } = await import('./internalNotifications');
      await createMemberLeftNotifications(goalId, senderId, { ...payload, url: deepLink });
    }

    console.log(`Unified notification sent successfully: ${type}`);
    return pushResult;
  } catch (error) {
    console.error('Error sending unified notification:', error);
    return false;
  }
}

// Helper functions for common notification scenarios

export async function notifyTaskCreated(
  goalId: string,
  senderId: string,
  taskTitle: string,
  taskId: string,
  goalTitle: string,
  taskDate: string
) {
  const deepLink = `/goal/${goalId}?date=${encodeURIComponent(taskDate)}&taskId=${encodeURIComponent(taskId)}`;

  return sendUnifiedNotification({
    type: 'task_created',
    goalId,
    senderId,
    title: `New task in "${goalTitle}"`,
    body: `${taskTitle} has been added`,
    payload: {
      task_title: taskTitle,
      task_id: taskId,
      goal_title: goalTitle,
      task_date: taskDate
    },
    deepLink,
    toastTitle: '✓ Task Created',
  });
}

export async function notifyTaskUpdated(
  goalId: string,
  senderId: string,
  taskTitle: string,
  taskId: string,
  goalTitle: string,
  taskDate: string,
  action?: 'completed' | 'uncompleted' | 'edited'
) {
  const actionText = action === 'completed' ? 'completed' :
    action === 'uncompleted' ? 'reopened' : 'updated';
  const deepLink = `/goal/${goalId}?date=${encodeURIComponent(taskDate)}&taskId=${encodeURIComponent(taskId)}`;

  return sendUnifiedNotification({
    type: 'task_updated',
    goalId,
    senderId,
    title: `Task ${actionText} in "${goalTitle}"`,
    body: `${taskTitle} has been ${actionText}`,
    payload: {
      task_title: taskTitle,
      task_id: taskId,
      goal_title: goalTitle,
      action: action || 'edited',
      task_date: taskDate
    },
    deepLink,
    toastTitle: action === 'completed' ? '✓ Task Completed' :
      action === 'uncompleted' ? '○ Task Reopened' : '✏ Task Updated',
  });
}

export async function notifyTaskDeleted(
  goalId: string,
  senderId: string,
  taskTitle: string,
  taskId: string,
  goalTitle: string,
  taskDate: string
) {
  const deepLink = `/goal/${goalId}?date=${encodeURIComponent(taskDate)}`;

  return sendUnifiedNotification({
    type: 'task_deleted',
    goalId,
    senderId,
    title: `Task deleted in "${goalTitle}"`,
    body: `${taskTitle} has been deleted`,
    payload: {
      task_title: taskTitle,
      task_id: taskId,
      goal_title: goalTitle,
      task_date: taskDate
    },
    deepLink,
    toastTitle: '🗑 Task Deleted',
  });
}

export async function notifyGoalInvitation(
  goalId: string,
  senderId: string,
  goalTitle: string,
  invitedUserId: string
) {
  const deepLink = `/goal/${goalId}`;

  // For invitations, we send to specific user, not all members
  const { data: senderProfile } = await supabase
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('id', senderId)
    .single();

  // If no display name, fetch email from auth as fallback
  let senderName = senderProfile?.display_name;
  if (!senderName) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(senderId);
    senderName = userData?.user?.email || 'Someone';
  }

  // Push notification
  await sendNotificationToUser(
    invitedUserId,
    `Goal Invitation`,
    `${senderName} invited you to join "${goalTitle}"`,
    {
      type: 'invitation',
      goal_id: goalId,
      sender_id: senderId,
      url: deepLink,
      userProfile: senderProfile,
      goal_title: goalTitle
    }
  );

  // Database notification
  const { sendInvitation } = await import('./internalNotifications');
  await sendInvitation(goalId, invitedUserId, { goal_title: goalTitle, url: deepLink });

  return true;
}

export async function notifyMemberJoined(
  goalId: string,
  memberId: string,
  goalTitle: string
) {
  const deepLink = `/goal/${goalId}`;

  return sendUnifiedNotification({
    type: 'member_joined',
    goalId,
    senderId: memberId,
    title: `New member in "${goalTitle}"`,
    body: `joined the goal`,
    payload: {
      goal_title: goalTitle
    },
    deepLink,
    toastTitle: '👋 Member Joined',
    showToast: false // Usually don't show toast for member joins to the joiner
  });
}

export async function notifyMemberLeft(
  goalId: string,
  memberId: string,
  goalTitle: string
) {
  const deepLink = `/goal/${goalId}`;

  return sendUnifiedNotification({
    type: 'member_left',
    goalId,
    senderId: memberId,
    title: `Member left "${goalTitle}"`,
    body: `left the goal`,
    payload: {
      goal_title: goalTitle
    },
    deepLink,
    toastTitle: '👋 Member Left',
    showToast: false
  });
}

export async function notifyMemberRemoved(
  goalId: string,
  removerId: string,
  removedUserId: string,
  goalTitle: string
) {
  const deepLink = `/goal/${goalId}`;

  const { data: removerProfile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', removerId)
    .single();

  // If no display name, fetch email from auth as fallback
  let removerName = removerProfile?.display_name;
  if (!removerName) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(removerId);
    removerName = userData?.user?.email || 'Someone';
  }

  // Send to the removed user only
  await sendNotificationToUser(
    removedUserId,
    `Removed from goal`,
    `You were removed from "${goalTitle}" by ${removerName}`,
    {
      type: 'removal',
      goal_id: goalId,
      sender_id: removerId,
      url: deepLink,
      goal_title: goalTitle
    }
  );

  // Database notification for removed user
  const { createRemovalNotification } = await import('./internalNotifications');
  await createRemovalNotification(goalId, removedUserId, { goal_title: goalTitle, url: deepLink });

  return true;
}

// Function to send a push notification to a user using tinynotie-api
export async function sendNotificationToUser(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  try {
    // Get user's email from the database
    const { data: userInfo, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userInfo) {
      // Send notification using tinynotie-api
      // Compute a clickable URL to include in the push payload.
      // Prefer an explicit url provided in `data.url`. If it's relative, convert to absolute.
      let fullUrl: string | undefined;
      try {
        // Get the relative path from data.url
        const relativePath = (data?.url as string | undefined);
        if (relativePath) {
          fullUrl = constructNotificationUrl(relativePath);
        }
      } catch (e) {
        // Fallback if something goes wrong
        fullUrl = undefined;
      }

      const response = await fetch('https://tinynotie-api.vercel.app/openai/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: userInfo.user.email, // Use email as identifier
          payload: {
            // Include sender name in title so user knows who did it from device notification
            title: data?.userProfile
              ? `${data.userProfile['display_name']}: ${title || 'Orbit Notification'}`
              : title || 'Orbit Notification',
            body: body || 'You have a new update!',
            data: {
              // Provide an absolute, clickable URL when possible. Also include original data for context.
              url: fullUrl ?? data?.url,
              // Use the task_date if present, else fallback to now
              timestamp: (data && data.task_date) ? `${data.task_date}T00:00:00` : new Date().toISOString(),
              senderName: data?.userProfile ? (data.userProfile['display_name'] as string || userInfo.user.email || 'Unknown') : 'Unknown',
              ...data,
            },
            icon: data?.userProfile ? data.userProfile['avatar_url'] : undefined
          },
          name: data?.userProfile ? data.userProfile['display_name'] : 'Orbit',
          appId: 2
        })
      });

      if (!response.ok) {
        console.error("Error calling tinynotie-api:", response.statusText);
        return false;
      }

      const result = await response.json();
      console.log(`Successfully sent notification to user ${userId}:`, result);
    } else {
      console.log("user is id", userId, " is ", userInfo);

      return false
    }

    return true;
  } catch (error) {
    console.error("Error sending notification to user:", error);
    return false;
  }
}

// Function to send a notification to all members of a goal
export async function sendNotificationToGoalMembers(
  goalId: string,
  exceptUserId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  try {
    console.log(`Sending notification to goal ${goalId} members (except ${exceptUserId})`);

    // Get all members of the goal except the specified user
    const { data: members, error } = await supabase
      .from('goal_members')
      .select('user_id')
      .eq('goal_id', goalId)
      .neq('user_id', exceptUserId);

    const { data: userProfile } = await supabase.from('user_profiles').select('display_name, avatar_url').eq('id', exceptUserId).single();

    // const { data: members, error } = await supabase
    // .from("goal_members")
    // .select(`
    //   user_id,
    //   goals:goals!goal_members_goal_id_fkey (
    //     id,
    //     title,
    //     status
    //   ),
    //   user_profiles:user_profiles!goal_members_user_id_fkey1 (
    //     display_name,
    //     avatar_url
    //   )
    // `)
    // .eq("goal_id", goalId)
    // .neq("user_id", exceptUserId);

    if (error) {
      console.error("Error fetching goal members:", error);
      return false;
    }

    console.log(`Found ${members?.length || 0} members to notify:`, members);

    if (!members || members.length === 0) {
      console.log("No members to notify");
      return false;
    }

    // Send notification to each member
    const results = await Promise.all(
      members.map(member => {
        return sendNotificationToUser(
          member.user_id,
          title,
          body,
          {
            goalId, // Include the goal ID in the notification data
            senderId: exceptUserId, // Include the sender ID
            memberInfo: member,
            userProfile,
            ...data,
          }
        );
      })
    );

    const successCount = results.filter(result => result === true).length;
    console.log(`Successfully sent notifications to ${successCount} out of ${members.length} members`);

    // Return true if at least one notification was sent successfully
    return results.some(result => result === true);
  } catch (error) {
    console.error("Error sending notifications to goal members:", error);
    return false;
  }
}
