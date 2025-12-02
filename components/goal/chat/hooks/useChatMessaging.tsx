import { useCallback } from "react";
import { Message, GoalData, ChatStage } from "../types";
import { toast } from "@/components/ui/use-toast";

interface UseChatMessagingProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  chatStage: ChatStage;
  setChatStage: React.Dispatch<React.SetStateAction<ChatStage>>;
  goalData: GoalData | null;
  setGoalData: React.Dispatch<React.SetStateAction<GoalData | null>>;
  hasError: boolean;
  setHasError: React.Dispatch<React.SetStateAction<boolean>>;
  lastAssistantMessage: string;
  setLastAssistantMessage: React.Dispatch<React.SetStateAction<string>>;
  setMessageCount: React.Dispatch<React.SetStateAction<number>>;
  goalCreationTimeout: NodeJS.Timeout | null;
  setGoalCreationTimeout: React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>;
  conversationId: string;
  isPendingConfirmation: boolean;
  setIsPendingConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  interactionCount: number;
  setInteractionCount: React.Dispatch<React.SetStateAction<number>>;
  retryCount: number;
  setRetryCount: React.Dispatch<React.SetStateAction<number>>;
  sendMessageToApi: (
    messages: Message[],
    userMessage: Message,
    chatStage: string,
    conversationId: string
  ) => Promise<{ success: boolean; response: string; goalData?: any; retryDelay?: number }>;
  processApiResponse: (
    fullResponse: string,
    allMessages: Message[],
    userMessage: Message,
    chatStage: ChatStage
  ) => {
    extractedGoalData: GoalData | null;
    shouldConfirm: boolean;
    incrementRetry: boolean;
  };
  generateConfirmationMessage: (formattedGoalData: GoalData) => string;
  handleChatError: (retryCount: number) => { message: string; shouldIncrementRetry: boolean };
  isConfirmingGoal: (messageText: string) => boolean;
  handleConfirmGoal: () => Promise<void>;
  clearChatState: () => void;
  onClose: () => void;
  setRetryDelay: React.Dispatch<React.SetStateAction<number>>;
}

