
export type ChatStage = "collecting" | "confirming" | "complete";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface TravelDetails {
  destination?: string;
  start_date?: string;
  end_date?: string;
  budget?: string;
  accommodation?: string;
  transportation?: string;
  activities?: string[];
  notes?: string;
}

export interface GoalData {
  id?: string;
  title: string;
  description: string;
  target_date: string;
  start_date: string;
  goal_type: "general" | "financial" | "travel";
  travel_details?: TravelDetails | null;
}

export interface SuggestedAnswer {
  id: string;
  text: string;
}

// Local storage keys
export const STORAGE_KEYS = {
  MESSAGES: "goal_chat_messages",
  CHAT_STAGE: "goal_chat_stage",
  CONVERSATION_ID: "goal_chat_conversation_id",
  IS_PENDING_CONFIRMATION: "goal_chat_pending_confirmation",
  GOAL_DATA: "goal_chat_goal_data",
  LAST_ASSISTANT_MESSAGE: "goal_chat_last_assistant_message",
  INTERACTION_COUNT: "goal_chat_interaction_count"
};
