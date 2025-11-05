export interface GoalTheme {
  id: string;
  user_id: string;
  name: string;
  goal_profile_image?: string;
  card_background_image?: string;
  page_background_image?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateThemePayload {
  name: string;
  goal_profile_image?: string;
  card_background_image?: string;
  page_background_image?: string;
  is_default?: boolean;
}