export const useChatMessaging = ({
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
}: UseChatMessagingProps) => {
  /**
   * Send a message in the chat
   */
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      const userMessage: Message = { role: "user", content: messageText };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      setHasError(false);
      setMessageCount(prev => prev + 1);
      setInteractionCount(prev => prev + 1);
      setRetryDelay(0); // Reset retry delay when sending a new message

      // Check if user is confirming a goal
      if (isPendingConfirmation && isConfirmingGoal(messageText)) {
        await handleConfirmGoal();
        setIsPendingConfirmation(false); // Ensure confirmation is not retriggered
        setIsLoading(false);
        return;
      }

      try {
        // Clear any auto-confirmation timeout
        if (goalCreationTimeout) {
          clearTimeout(goalCreationTimeout);
          setGoalCreationTimeout(null);
        }
        
        // Send message to API
        const { success, response, goalData: extractedGoalData, retryDelay } = await sendMessageToApi(
          messages, 
          userMessage, 
          chatStage, 
          conversationId
        );
        
        // Handle retry delay if API was rate limited
        if (retryDelay && retryDelay > 0) {
          setRetryDelay(retryDelay);
          setHasError(true);
          setIsLoading(false);
          
          // Add a system message about the rate limit
          const rateLimitMessage: Message = { 
            role: "assistant", 
            content: `I'm experiencing high demand right now. Please wait ${retryDelay} seconds before trying again.` 
          };
          
          setMessages(prev => [...prev, rateLimitMessage]);
          setLastAssistantMessage(rateLimitMessage.content);
          return;
        }
        
        if (!success) {
          throw new Error("API call failed");
        }

        // Handle goal data if provided directly from the API
        if (extractedGoalData && interactionCount >= 5) {
          setGoalData(extractedGoalData);
          setChatStage("confirming");
          setIsPendingConfirmation(true);
          
          const confirmationMessage = generateConfirmationMessage(extractedGoalData);
          const confirmAssistantMessage: Message = { 
            role: "assistant", 
            content: confirmationMessage 
          };
          
          setMessages(prev => [...prev, confirmAssistantMessage]);
          setLastAssistantMessage(confirmationMessage);
          setIsLoading(false);
          return;
        }

        // Process API response
        const assistantMessage: Message = { role: "assistant", content: response };
        const allMessages = [...messages, userMessage, assistantMessage];
        
        const { extractedGoalData: processedGoalData, shouldConfirm, incrementRetry } = (() => {
          try {
            return processApiResponse(response, allMessages, userMessage, chatStage);
          } catch (parseError) {
            console.error("Error parsing API response:", parseError);
            return { extractedGoalData: null, shouldConfirm: false, incrementRetry: true };
          }
        })();
        
        // Handle goal data extraction and confirmation
        if (processedGoalData && shouldConfirm && interactionCount >= 5) {
          setGoalData(processedGoalData);
          setChatStage("confirming");
          setIsPendingConfirmation(true);
          
          const confirmationMessage = generateConfirmationMessage(processedGoalData);
          const confirmAssistantMessage: Message = { 
            role: "assistant", 
            content: confirmationMessage 
          };
          
          setMessages(prev => [...prev, confirmAssistantMessage]);
          setLastAssistantMessage(confirmationMessage);

          // Prevent infinite loop by ensuring confirmation is only triggered once
          return;
        } else {
          setMessages(prev => [...prev, assistantMessage]);
          setLastAssistantMessage(response);
          
          if (incrementRetry) {
            setRetryCount(prevCount => prevCount + 1);
          } else {
            setRetryCount(0);
          }
        }
        
      } catch (error) {
        console.error("Error in chat AI interaction:", error);
        setHasError(true);
        
        // Check if error contains a retry delay
        const errorMessage = error.toString();
        const match = errorMessage.match(/retryDelay":\s*"(\d+)s"/);
        if (match && match[1]) {
          const delay = parseInt(match[1]);
          setRetryDelay(delay);
          
          // Add a system message about the rate limit
          const rateLimitMessage: Message = { 
            role: "assistant", 
            content: `I'm experiencing high demand right now. Please wait ${delay} seconds before trying again.` 
          };
          
          setMessages(prev => [...prev, rateLimitMessage]);
          setLastAssistantMessage(rateLimitMessage.content);
          return;
        }
        
        const { message, shouldIncrementRetry } = handleChatError(retryCount);
        
        const errorAssistantMessage: Message = { 
          role: "assistant", 
          content: message 
        };
        
        setMessages(prev => [...prev, errorAssistantMessage]);
        setLastAssistantMessage(message);
        
        if (shouldIncrementRetry) {
          setRetryCount(prevCount => prevCount + 1);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      messages,
      setMessages,
      setIsLoading,
      setHasError,
      setMessageCount,
      setInteractionCount,
      isPendingConfirmation,
      isConfirmingGoal,
      handleConfirmGoal,
      goalCreationTimeout,
      setGoalCreationTimeout,
      sendMessageToApi,
      chatStage,
      conversationId,
      interactionCount,
      setGoalData,
      setChatStage,
      setIsPendingConfirmation,
      generateConfirmationMessage,
      setLastAssistantMessage,
      processApiResponse,
      retryCount,
      setRetryCount,
      handleChatError,
      setRetryDelay
    ]
  );

  /**
   * Handle goal completion and success notifications
   */
  const handleGoalComplete = useCallback(() => {
    setChatStage("complete");
    
    toast({
      title: "Goal Created",
      description: "Your goal has been created successfully with AI-generated tasks!",
      variant: "success",
    });
    
    // Clear chat state from localStorage
    clearChatState();
    
    // Close the chat after a short delay
    setTimeout(() => {
      onClose();
    }, 2000);
  }, [setChatStage, clearChatState, onClose]);

  return {
    handleSendMessage,
    handleGoalComplete
  };
};
