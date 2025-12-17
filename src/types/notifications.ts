// Device registration data for tinynotie-api integration
export interface DeviceRegistration {
  deviceId: string;
  userAgent: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      auth?: string;
      p256dh?: string;
    };
  };
  userInfo: string;
}

// Notification payload for tinynotie-api
export interface NotificationPayload {
  title: string;
  body?: string;
  data?: Record<string, any>;
}

// Search result type for the command palette
export interface SearchResult {
  type: "task" | "goal";
  id: string;
  title: string;
  description?: string;
  path: string;
  date?: string;
  goalId?: string;
  completed?: boolean;
  user_profiles?: {
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
    device_id: string | null;
    display_name: string | null;
    id: string;
    model_preference: string | null;
    updated_at: string;
  };
}
