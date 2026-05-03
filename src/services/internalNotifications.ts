import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { AppNotification } from "@/types/notification";
import { constructNotificationUrl } from "@/utils/urlUtils";

export interface SearchUser {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export type InvitationDecision = "accepted" | "declined";

export async function searchUsers(query: string, limit = 8): Promise<SearchUser[]> {
  if (!query.trim()) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Use RPC search_users_profile to search by display_name or email and exclude self
  const { data, error } = await supabase.rpc('search_users_profile', { p_query: query, p_limit: limit });
  if (error) {
    console.error('search_users_profile rpc error', error);
    return [];
  }
  const results = (data || []) as SearchUser[];
  // Safety: exclude self in case DB function changes later
  return results.filter((u) => u.id !== user.id).slice(0, limit);
}

export async function sendInvitation(goalId: string, receiverUserId: string, payload?: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>{
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Prevent duplicate pending invitation (client-side guard; DB also enforces via partial unique index)
  const { data: existing, error: existErr } = await supabase
    .from("notifications")
    .select("id")
    .eq("type", "invitation")
    .eq("goal_id", goalId)
    .eq("receiver_id", receiverUserId)
    .is("read_at", null)
    .eq("invitation_status", "pending")
    .limit(1);
  if (!existErr && existing && existing.length > 0) {
    return { ok: false, error: "User already has a pending invitation" };
  }

  // Compute URL if present in payload using utility function
  const computedUrl = constructNotificationUrl(payload?.url as string | undefined);

    const { error } = await supabase.from("notifications").insert({
      type: "invitation",
      goal_id: goalId,
      sender_id: (await supabase.auth.getUser()).data.user!.id,
      receiver_id: receiverUserId,
      payload: payload as import("@/types/notification").Json ?? {},
      invitation_status: "pending",
      url: computedUrl,
    });
  if (error) {
    console.error("Failed to insert invitation notification", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export interface FetchNotificationsOptions {
  limit?: number;
  before?: string; // ISO timestamp for keyset pagination (created_at)
  onlyUnread?: boolean;
  onlyInvites?: boolean;
}

// Notification cache management - now supports separate caches per filter
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

interface NotificationCache {
  notifications: import("@/types/notification").EnrichedNotification[];
  timestamp: number;
}

function getCacheKey(onlyUnread?: boolean, onlyInvites?: boolean): string {
  if (onlyInvites) return 'notifications_cache_invites';
  if (onlyUnread) return 'notifications_cache_unread';
  return 'notifications_cache_all';
}

function getCachedNotifications(onlyUnread?: boolean, onlyInvites?: boolean): import("@/types/notification").EnrichedNotification[] | null {
  try {
    const cacheKey = getCacheKey(onlyUnread, onlyInvites);
    const timestampKey = `${cacheKey}_timestamp`;
    
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);
    if (!cached || !timestamp) return null;
    
    const cacheAge = Date.now() - parseInt(timestamp);
    if (cacheAge > CACHE_DURATION) {
      // Cache expired
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(timestampKey);
      return null;
    }
    
    return JSON.parse(cached) as import("@/types/notification").EnrichedNotification[];
  } catch (e) {
    console.error('Failed to read notification cache', e);
    return null;
  }
}

function setCachedNotifications(notifications: import("@/types/notification").EnrichedNotification[], onlyUnread?: boolean, onlyInvites?: boolean): void {
  try {
    const cacheKey = getCacheKey(onlyUnread, onlyInvites);
    const timestampKey = `${cacheKey}_timestamp`;
    
    localStorage.setItem(cacheKey, JSON.stringify(notifications));
    localStorage.setItem(timestampKey, Date.now().toString());
  } catch (e) {
    console.error('Failed to cache notifications', e);
  }
}

export function clearNotificationCache(): void {
  // Clear all cache variants
  ['notifications_cache_all', 'notifications_cache_unread', 'notifications_cache_invites'].forEach(key => {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_timestamp`);
  });
}

export async function fetchNotifications(opts: FetchNotificationsOptions = {}): Promise<AppNotification[]> {
  const limit = opts.limit ?? 15;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Use the new enriched RPC function
  const { data, error } = await supabase.rpc('get_enriched_notifications', {
    p_user_id: user.id,
    p_limit: limit,
    p_before: opts.before || null,
    p_only_unread: opts.onlyUnread || false,
    p_only_invites: opts.onlyInvites || false
  });

  if (error) {
    console.error("fetchNotifications error", error);
    return [];
  }

  const enrichedNotifications = (data || []) as import("@/types/notification").EnrichedNotification[];

  // Convert enriched notifications to AppNotification format
  const notifications: AppNotification[] = enrichedNotifications.map(n => ({
    id: n.id,
    type: n.type,
    goal_id: n.goal_id,
    sender_id: n.sender_id,
    receiver_id: n.receiver_id,
    payload: n.payload,
    invitation_status: n.invitation_status,
    read_at: n.read_at,
    created_at: n.created_at,
    sender_profile: {
      display_name: n.sender_display_name,
      avatar_url: n.sender_avatar_url
    }
  }));

  // Cache the enriched notifications for first page only
  if (!opts.before) {
    setCachedNotifications(enrichedNotifications, opts.onlyUnread, opts.onlyInvites);
  }

  return notifications;
}

// New function to fetch with cache-first strategy
export async function fetchNotificationsWithCache(opts: FetchNotificationsOptions = {}): Promise<{
  notifications: AppNotification[];
  fromCache: boolean;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], fromCache: false };

  // If this is the first page and we have cache, return it immediately
  if (!opts.before) {
    const cached = getCachedNotifications(opts.onlyUnread, opts.onlyInvites);
    if (cached && cached.length > 0) {
      const notifications: AppNotification[] = cached.map(n => ({
        id: n.id,
        type: n.type,
        goal_id: n.goal_id,
        sender_id: n.sender_id,
        receiver_id: n.receiver_id,
        payload: n.payload,
        invitation_status: n.invitation_status,
        read_at: n.read_at,
        created_at: n.created_at,
        sender_profile: {
          display_name: n.sender_display_name,
          avatar_url: n.sender_avatar_url
        }
      }));
      
      // Fetch fresh data in background to update cache
      fetchNotifications(opts).catch(console.error);
      
      return { notifications, fromCache: true };
    }
  }

  // No cache or pagination request, fetch fresh data
  const notifications = await fetchNotifications(opts);
  return { notifications, fromCache: false };
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", notificationIds);
  if (error) console.error("markNotificationsRead error", error);
}

export async function updateInvitationStatus(notificationId: string, decision: InvitationDecision): Promise<{ ok: boolean; error?: string }>{
  const { error } = await supabase
    .from("notifications")
    .update({ invitation_status: decision, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("type", "invitation");
  if (error) {
    console.error("updateInvitationStatus error", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function createRemovalNotification(goalId: string, removedUserId: string, payload?: Record<string, unknown>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const computedUrl = constructNotificationUrl(payload?.url as string | undefined);

    const { error } = await supabase.from("notifications").insert({
      type: "removal",
      goal_id: goalId,
      sender_id: user.id,
      receiver_id: removedUserId,
      payload: payload as import("@/types/notification").Json ?? {},
      url: computedUrl,
    });
  if (error) console.error("createRemovalNotification error", error);
}

export async function createMemberLeftNotifications(goalId: string, leaverUserId: string, payload?: Record<string, unknown>): Promise<void> {
  // Notify all remaining members except the leaver
  const { data: members, error } = await supabase
    .from("goal_members")
    .select("user_id")
    .eq("goal_id", goalId)
    .neq("user_id", leaverUserId);
  if (error) {
    console.error("fetch goal members for member_left notifications error", error);
    return;
  }
  const computedUrl = constructNotificationUrl(payload?.url as string | undefined);

  const inserts = (members || []).map((m) => ({
    type: "member_left",
    goal_id: goalId,
    sender_id: leaverUserId,
    receiver_id: m.user_id,
      payload: payload as import("@/types/notification").Json ?? {},
    url: computedUrl,
  }));
  if (inserts.length === 0) return;
  const { error: insertErr } = await supabase.from("notifications").insert(inserts);
  if (insertErr) console.error("createMemberLeftNotifications error", insertErr);
}

export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .is("read_at", null);
  if (error) {
    console.error("getUnreadCount error", error);
    return 0;
  }
  return count || 0;
}

// Function to create task-related notifications
export async function createTaskNotification(
  goalId: string,
  senderUserId: string,
  type: 'task_created' | 'task_deleted',
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    // Get all goal members except the sender
    const { data: members, error } = await supabase
      .from('goal_members')
      .select('user_id')
      .eq('goal_id', goalId)
      .neq('user_id', senderUserId);
    
    if (error || !members) {
      console.error("Error fetching goal members:", error);
      return;
    }
    
    const computedUrl = constructNotificationUrl(payload?.url as string | undefined);

    // Create notifications for all members except sender
    const notifications = members.map(member => ({
      type,
      goal_id: goalId,
      sender_id: senderUserId,
      receiver_id: member.user_id,
        payload: (payload || {}) as import("@/types/notification").Json,
      url: computedUrl,
    }));
    
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);
      
      if (insertError) {
        console.error("Error creating task notifications:", insertError);
      }
    }
  } catch (error) {
    console.error("Failed to create task notifications:", error);
  }
}

// Function to create member joined notification
export async function createMemberJoinedNotifications(
  goalId: string,
  newMemberUserId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    // Get all existing members except the new member
    const { data: members, error } = await supabase
      .from('goal_members')
      .select('user_id')
      .eq('goal_id', goalId)
      .neq('user_id', newMemberUserId);
    
    if (error || !members) {
      console.error("Error fetching goal members:", error);
      return;
    }
    
    const computedUrl = constructNotificationUrl(payload?.url as string | undefined);

    // Create notifications for all existing members
    const notifications = members.map(member => ({
      type: 'member_joined' as const,
      goal_id: goalId,
      sender_id: newMemberUserId,
      receiver_id: member.user_id,
      payload: (payload || {}) as import("@/types/notification").Json,
      url: computedUrl,
    }));
    
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);
      
      if (insertError) {
        console.error("Error creating member joined notifications:", insertError);
      }
    }
  } catch (error) {
    console.error("Failed to create member joined notifications:", error);
  }
}

// Function to create task update notifications
export async function createTaskUpdateNotification(
  goalId: string,
  senderUserId: string,
  type: 'task_updated',
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    // Get all goal members except the sender
    const { data: members, error } = await supabase
      .from('goal_members')
      .select('user_id')
      .eq('goal_id', goalId)
      .neq('user_id', senderUserId);
    
    if (error || !members) {
      console.error("Error fetching goal members:", error);
      return;
    }
    
    const computedUrl = constructNotificationUrl(payload?.url as string | undefined);

    // Create notifications for all members except sender
    const notifications = members.map(member => {
      // Use the task_date from payload if present, else fallback to today
      const payloadTyped = payload as Record<string, unknown> | undefined;
      const notificationDate = (payloadTyped && typeof payloadTyped.task_date === 'string') 
        ? payloadTyped.task_date 
        : new Date().toISOString().split('T')[0];
      return {
        type,
        goal_id: goalId,
        sender_id: senderUserId,
        receiver_id: member.user_id,
          payload: (payload || {}) as import("@/types/notification").Json,
        url: computedUrl,
        date: notificationDate // Store the task's date for notification
      };
    });
    
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);
      
      if (insertError) {
        console.error("Error creating task update notifications:", insertError);
      }
    }
  } catch (error) {
    console.error("Failed to create task update notifications:", error);
  }
}

export async function createAiCompletionNotification(
  goalId: string,
  userId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    const computedUrl = constructNotificationUrl(`/goal/${goalId}`);
    const finalPayload = {
      action: 'ai_completed',
      goal_id: goalId,
      message: payload?.message || 'Goal AI finished your request.',
      ...(payload || {}),
    } as import("@/types/notification").Json;

    const { error } = await supabase.from('notifications').insert({
      type: 'task_updated',
      goal_id: goalId,
      sender_id: userId,
      receiver_id: userId,
      payload: finalPayload,
      url: computedUrl,
    });

    if (error) {
      console.error('createAiCompletionNotification error', error);
    }
  } catch (error) {
    console.error('Failed to create AI completion notification:', error);
  }
}

