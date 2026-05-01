
import { useState, useCallback } from "react";
import { Message } from "../types";
import { parseRetryDelay } from "../utils";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for handling API interactions for chat functionality
 */
export const useChatApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastRetryDelay, setLastRetryDelay] = useState(0);
  const [apiKeyPool, setApiKeyPool] = useState<string[]>([]);
  const [apiSuggestionKeyPool, setApiSuggestionKeyPool] = useState<string[]>([]);
  const [attemptedApiKeys, setAttemptedApiKeys] = useState<Set<string>>(new Set());
  const [attemptedSuggestionApiKeys, setAttemptedSuggestionApiKeys] = useState<Set<string>>(new Set());
  const [currentApiKeyIndex, setCurrentApiKeyIndex] = useState(0);
  const [currentSuggestionApiKeyIndex, setCurrentSuggestionApiKeyIndex] = useState(0);
  
  // Function to send chat messages to API
  const sendMessageToApi = async (
    messages: Message[], 
    userMessage: Message, 
    chatStage: string,
    conversationId: string
  ) => {
    setIsLoading(true);
    let response = "";
    let success = false;
    let goalData = null;
    let retryDelay = 0;

    try {
      // Call the Supabase Edge Function for Gemini AI
      const { data, error } = await supabase.functions.invoke('generate-goal-chat', {
        body: { 
          messages: messages.concat(userMessage),
          stage: chatStage,
          conversationId
        },
      });
      
      if (error) {
        console.error("API Error:", error);
        
        // Parse retry delay if present
        const errorMessage = error.message || String(error);
        retryDelay = parseRetryDelay(errorMessage);
        setLastRetryDelay(retryDelay);
        
        response = `I'm having some trouble connecting to our service right now. ${
          retryDelay > 0 ? `Please try again in ${retryDelay} seconds.` : "Please try again."
        }`;
        
        success = false;
        throw error;
      }
      
      if (data) {
        response = data.message || "";
        goalData = data.goalData || null;
        success = true;
      } else {
        throw new Error("Empty response from API");
      }
    } catch (error) {
      console.error("API Error:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      retryDelay = parseRetryDelay(errorMessage);
      setLastRetryDelay(retryDelay);
      
      if (!response) {
        response = `I'm having some trouble connecting to our service right now. ${
          retryDelay > 0 ? `Please try again in ${retryDelay} seconds.` : "Please try again."
        }`;
      }
      
      success = false;
    } finally {
      setIsLoading(false);
    }
    
    return { success, response, goalData, retryDelay };
  };
  
  // Function to fetch an API key, with rotation
  const fetchGeminiApiKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-goal-chat', {
        body: { action: 'fetch-key' },
      });
      
      if (error) {
        console.error("Error fetching API key:", error);
        return "fallback-api-key";
      }
      
      return data?.apiKey || "fallback-api-key";
    } catch (error) {
      console.error("Error fetching API key:", error);
      return "fallback-api-key";
    }
  };

  // Functions for suggestion API key management and search
  const getCurrentSuggestionApiKey = () => {
    if (apiSuggestionKeyPool.length === 0) {
      // Return a mock key if no real keys available
      return "suggestion-api-key-" + Math.random().toString(36).substring(2, 9);
    }
    return apiSuggestionKeyPool[currentSuggestionApiKeyIndex];
  };
  
  const rotateSuggestionApiKey = () => {
    if (apiSuggestionKeyPool.length === 0) return "suggestion-api-key-" + Math.random().toString(36).substring(2, 9);
    
    // Mark current key as attempted
    const currentKey = apiSuggestionKeyPool[currentSuggestionApiKeyIndex];
    setAttemptedSuggestionApiKeys(prev => new Set([...prev, currentKey]));
    
    // Move to next key
    const nextIndex = (currentSuggestionApiKeyIndex + 1) % apiSuggestionKeyPool.length;
    setCurrentSuggestionApiKeyIndex(nextIndex);
    
    return apiSuggestionKeyPool[nextIndex];
  };
  
  const hasMoreSuggestionKeysToTry = () => {
    if (apiSuggestionKeyPool.length === 0) return false;
    return attemptedSuggestionApiKeys.size < apiSuggestionKeyPool.length;
  };
  
  const resetAttemptedSuggestionKeys = () => {
    setAttemptedSuggestionApiKeys(new Set());
  };
  
  /**
   * Search for goals and tasks matching the query
   */
  const searchGoalsAndTasks = async (query: string) => {
    if (!query || query.length < 2) return { goals: [], tasks: [] };
    
    try {
      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        return { goals: [], tasks: [] };
      }
      
      // Search goals using better ilike search and include shared goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .or(`user_id.eq.${user.id},id.in.(select goal_id from goal_members where user_id = '${user.id}')`)
        .limit(10);
      
      if (goalsError) {
        console.error("Error searching goals:", goalsError);
      }
      
      // Search tasks: only within goals the user owns or is a member of.
      // Fetch accessible goal IDs first, then filter tasks by them.
      const { data: memberGoalRows } = await supabase
        .from('goal_members')
        .select('goal_id')
        .eq('user_id', user.id);
      const { data: ownGoalRows } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id);
      const accessibleGoalIds = [
        ...(memberGoalRows || []).map((r: any) => r.goal_id),
        ...(ownGoalRows || []).map((r: any) => r.id),
      ];

      let tasks: any[] = [];
      let tasksError: any = null;
      if (accessibleGoalIds.length > 0) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, goal_id')
          .in('goal_id', accessibleGoalIds)
          .ilike('description', `%${query}%`)
          .limit(10);
        tasks = data || [];
        tasksError = error;
      }
      
      if (tasksError) {
        console.error("Error searching tasks:", tasksError);
      }
      
      console.log("Search results:", { 
        goals: goals || [], 
        tasks: tasks || [] 
      });
      
      return {
        goals: goals || [],
        tasks: tasks || []
      };
    } catch (error) {
      console.error("Search error:", error);
      return { goals: [], tasks: [] };
    }
  };

  return {
    isLoading,
    sendMessageToApi,
    fetchGeminiApiKey,
    lastRetryDelay,
    searchGoalsAndTasks,
    getCurrentSuggestionApiKey,
    rotateSuggestionApiKey,
    hasMoreSuggestionKeysToTry,
    resetAttemptedSuggestionKeys
  };
};

export default useChatApi;
