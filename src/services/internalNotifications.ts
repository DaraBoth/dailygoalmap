import { supabase } from "@/integrations/supabase/client";
import { AppNotification } from "@/types/notification";

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

export async function sendInvitation(goalId: string, receiverUserId: string, payload?: Record<string, any>): Promise<{ ok: boolean; error?: string }>{
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

  const { error } = await supabase.from("notifications").insert({
    type: "invitation",
    goal_id: goalId,
    sender_id: (await supabase.auth.getUser()).data.user!.id,
    receiver_id: receiverUserId,
    payload: payload ?? {},
    invitation_status: "pending",
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

export async function fetchNotifications(opts: FetchNotificationsOptions = {}): Promise<AppNotification[]> {
  const limit = opts.limit ?? 8;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("receiver_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.before) {
    query = query.lt("created_at", opts.before);
  }
  if (opts.onlyUnread) {
    query = query.is("read_at", null);
  }
  if (opts.onlyInvites) {
    query = query.eq("type", "invitation");
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchNotifications error", error);
    return [];
  }
  const notifications = (data || []) as unknown as AppNotification[];

  // Enrich with sender profile (best-effort, batched)
  const senderIds = Array.from(new Set(notifications.map(n => n.sender_id)));
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url')
      .in('id', senderIds);
    const byId = new Map((profiles || []).map((p: any) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]));
    notifications.forEach(n => { (n as any).sender_profile = byId.get(n.sender_id) || undefined; });
  }

  return notifications;
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

export async function createRemovalNotification(goalId: string, removedUserId: string, payload?: Record<string, any>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("notifications").insert({
    type: "removal",
    goal_id: goalId,
    sender_id: user.id,
    receiver_id: removedUserId,
    payload: payload ?? {},
  });
  if (error) console.error("createRemovalNotification error", error);
}

export async function createMemberLeftNotifications(goalId: string, leaverUserId: string, payload?: Record<string, any>): Promise<void> {
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
  const inserts = (members || []).map((m) => ({
    type: "member_left",
    goal_id: goalId,
    sender_id: leaverUserId,
    receiver_id: m.user_id,
    payload: payload ?? {},
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
  payload?: Record<string, any>
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
    
    // Create notifications for all members except sender
    const notifications = members.map(member => ({
      type,
      goal_id: goalId,
      sender_id: senderUserId,
      receiver_id: member.user_id,
      payload: payload || {}
    }));
    
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
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
  payload?: Record<string, any>
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
    
    // Create notifications for all existing members
    const notifications = members.map(member => ({
      type: 'member_joined' as const,
      goal_id: goalId,
      sender_id: newMemberUserId,
      receiver_id: member.user_id,
      payload: payload || {}
    }));
    
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
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
  payload?: Record<string, any>
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
    
    // Create notifications for all members except sender
    const notifications = members.map(member => ({
      type,
      goal_id: goalId,
      sender_id: senderUserId,
      receiver_id: member.user_id,
      payload: payload || {}
    }));
    
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
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

