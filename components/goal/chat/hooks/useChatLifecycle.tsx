
import { useCallback, useEffect } from "react";
import { Message } from "../types";

interface UseChatLifecycleProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setLastAssistantMessage: React.Dispatch<React.SetStateAction<string>>;
  setMessageCount: React.Dispatch<React.SetStateAction<number>>;
  setInteractionCount: React.Dispatch<React.SetStateAction<number>>;
  initializeConversation: () => { conversationId: string; initialMessage: string };
  setConversationId: React.Dispatch<React.SetStateAction<string>>;
  goalCreationTimeout: NodeJS.Timeout | null;
  clearChatState: () => void;
}

export const useChatLifecycle = ({
  messages,
  setMessages,
  setLastAssistantMessage,
  setMessageCount,
  setInteractionCount,
  initializeConversation,
  setConversationId,
  goalCreationTimeout,
  clearChatState
}: UseChatLifecycleProps) => {
  /**
   * Initialize a new chat
   */
  const initializeChat = useCallback(() => {
    if (messages.length === 0) {
      const { conversationId: newId, initialMessage } = initializeConversation();
      setConversationId(newId);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: initialMessage
      };
      
      setMessages([assistantMessage]);
      setLastAssistantMessage(initialMessage);
      setMessageCount(0);
      setInteractionCount(0);
    }
  }, [
    messages.length,
    initializeConversation,
    setConversationId,
    setMessages,
    setLastAssistantMessage,
    setMessageCount,
    setInteractionCount
  ]);

  /**
   * Restart the chat
   */
  const handleRestartChat = useCallback(() => {
    if (goalCreationTimeout) {
      clearTimeout(goalCreationTimeout);
    }
    
    const { conversationId: newId, initialMessage } = initializeConversation();
    setConversationId(newId);
    
    const assistantMessage: Message = {
      role: "assistant",
      content: initialMessage
    };
    
    setMessages([assistantMessage]);
    setLastAssistantMessage(initialMessage);
    setMessageCount(0);
    setInteractionCount(0);
    
    // Clear local storage
    clearChatState();
  }, [
    goalCreationTimeout,
    initializeConversation,
    setConversationId,
    setMessages,
    setLastAssistantMessage,
    setMessageCount,
    setInteractionCount,
    clearChatState
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (goalCreationTimeout) {
        clearTimeout(goalCreationTimeout);
      }
    };
  }, [goalCreationTimeout]);

  return {
    initializeChat,
    handleRestartChat
  };
};
