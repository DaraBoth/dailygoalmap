
export type NotificationType = 'invitation' | 'removal' | 'member_left' | 'member_joined' | 'task_created' | 'task_deleted' | 'task_updated';

// A type-safe JSON type for Supabase payloads
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface AppNotificationPayload {
  message?: string;
  task_id?: string;
  task_title?: string;
  action?: string;
}

export interface UserProfileLite {
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  goal_id: string | null;
  sender_id: string;
  receiver_id: string;
  payload?: AppNotificationPayload;
  invitation_status?: 'pending' | 'accepted' | 'declined' | null;
  read_at?: string | null;
  created_at: string;
  // enriched client-side
  sender_profile?: UserProfileLite;
}

