import { useState } from "react";
import { Message, ChatStage, GoalData } from "../types";
import { containsConfirmationRequest, extractGoalDataFromMessage } from "../utils";
import { formatGoalData } from "../formatters/goalFormatter";

interface UseChatInteractionProps {
  initialConversationId?: string;
  initialIsPendingConfirmation?: boolean;
  initialInteractionCount?: number;
}

/**
 * Hook for handling chat interaction logic
 */
export const useChatInteraction = ({
  initialConversationId = "",
  initialIsPendingConfirmation = false,
  initialInteractionCount = 0
}: UseChatInteractionProps = {}) => {
  const [conversationId, setConversationId] = useState<string>(initialConversationId);
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(initialIsPendingConfirmation);
  const [retryCount, setRetryCount] = useState(0);
  const [interactionCount, setInteractionCount] = useState(initialInteractionCount);
  
  /**
   * Initialize a new chat conversation
   */
  const initializeConversation = (): { conversationId: string; initialMessage: string } => {
    // If we already have a conversation ID from localStorage, use it
    if (conversationId) {
      const initialMessage = "Welcome back! We were discussing your goal. Please continue sharing your thoughts or ask any questions.";
      return { conversationId, initialMessage };
    }
    
    // Otherwise create a new conversation
    const newConversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const initialMessage = "Hi there! I'll help you create a personalized goal with tasks. To create an effective plan, I'll need to ask you several questions. What type of goal are you interested in? For example: fitness, travel, learning, or financial?";
    
    return { conversationId: newConversationId, initialMessage };
  };

  /**
   * Process the API response to extract goal data
   */
  const processApiResponse = (
    fullResponse: string, 
    allMessages: Message[],
    userMessage: Message,
    chatStage: ChatStage
  ): {
    extractedGoalData: GoalData | null;
    shouldConfirm: boolean;
    incrementRetry: boolean;
  } => {
    // Count meaningful interactions
    const userMessageCount = allMessages.filter(msg => msg.role === "user").length;
    
    // First try to extract goal data from current response
    const containsConfirmation = containsConfirmationRequest(fullResponse);
    const extractedGoalData = extractGoalDataFromMessage(fullResponse);
    
    // We should only move to confirmation after at least 5 user messages
    const readyForConfirmation = userMessageCount >= 5 && chatStage === "collecting";
    
    // Case 1: Response contains goal data after sufficient interaction
    if (extractedGoalData && readyForConfirmation) {
      return {
        extractedGoalData: formatGoalData(extractedGoalData),
        shouldConfirm: true,
        incrementRetry: false
      };
    }
    
    // Case 2: The response contains a confirmation request but no goal data
    if (containsConfirmation && !extractedGoalData && readyForConfirmation) {
      // Look for goal data in previous messages
      const lastAssistantMessages = allMessages.filter(msg => msg.role === "assistant");
      
      for (let i = lastAssistantMessages.length - 1; i >= 0; i--) {
        const extracted = extractGoalDataFromMessage(lastAssistantMessages[i].content);
        if (extracted) {
          // Add current date as start date if not specified
          if (!extracted.start_date) {
            extracted.start_date = new Date().toISOString().split("T")[0];
          }
          
          return {
            extractedGoalData: formatGoalData(extracted),
            shouldConfirm: true,
            incrementRetry: false
          };
        }
      }
    }
    
    // No goal data extraction yet - keep collecting information
    return {
      extractedGoalData: null,
      shouldConfirm: false,
      incrementRetry: false
    };
  };

  /**
   * Generate confirmation message with formatted goal data
   */
  const generateConfirmationMessage = (formattedGoalData: GoalData): string => {
    let goalDetails = "";
    
    if (formattedGoalData.goal_type === "travel") {
      const travelDetails = formattedGoalData.travel_details || {};
      goalDetails = `
**Travel Details:**
${travelDetails.destination ? `- Destination: ${travelDetails.destination}` : ''}
${travelDetails.accommodation ? `- Accommodation: ${travelDetails.accommodation}` : ''}
${travelDetails.transportation ? `- Transportation: ${travelDetails.transportation}` : ''}
${travelDetails.budget ? `- Budget: ${travelDetails.budget}` : ''}
${travelDetails.activities && travelDetails.activities.length > 0 ? 
  `- Activities: ${travelDetails.activities.join(', ')}` : ''}`;
    }

    const startDate = formattedGoalData.start_date 
      ? `Start date: ${new Date(formattedGoalData.start_date).toLocaleDateString()}\n`
      : `Start date: Today (${new Date().toLocaleDateString()})\n`;
    
    return `Based on our conversation, I'll create this goal for you:\n\n**${formattedGoalData.title}**\n\n${formattedGoalData.description}\n\n${startDate}Target date: ${new Date(formattedGoalData.target_date).toLocaleDateString()}\nType: ${formattedGoalData.goal_type}\n${goalDetails}\n\nI'll create AI tasks to help you achieve this goal between the start and target dates. Type 'yes' to confirm or suggest any changes if needed.`;
  };

  /**
   * Handle error cases during chat
   */
  const handleChatError = (retryCount: number): { 
    message: string;
    shouldIncrementRetry: boolean;
  } => {
    if (retryCount < 2) {
      return {
        message: "I'm having some trouble processing your request. Let's try a simpler approach. Could you tell me more about the specific type of goal you want to create and when you'd like to achieve it?",
        shouldIncrementRetry: true
      };
    } else {
      return {
        message: "I need a bit more information before we can create your goal. Could you please tell me: 1) What type of goal this is, 2) When you want to start, and 3) When you want to achieve it by?",
        shouldIncrementRetry: false
      };
    }
  };

  /**
   * Check if the user message is confirming a goal
   */
  const isConfirmingGoal = (messageText: string): boolean => {
    const confirmationPatterns = [
      /\b(yes|create|confirm|ok|sure|proceed|go ahead)\b/i,
      /\blooks good\b/i,
      /\bsounds good\b/i,
      /\bgreat\b/i,
      /\bperfect\b/i,
      /\bthat works\b/i,
      /\bthank you\b/i,
      /\bthank\b/i
    ];
    
    return confirmationPatterns.some(pattern => pattern.test(messageText.toLowerCase()));
  };

  return {
    conversationId,
    setConversationId,
    isPendingConfirmation,
    setIsPendingConfirmation,
    retryCount,
    setRetryCount,
    interactionCount,
    setInteractionCount,
    initializeConversation,
    processApiResponse,
    generateConfirmationMessage,
    handleChatError,
    isConfirmingGoal
  };
};
