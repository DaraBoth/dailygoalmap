
import { Message, GoalData, ChatStage, STORAGE_KEYS } from "../types";

/**
 * Loads chat state from localStorage
 */
export const loadChatStateFromStorage = () => {
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const chatStage = localStorage.getItem(STORAGE_KEYS.CHAT_STAGE);
    const conversationId = localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
    const isPendingConfirmation = localStorage.getItem(STORAGE_KEYS.IS_PENDING_CONFIRMATION);
    const goalData = localStorage.getItem(STORAGE_KEYS.GOAL_DATA);
    const lastAssistantMessage = localStorage.getItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE);
    const interactionCount = localStorage.getItem(STORAGE_KEYS.INTERACTION_COUNT);

    return {
      messages: messages ? JSON.parse(messages) : [],
      chatStage: chatStage ? (chatStage as ChatStage) : "collecting",
      conversationId: conversationId || "",
      isPendingConfirmation: isPendingConfirmation === "true",
      goalData: goalData ? JSON.parse(goalData) : null,
      lastAssistantMessage: lastAssistantMessage || "",
      interactionCount: interactionCount ? parseInt(interactionCount, 10) : 0
    };
  } catch (error) {
    console.error("Error loading chat state from localStorage:", error);
    return {
      messages: [],
      chatStage: "collecting" as ChatStage,
      conversationId: "",
      isPendingConfirmation: false,
      goalData: null,
      lastAssistantMessage: "",
      interactionCount: 0
    };
  }
};

/**
 * Saves chat state to localStorage
 */
export const saveChatStateToStorage = (
  messages: Message[],
  chatStage: ChatStage,
  conversationId: string,
  isPendingConfirmation: boolean,
  goalData: GoalData | null,
  lastAssistantMessage: string,
  interactionCount: number
) => {
  try {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    localStorage.setItem(STORAGE_KEYS.CHAT_STAGE, chatStage);
    localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, conversationId);
    localStorage.setItem(STORAGE_KEYS.IS_PENDING_CONFIRMATION, String(isPendingConfirmation));
    localStorage.setItem(STORAGE_KEYS.GOAL_DATA, goalData ? JSON.stringify(goalData) : "");
    localStorage.setItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE, lastAssistantMessage);
    localStorage.setItem(STORAGE_KEYS.INTERACTION_COUNT, String(interactionCount));
  } catch (error) {
    console.error("Error saving chat state to localStorage:", error);
  }
};

/**
 * Clears chat state from localStorage
 */
export const clearChatStateFromStorage = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error("Error clearing chat state from localStorage:", error);
  }
};
