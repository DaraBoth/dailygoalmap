
import { supabase } from "@/integrations/supabase/client";
import { TaskGenerationParams } from "../types";
import { rotateApiKey, hasMoreKeysToTry, resetAttemptedKeys } from "../utils/apiKeyManager";
import { toast } from "@/components/ui/use-toast";

const MAX_RETRY_ATTEMPTS = 3;

export async function generateTaskWithAI(
  params: TaskGenerationParams
): Promise<string> {
  let retryCount = 0;
  
  // Reset the attempted keys tracking when starting a new request
  resetAttemptedKeys();
  
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      // Call the Supabase Edge Function to generate a task with Gemini AI
      const { data, error } = await supabase.functions.invoke('generate-tasks', {
        body: { 
          goalTitle: params.goalTitle, 
          goalDescription: params.goalDescription, 
          financialData: params.financialData,
          startDate: params.startDate,
          targetDate: params.targetDate,
          geminiApiKey: params.geminiApiKey,
          goalType: params.goalType,
          travelDetails: params.travelDetails
        },
      });
      
      if (error) {
        console.error("Error generating task with AI:", error);
        
        // If it looks like a rate limit error, rotate the API key and retry
        if (error.message?.includes("429") || 
            error.message?.includes("quota") || 
            error.message?.toLowerCase().includes("rate limit")) {
          
          if (hasMoreKeysToTry()) {
            const newKey = rotateApiKey();
            console.log(`Rotating to a different API key: ${newKey.substring(0, 5)}...`);
            retryCount++;
            // Don't show failure toast, just silently retry
            continue;
          }
        }
        return `Task for ${params.goalTitle}`;
      } 
      
      if (data && data.tasks && data.tasks.length > 0) {
        // Use the first task from the generated tasks
        return data.tasks[0].description;
      }
      
      return `Task for ${params.goalTitle}`;
    } catch (error) {
      console.error("Failed to generate task with AI:", error);
      
      // If we have more keys to try, rotate and retry
      if (hasMoreKeysToTry()) {
        rotateApiKey();
        retryCount++;
        continue;
      }
      
      return `Task for ${params.goalTitle}`;
    }
  }
  
  // If we've exhausted all retries, return a default task
  return `Task for ${params.goalTitle}`;
}

export async function generateMultipleTasksWithAI(
  params: TaskGenerationParams & { requestedTaskCount?: number }
): Promise<any[]> {
  let retryCount = 0;
  
  // Enhanced parameters with intelligent task count calculation
  const enhancedParams = {
    ...params,
    requestedTaskCount: params.requestedTaskCount || calculateOptimalTaskCount(params)
  };
  
  // Reset the attempted keys tracking when starting a new request
  resetAttemptedKeys();
  
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      // Call the enhanced Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('generate-tasks', {
        body: enhancedParams,
      });
      
      if (error) {
        console.error("Error generating tasks with AI:", error);
        
        // If it looks like a rate limit error, rotate the API key and retry
        if (error.message?.includes("429") || 
            error.message?.includes("quota") || 
            error.message?.toLowerCase().includes("rate limit")) {
          
          if (hasMoreKeysToTry()) {
            const newKey = rotateApiKey();
            console.log(`Rotating to a different API key: ${newKey.substring(0, 5)}...`);
            retryCount++;
            continue;
          }
        }
        throw error;
      }
      
      if (!data || !data.tasks || data.tasks.length === 0) {
        console.error("No tasks generated");
        throw new Error("Failed to generate tasks");
      }
      
      console.log(`Successfully generated ${data.tasks.length} enhanced tasks`);
      return data.tasks;
    } catch (error) {
      console.error("Failed to generate tasks with AI:", error);
      
      // If we have more keys to try, rotate and retry
      if (hasMoreKeysToTry() && retryCount < MAX_RETRY_ATTEMPTS - 1) {
        rotateApiKey();
        retryCount++;
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error("All API key attempts failed");
}

/**
 * Calculate optimal task count based on goal characteristics
 */
function calculateOptimalTaskCount(params: TaskGenerationParams): number {
  const { goalTitle, goalDescription, startDate, targetDate, goalType } = params;
  
  // Calculate timeline
  const start = new Date(startDate);
  const end = new Date(targetDate);
  const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Base calculation: roughly one task per week, minimum 5
  let taskCount = Math.max(5, Math.ceil(daysDiff / 7));
  
  // Adjust for goal complexity
  const text = (goalTitle + ' ' + (goalDescription || '')).toLowerCase();
  
  // Complex goal indicators
  if (text.includes('learn') || text.includes('master') || text.includes('develop')) {
    taskCount = Math.max(taskCount, Math.ceil(daysDiff / 5));
  }
  
  if (text.includes('build') || text.includes('create') || text.includes('project')) {
    taskCount = Math.max(taskCount, Math.ceil(daysDiff / 4));
  }
  
  // Goal type adjustments
  if (goalType === 'learning') taskCount = Math.max(taskCount * 1.3, 10);
  else if (goalType === 'travel') taskCount = Math.max(taskCount * 1.2, 8);
  else if (goalType === 'financial') taskCount = Math.max(taskCount, 8);
  
  // Timeline adjustments
  if (daysDiff > 90) taskCount = Math.max(taskCount, 25);
  else if (daysDiff <= 7) taskCount = Math.min(taskCount, daysDiff * 2);
  
  return Math.min(taskCount, 40); // Cap at reasonable maximum
}

export async function fetchGeminiAPIKey(): Promise<string> {
  try {
    // Get the default Gemini API key if available
    const { data, error } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('key_type', 'gemini')
      .eq('is_default', true)
      .single();
    
    if (error || !data) {
      // If no default key found, try to get any Gemini key
      const { data: anyKeyData } = await supabase
        .from('api_keys')
        .select('key_value')
        .eq('key_type', 'gemini')
        .limit(1);
          
      if (anyKeyData && anyKeyData.length > 0) {
        return anyKeyData[0].key_value;
      }
      
      // If still no key found, use one of the keys from the rotation pool
      return rotateApiKey();
    }
    
    return data.key_value || '';
  } catch (error) {
    console.error("Error fetching Gemini API key:", error);
    // Return a key from the rotation pool if there's an error
    return rotateApiKey();
  }
}
