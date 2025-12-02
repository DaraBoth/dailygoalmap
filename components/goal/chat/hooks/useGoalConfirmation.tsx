
import { useCallback } from "react";
import { Message, GoalData } from "../types";
import { toast } from "@/components/ui/use-toast";

interface UseGoalConfirmationProps {
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setLastAssistantMessage: React.Dispatch<React.SetStateAction<string>>;
  goalData: GoalData | null;
  setHasError: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPendingConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  goalCreationTimeout: NodeJS.Timeout | null;
  setGoalCreationTimeout: React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>;
  createGoal: (
    goalData: GoalData,
    fetchGeminiApiKey: () => Promise<string>,
    onSuccess: (goal: any) => void
  ) => Promise<{ success: boolean; goal?: any; message: string }>;
  fetchGeminiApiKey: () => Promise<string>;
  onGoalDataGenerated: (goal: any) => void;
  handleGoalComplete: () => void;
}

export const useGoalConfirmation = ({
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
  handleGoalComplete
}: UseGoalConfirmationProps) => {
  /**
   * Confirm and create the goal
   */
  const handleConfirmGoal = useCallback(async () => {
    if (!goalData) return;
    
    setIsLoading(true);
    
    try {
      const { success, message, goal } = await createGoal(goalData, fetchGeminiApiKey, onGoalDataGenerated);
      
      const confirmationAssistantMessage: Message = { 
        role: "assistant", 
        content: message 
      };
      
      if (success) {
        setMessages(prev => [...prev, confirmationAssistantMessage]);
        setLastAssistantMessage(message);
        handleGoalComplete();
      } else {
        setHasError(true);
        setMessages(prev => [...prev, confirmationAssistantMessage]);
        setLastAssistantMessage(message);
      }
    } catch (error) {
      console.error("Error confirming goal:", error);
      setHasError(true);
      const errorMessage = "I'm sorry, there was an error creating your goal. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
      setLastAssistantMessage(errorMessage);
      
      toast({
        title: "Error",
        description: "Failed to create your goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPendingConfirmation(false);
      setIsLoading(false);
      
      if (goalCreationTimeout) {
        clearTimeout(goalCreationTimeout);
        setGoalCreationTimeout(null);
      }
    }
  }, [
    goalData,
    setIsLoading,
    createGoal,
    fetchGeminiApiKey,
    onGoalDataGenerated,
    setMessages,
    setLastAssistantMessage,
    handleGoalComplete,
    setHasError,
    setIsPendingConfirmation,
    goalCreationTimeout,
    setGoalCreationTimeout
  ]);

  return {
    handleConfirmGoal
  };
};
