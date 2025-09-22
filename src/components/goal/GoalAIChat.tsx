import React, { useEffect, useCallback } from "react";
import ChatHeader from "./chat/ChatHeader";
import ChatMessageList from "./chat/ChatMessageList";
import ChatInputArea from "./chat/ChatInputArea";
import { Goal } from "@/types/goal";
import { checkForRepeatedErrors, parseRetryDelay } from "./chat/utils";
import { useGoalChat } from "./chat/hooks/useGoalChat";
import { toast } from "@/components/ui/use-toast";
import { STORAGE_KEYS } from "./chat/types";
import { Button } from "@/components/ui";
import { Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface GoalAIChatProps {
  onGoalDataGenerated: (goalData: Goal) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const GoalAIChat: React.FC<GoalAIChatProps> = ({
  onGoalDataGenerated,
  isOpen,
  onClose,
}) => {
  const {
    messages,
    isLoading,
    chatStage,
    hasError,
    isPendingConfirmation,
    lastAssistantMessage,
    initializeChat,
    handleSendMessage,
    handleRestartChat,
    handleConfirmGoal,
    handleClearChat: clearChatState,
    retryDelay
  } = useGoalChat({
    onGoalDataGenerated,
    onClose
  });
  
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) {
      // Check if we have an existing chat to resume
      const storedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const hasExistingChat = storedMessages && JSON.parse(storedMessages).length > 0;
      
      if (!hasExistingChat || messages.length === 0) {
        initializeChat();
      }
    }
  }, [isOpen, initializeChat, messages.length]);

  useEffect(() => {
    if (hasError && !retryDelay) {
      toast({
        variant: "destructive",
        title: "AI Service Unavailable",
        description: "Could not connect to the AI service. Please try again."
      });
    }
  }, [hasError, retryDelay]);

  useEffect(() => {
    if (chatStage === "complete") {
      toast({
        title: "Goal Created",
        description: "Your goal has been created successfully with AI-generated tasks!",
        variant: "success",
      });
    }
  }, [chatStage]);

  // Auto-confirm goal if we have a pending confirmation and we've waited more than 5 seconds
  useEffect(() => {
    let confirmationTimer: NodeJS.Timeout;
    
    if (isPendingConfirmation) {
      confirmationTimer = setTimeout(() => {
        handleConfirmGoal();
      }, 50000);
    }
    
    return () => {
      if (confirmationTimer) clearTimeout(confirmationTimer);
    };
  }, [isPendingConfirmation, handleConfirmGoal]);

  const hasRepeatedErrors = checkForRepeatedErrors(messages);

  const handleClearChat = useCallback(() => {
    clearChatState();
    initializeChat(); // Reinitialize the chat after clearing
  }, [clearChatState, initializeChat]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className={`bg-card border rounded-lg shadow-lg flex flex-col ${isMobile ? 'w-full h-full' : 'w-full max-w-4xl h-[90vh] max-h-screen'}`}>
            <div className="relative">
              <ChatHeader onClose={onClose} stage={chatStage} />
              
            </div>
            {messages.length > 1 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearChat}
                className="flex items-center gap-1 text-muted-foreground hover:text-destructive rounded-none"
                disabled={messages.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Clear chat
              </Button>
            )}
            <ChatMessageList 
              messages={messages} 
              isLoading={isLoading} 
              hasRepeatedErrors={hasRepeatedErrors}
              onRestartChat={handleRestartChat}
            />
            
            <ChatInputArea 
              isLoading={isLoading}
              hasError={hasError}
              chatStage={chatStage}
              onSendMessage={handleSendMessage}
              onRestartChat={handleRestartChat}
              onConfirmGoal={handleConfirmGoal}
              onClose={onClose}
              isPendingConfirmation={isPendingConfirmation}
              lastAssistantMessage={lastAssistantMessage}
              onClearChat={handleClearChat}
              retryDelay={retryDelay}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default GoalAIChat;
