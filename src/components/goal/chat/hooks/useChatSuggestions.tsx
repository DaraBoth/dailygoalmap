
import { useState, useEffect } from 'react';
import { ChatStage } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface UseChatSuggestionsProps {
  lastAssistantMessage: string;
  chatStage: ChatStage;
  isPendingConfirmation?: boolean;
}

export interface SuggestedAnswer {
  id: string;
  text: string;
}

export const useChatSuggestions = ({
  lastAssistantMessage,
  chatStage,
  isPendingConfirmation = false
}: UseChatSuggestionsProps) => {
  const [suggestedAnswers, setSuggestedAnswers] = useState<SuggestedAnswer[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [usedSuggestionIds, setUsedSuggestionIds] = useState<Set<string>>(new Set());

  // Function to toggle showing suggestions
  const toggleSuggestions = () => {
    setShowSuggestions(prev => !prev);
  };

  // Function to reset used suggestions
  const resetUsedSuggestions = () => {
    setUsedSuggestionIds(new Set());
  };

  // Fetch suggestions when the assistant message changes
  useEffect(() => {
    if (!lastAssistantMessage || lastAssistantMessage.trim() === '' || isPendingConfirmation) {
      setSuggestedAnswers([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        // Call the Supabase Edge Function to generate suggestions
        const { data, error } = await supabase.functions.invoke('generate-chat-suggestions', {
          body: { 
            message: lastAssistantMessage,
            dedicatedCall: true
          },
        });

        if (error) {
          console.error("Error fetching suggestions:", error);
          setSuggestedAnswers(getDefaultSuggestions(lastAssistantMessage));
        } else if (data?.suggestions && Array.isArray(data.suggestions)) {
          // Format suggestions with IDs
          const formattedSuggestions = data.suggestions.map((text: string) => ({
            id: `sugg-${Math.random().toString(36).substring(2, 9)}`,
            text
          }));
          setSuggestedAnswers(formattedSuggestions);
        } else {
          setSuggestedAnswers(getDefaultSuggestions(lastAssistantMessage));
        }
      } catch (error) {
        console.error("Error generating suggestions:", error);
        setSuggestedAnswers(getDefaultSuggestions(lastAssistantMessage));
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [lastAssistantMessage, isPendingConfirmation]);

  // Generate default suggestions based on message context
  const getDefaultSuggestions = (message: string): SuggestedAnswer[] => {
    if (!message) {
      return [
        { id: 'default-1', text: "I'd like to create a fitness goal." },
        { id: 'default-2', text: "Help me plan a vacation." },
        { id: 'default-3', text: "I need to save money for something important." }
      ];
    }
    
    // Generate context-aware default suggestions based on message keywords
    if (message.toLowerCase().includes("timeline") || message.toLowerCase().includes("how long")) {
      return [
        { id: 'time-1', text: "3 months should be enough." },
        { id: 'time-2', text: "I'm thinking around 6 months." },
        { id: 'time-3', text: "1 year would be ideal for me." }
      ];
    } else if (message.toLowerCase().includes("destination") || message.toLowerCase().includes("travel")) {
      return [
        { id: 'travel-1', text: "I'd love to visit Japan." },
        { id: 'travel-2', text: "Europe, particularly Italy and France." },
        { id: 'travel-3', text: "A tropical beach destination like Bali." }
      ];
    } else if (message.toLowerCase().includes("budget") || message.toLowerCase().includes("cost")) {
      return [
        { id: 'budget-1', text: "Around $3,000 total." },
        { id: 'budget-2', text: "I can save about $500 per month." },
        { id: 'budget-3', text: "I'm on a tight budget, under $1,000 if possible." }
      ];
    } else {
      return [
        { id: 'generic-1', text: "That sounds good to me." },
        { id: 'generic-2', text: "Could you give me more details?" },
        { id: 'generic-3', text: "I'd like to explore other options." },
        { id: 'generic-4', text: "Yes, let's move forward with this plan." }
      ];
    }
  };

  return {
    suggestedAnswers,
    isLoadingSuggestions,
    showSuggestions,
    usedSuggestionIds,
    setUsedSuggestionIds,
    toggleSuggestions,
    resetUsedSuggestions
  };
};
