import { useState, useEffect, useCallback } from "react";
import { Goal } from "@/types/goal";
import { Message, ChatStage, STORAGE_KEYS, GoalData } from "../types";

interface UseChatStateProps {
  onGoalDataGenerated: (goalData: Goal) => void;
  onClose: () => void;
}

export const useChatState = ({ onGoalDataGenerated, onClose }: UseChatStateProps) => {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatStage, setChatStage] = useState<ChatStage>("collecting");
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [hasError, setHasError] = useState(false);
  const [lastAssistantMessage, setLastAssistantMessage] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  
  // Timer/delay state
  const [goalCreationTimeout, setGoalCreationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryDelay, setRetryDelay] = useState(0);

  // Load chat state from localStorage on mount
  useEffect(() => {
    const storedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const storedChatStage = localStorage.getItem(STORAGE_KEYS.CHAT_STAGE);
    const storedGoalData = localStorage.getItem(STORAGE_KEYS.GOAL_DATA);
    const storedLastAssistantMessage = localStorage.getItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE);
    
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (error) {
        console.error("Error parsing stored messages:", error);
      }
    }
    
    if (storedChatStage) {
      setChatStage(storedChatStage as ChatStage);
    }
    
    if (storedGoalData) {
      try {
        setGoalData(JSON.parse(storedGoalData));
      } catch (error) {
        console.error("Error parsing stored goal data:", error);
      }
    }
    
    if (storedLastAssistantMessage) {
      setLastAssistantMessage(storedLastAssistantMessage);
    }
  }, []);

  // Persist chat state to localStorage
  const persistChatState = useCallback((
    currentMessages: Message[],
    currentChatStage: ChatStage, 
    conversationId: string,
    isPendingConfirmation: boolean,
    currentGoalData: GoalData | null,
    currentLastAssistantMessage: string,
    interactionCount: number
  ) => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(currentMessages));
    localStorage.setItem(STORAGE_KEYS.CHAT_STAGE, currentChatStage);
    localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, conversationId);
    localStorage.setItem(STORAGE_KEYS.IS_PENDING_CONFIRMATION, String(isPendingConfirmation));
    
    if (currentGoalData) {
      localStorage.setItem(STORAGE_KEYS.GOAL_DATA, JSON.stringify(currentGoalData));
    }
    
    localStorage.setItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE, currentLastAssistantMessage);
    localStorage.setItem(STORAGE_KEYS.INTERACTION_COUNT, String(interactionCount));
  }, []);

  // Clear chat state from localStorage
  const clearChatState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.CHAT_STAGE);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
    localStorage.removeItem(STORAGE_KEYS.IS_PENDING_CONFIRMATION);
    localStorage.removeItem(STORAGE_KEYS.GOAL_DATA);
    localStorage.removeItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE);
    localStorage.removeItem(STORAGE_KEYS.INTERACTION_COUNT);

    // Reset state variables
    setMessages([]);
    setChatStage("collecting");
    setGoalData(null);
    setHasError(false);
    setLastAssistantMessage("");
    setMessageCount(0);
    setRetryDelay(0);
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    chatStage,
    setChatStage,
    goalData,
    setGoalData,
    hasError,
    setHasError,
    lastAssistantMessage,
    setLastAssistantMessage,
    messageCount,
    setMessageCount,
    goalCreationTimeout,
    setGoalCreationTimeout,
    retryDelay,
    setRetryDelay,
    persistChatState,
    clearChatState
  };
};

export default useChatState;
