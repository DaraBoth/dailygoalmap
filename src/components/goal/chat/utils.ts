
import { Message } from "./types";
import { STORAGE_KEYS, ChatStage, GoalData } from "./types";

/**
 * Parses a retry delay from an error message.
 * @param errorMessage The error message to parse
 * @returns The delay in seconds, or 0 if no delay is found
 */
export const parseRetryDelay = (errorMessage: string): number => {
  // Look for patterns like "Rate limit exceeded, retry in 10s"
  const match = errorMessage.match(/retry in (\d+)s/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
};

/**
 * Checks for repeated error messages in a conversation.
 * @param messages The message history
 * @returns True if there are repeated errors
 */
export const checkForRepeatedErrors = (messages: Message[]): boolean => {
  // Count consecutive assistant error messages
  let errorCount = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "assistant" && (
      message.content.includes("I'm having some trouble") ||
      message.content.includes("Error:") ||
      message.content.includes("rate limit")
    )) {
      errorCount++;
    } else if (message.role === "user") {
      // Reset count if we see a user message
      continue;
    } else {
      // No more consecutive errors
      break;
    }
  }
  return errorCount >= 2;
};

/**
 * Checks if message contains a confirmation request
 * @param message The message to check
 * @returns True if the message is asking for confirmation
 */
export const containsConfirmationRequest = (message: string): boolean => {
  const confirmationPhrases = [
    "confirm",
    "approve",
    "proceed",
    "go ahead",
    "should i create",
    "want me to",
    "shall i",
    "ready to",
    "does this look"
  ];
  
  const lowerMessage = message.toLowerCase();
  return confirmationPhrases.some(phrase => lowerMessage.includes(phrase));
};

/**
 * Extracts goal data from a confirmation message
 * @param message The message containing goal data
 * @returns Extracted goal data or null if none found
 */
export const extractGoalDataFromMessage = (message: string): any | null => {
  try {
    // Look for JSON-like data in the message
    const jsonMatch = message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Failed to extract goal data from message:", error);
    return null;
  }
};

/**
 * Formats a delay time in seconds to a user-friendly string
 * @param seconds Delay in seconds
 * @returns Formatted time string
 */
export const formatDelayTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    let result = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    if (remainingSeconds > 0) {
      result += ` and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    }
    return result;
  }
};

/**
 * Loads chat state from localStorage
 * @returns The stored chat state, or undefined if not found
 */
export const loadChatStateFromStorage = () => {
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const chatStage = localStorage.getItem(STORAGE_KEYS.CHAT_STAGE) as ChatStage | null;
    const conversationId = localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
    const isPendingConfirmation = localStorage.getItem(STORAGE_KEYS.IS_PENDING_CONFIRMATION) === 'true';
    const goalData = localStorage.getItem(STORAGE_KEYS.GOAL_DATA);
    const lastAssistantMessage = localStorage.getItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE);
    const interactionCount = parseInt(localStorage.getItem(STORAGE_KEYS.INTERACTION_COUNT) || '0', 10);

    return {
      messages: messages ? JSON.parse(messages) : undefined,
      chatStage: chatStage || undefined,
      conversationId: conversationId || undefined,
      isPendingConfirmation,
      goalData: goalData ? JSON.parse(goalData) : undefined,
      lastAssistantMessage: lastAssistantMessage || undefined,
      interactionCount
    };
  } catch (error) {
    console.error('Error loading chat state from storage:', error);
    return {};
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
    
    if (goalData) {
      localStorage.setItem(STORAGE_KEYS.GOAL_DATA, JSON.stringify(goalData));
    }
    
    localStorage.setItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE, lastAssistantMessage);
    localStorage.setItem(STORAGE_KEYS.INTERACTION_COUNT, String(interactionCount));
  } catch (error) {
    console.error('Error saving chat state to storage:', error);
  }
};

/**
 * Clears chat state from localStorage
 */
export const clearChatStateFromStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.CHAT_STAGE);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
    localStorage.removeItem(STORAGE_KEYS.IS_PENDING_CONFIRMATION);
    localStorage.removeItem(STORAGE_KEYS.GOAL_DATA);
    localStorage.removeItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE);
    localStorage.removeItem(STORAGE_KEYS.INTERACTION_COUNT);
  } catch (error) {
    console.error('Error clearing chat state from storage:', error);
  }
};
