export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          key_name: string
          key_type: string
          key_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          key_name: string
          key_type: string
          key_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          key_name?: string
          key_type?: string
          key_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_memory: {
        Row: {
          created_at: string | null
          expires_at: string | null
          goal_id: string | null
          id: string
          memory_key: string
          memory_type: string
          memory_value: Json
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          goal_id?: string | null
          id?: string
          memory_key: string
          memory_type: string
          memory_value: Json
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          goal_id?: string | null
          id?: string
          memory_key?: string
          memory_type?: string
          memory_value?: Json
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_memory_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_members: {
        Row: {
          goal_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          goal_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          goal_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_members_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_members_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_themes: {
        Row: {
          card_background_image: string | null
          created_at: string | null
          goal_profile_image: string | null
          id: string
          is_public: boolean | null
          name: string
          page_background_image: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_background_image?: string | null
          created_at?: string | null
          goal_profile_image?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          page_background_image?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_background_image?: string | null
          created_at?: string | null
          goal_profile_image?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          page_background_image?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          metadata: Json | null
          public_slug: string | null
          share_code: string | null
          status: string | null
          target_date: string | null
          theme_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json | null
          public_slug?: string | null
          share_code?: string | null
          status?: string | null
          target_date?: string | null
          theme_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json | null
          public_slug?: string | null
          share_code?: string | null
          status?: string | null
          target_date?: string | null
          theme_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "goal_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          date: string | null
          goal_id: string | null
          id: string
          invitation_status: string | null
          payload: Json | null
          read_at: string | null
          receiver_id: string
          sender_id: string
          type: string
          url: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          goal_id?: string | null
          id?: string
          invitation_status?: string | null
          payload?: Json | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
          type: string
          url?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          goal_id?: string | null
          id?: string
          invitation_status?: string | null
          payload?: Json | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          identifier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rag_chunks: {
        Row: {
          chunk_index: number | null
          content: string | null
          created_at: string | null
          embedding: string | null
          end_pos: number | null
          filename: string | null
          id: string
          metadata: Json | null
          start_pos: number | null
        }
        Insert: {
          chunk_index?: number | null
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          end_pos?: number | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          start_pos?: number | null
        }
        Update: {
          chunk_index?: number | null
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          end_pos?: number | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          start_pos?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          created_at: string
          daily_end_time: string | null
          daily_start_time: string | null
          description: string | null
          end_date: string | null
          goal_id: string
          id: string
          start_date: string | null
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          description?: string | null
          end_date?: string | null
          goal_id: string
          id?: string
          start_date?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          description?: string | null
          end_date?: string | null
          goal_id?: string
          id?: string
          start_date?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          device_id: string | null
          display_name: string | null
          id: string
          model_preference: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          device_id?: string | null
          display_name?: string | null
          id: string
          model_preference?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          device_id?: string | null
          display_name?: string | null
          id?: string
          model_preference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_goal_membership: {
        Args: { p_goal_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_conversation_memory: { Args: never; Returns: undefined }
      delete_push_subscription: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      generate_public_slug: { Args: { p_goal_id: string }; Returns: string }
      get_enriched_notifications: {
        Args: {
          p_before?: string
          p_limit?: number
          p_only_invites?: boolean
          p_only_unread?: boolean
          p_user_id: string
        }
        Returns: {
          created_at: string
          goal_id: string
          goal_status: string
          goal_title: string
          id: string
          invitation_status: string
          is_member: boolean
          payload: Json
          read_at: string
          receiver_id: string
          sender_avatar_url: string
          sender_display_name: string
          sender_id: string
          type: string
          url: string
        }[]
      }
      get_goal_members: {
        Args: { p_goal_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          goal_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_user_device_id: { Args: { user_id_param: string }; Returns: string }
      get_user_push_subscription: {
        Args: { user_id_param: string }
        Returns: string
      }
      has_device_id: { Args: { user_id_param: string }; Returns: boolean }
      is_goal_creator:
        | { Args: { p_goal_id: string }; Returns: boolean }
        | { Args: { p_goal_id: string; p_user_id: string }; Returns: boolean }
      join_goal: {
        Args: { p_goal_id: string; p_role: string; p_user_id: string }
        Returns: undefined
      }
      regenerate_goal_share_code: {
        Args: { p_goal_id: string }
        Returns: string
      }
      remove_goal_member: { Args: { p_member_id: string }; Returns: undefined }
      search_users: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          id: string
        }[]
      }
      search_users_profile: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          id: string
        }[]
      }
      toggle_goal_public: {
        Args: { p_goal_id: string; p_is_public: boolean }
        Returns: boolean
      }
      update_user_device_id: {
        Args: { device_id_param: string; user_id_param: string }
        Returns: undefined
      }
      upsert_push_subscription: {
        Args: { subscription_param: string; user_id_param: string }
        Returns: undefined
      }
      user_is_goal_member: { Args: { p_goal_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
