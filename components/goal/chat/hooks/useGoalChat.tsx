import { useState, useCallback, useEffect } from 'react';
import { Goal, goalToGoalData } from '@/types/goal';
import { useChatState } from './useChatState';
import { useChatApi } from './useChatApi';
import { useChatLifecycle } from './useChatLifecycle';
import { useChatInteraction } from './useChatInteraction';
import { useChatMessaging } from './useChatMessaging';
import { useGoalConfirmation } from './useGoalConfirmation';
import { loadChatStateFromStorage, saveChatStateToStorage, clearChatStateFromStorage } from '../utils';
import { Message, ChatStage, GoalData } from '../types';
import { useGoalCreation } from './useGoalCreation';

interface UseGoalChatProps {
  onGoalDataGenerated: (goalData: Goal) => void;
  onClose: () => void;
}

export const useGoalChat = (props?: UseGoalChatProps) => {
  const { onGoalDataGenerated, onClose } = props || {};
  
  // Format goal to prompt - basic utility function
  const formatGoalToPrompt = useCallback((goal: Goal) => {
    // Convert the Goal object to a GoalData for more direct property access
    const goalData = goalToGoalData(goal);
    
    return `
Goal Details:
- Title: ${goal.title}
- Description: ${goal.description}
- Target Date: ${goal.target_date}
- Status: ${goal.status}
- Type: ${goalData.goal_type || 'general'}
- Start Date: ${goalData.start_date || 'Not specified'}
${goalData.travel_details ? `- Travel Details: ${JSON.stringify(goalData.travel_details)}` : ''}
`;
  }, []);

  // If no props provided, return just the formatting function
  if (!props) {
    return { formatGoalToPrompt };
  }

  // Use existing hooks to build full functionality
  const { 
    messages, setMessages, 
    isLoading, setIsLoading,
    chatStage, setChatStage,
    goalData, setGoalData,
    hasError, setHasError,
    lastAssistantMessage, setLastAssistantMessage,
    messageCount, setMessageCount,
    goalCreationTimeout, setGoalCreationTimeout,
    retryDelay, setRetryDelay,
    persistChatState, clearChatState
  } = useChatState({ onGoalDataGenerated, onClose });

  const { sendMessageToApi, fetchGeminiApiKey } = useChatApi();

  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [interactionCount, setInteractionCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const { 
    initializeConversation,
    processApiResponse,
    generateConfirmationMessage,
    handleChatError,
    isConfirmingGoal
  } = useChatInteraction();

  const { createGoal } = useGoalCreation();

  const { initializeChat, handleRestartChat } = useChatLifecycle({
    messages,
    setMessages,
    setLastAssistantMessage,
    setMessageCount,
    setInteractionCount,
    initializeConversation,
    setConversationId,
    goalCreationTimeout,
    clearChatState
  });

  const { handleConfirmGoal } = useGoalConfirmation({
    setIsLoading,
    setMessages,
    setLastAssistantMessage,
    goalData,
    setHasError,
    setIsPendingConfirmation,
    goalCreationTimeout,
    setGoalCreationTimeout,
    createGoal,
    fetchGeminiApiKey,
    onGoalDataGenerated,
    handleGoalComplete: () => {
      setChatStage('complete');
      clearChatState();
      setTimeout(() => onClose?.(), 2000);
    }
  });

  const { handleSendMessage, handleGoalComplete } = useChatMessaging({
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
    setMessageCount,
    goalCreationTimeout,
    setGoalCreationTimeout,
    conversationId,
    isPendingConfirmation,
    setIsPendingConfirmation,
    interactionCount,
    setInteractionCount,
    retryCount,
    setRetryCount,
    sendMessageToApi,
    processApiResponse,
    generateConfirmationMessage,
    handleChatError,
    isConfirmingGoal,
    handleConfirmGoal,
    clearChatState,
    onClose,
    setRetryDelay
  });
  
  // Function to clear chat
  const handleClearChat = useCallback(() => {
    clearChatState(); // Reset chat state for the user
    initializeChat(); // Reinitialize the chat
  }, [clearChatState, initializeChat]);

  // Effect to persist state to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      persistChatState(
        messages,
        chatStage,
        conversationId,
        isPendingConfirmation,
        goalData,
        lastAssistantMessage,
        interactionCount
      );
    }
  }, [
    messages,
    chatStage,
    conversationId,
    isPendingConfirmation,
    goalData,
    lastAssistantMessage,
    interactionCount,
    persistChatState
  ]);

  return {
    messages,
    isLoading,
    chatStage,
    hasError,
    isPendingConfirmation,
    lastAssistantMessage,
    formatGoalToPrompt,
    initializeChat,
    handleSendMessage,
    handleRestartChat,
    handleConfirmGoal,
    handleClearChat,
    retryDelay
  };
};
