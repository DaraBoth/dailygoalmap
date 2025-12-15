import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const SYSTEM_PROMPTS = {
  collecting: `You are a helpful Goal Planning Assistant. Your task is to help the user create a personalized goal with tasks.

IMPORTANT GUIDELINES:
1. You MUST ask at least 5 specific questions about their goal before suggesting a concrete plan.
2. Your questions should cover: goal type, timeframe, specific details, challenges, and success metrics.
3. Keep each response FOCUSED on getting a specific piece of information.
4. After getting sufficient information (minimum 5 exchanges), create a concrete goal including specific start and target dates.
5. IMPORTANT: You MUST ASK for confirmation before finalizing any goal. NEVER auto-create.
6. When you have enough information, output structured JSON data within triple backticks that includes: goal title, goal description, goal type, start date, and target date.

Example output when you have enough information after at least 5 questions:
\`\`\`json
{
  "title": "Complete a 5K Run",
  "description": "Train and successfully complete a 5K running event",
  "goal_type": "fitness",
  "start_date": "2023-08-01",
  "target_date": "2023-09-30"
}
\`\`\`

Remember to ALWAYS ask about timeframe - when they want to start and when they want to achieve the goal.`,

  confirming: `You are a helpful Goal Planning Assistant. The user's goal data has been collected.
  
Your task now is to CONFIRM if they want to create the goal with the data provided.
1. Present a clear summary of the goal details including start date and target date.
2. EXPLICITLY ask for confirmation before proceeding.
3. You MUST receive a clear affirmative response (yes, sure, ok, looks good) before proceeding.
4. If they suggest changes, incorporate their feedback and ask for confirmation again.
5. NEVER proceed without explicit confirmation.`,
};

type GoalData = {
  title: string;
  description: string;
  goal_type: string;
  start_date?: string;
  target_date: string;
  travel_details?: {
    destination?: string;
    accommodation?: string;
    transportation?: string;
    budget?: string;
    activities?: string[];
  };
};

interface Message {
  role: string;
  content: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Destructure request body
    const { messages, stage, conversationId } = await req.json();
    
    console.log("Chat request received:", {
      messageCount: messages.length,
      stage,
      hasConversationId: !!conversationId,
      conversationId: conversationId ? conversationId.substring(0, 8) + "..." : null
    });

    // Get the user's most recent message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('Invalid user message');
    }

    // Count meaningful user interactions
    const userMessageCount = messages.filter((msg: Message) => msg.role === "user").length;

    // Use cached conversation context for faster responses
    const cacheKey = `conversation:${conversationId}`;
    const cachedConversation = await getConversationContext(cacheKey);
    if (cachedConversation) {
      console.log(`Using cached conversation context for ID: ${conversationId.substring(0, 8)}...`);
    }

    // Get the Gemini API key
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || await fetchGeminiApiKey();
    if (!geminiApiKey) {
      throw new Error("Missing Gemini API key");
    }

    // Determine the correct system prompt based on the stage
    const systemPrompt = SYSTEM_PROMPTS[stage as keyof typeof SYSTEM_PROMPTS];
    
    // Only extract goal data after minimum 5 meaningful exchanges and explicit confirmation
    const shouldExtractGoal = userMessageCount >= 6 && stage === "collecting" && 
      isConfirmationMessage(userMessage.content);

    // Prepare messages for Gemini API
    const geminiPrompt = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...messages.slice(-10).map((msg: Message) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }))
    ];

    // If we have enough user messages and confirmation, add a special instruction
    if (shouldExtractGoal) {
      geminiPrompt.push({
        role: "user",
        parts: [{ text: "The user has provided enough information and confirmed. Create a goal based on the conversation and output the JSON data enclosed in triple backticks." }]
      });
    }

    // Create API request for Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiPrompt,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();

    // Extract the assistant response from Gemini
    const assistantResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!assistantResponse) {
      throw new Error("Empty response from Gemini API");
    }

    // Process the response to look for structured goal data
    const { goalData, cleanedResponse } = extractGoalData(assistantResponse, userMessageCount);

    if (!goalData) {
      console.warn("AI response did not contain valid JSON. Returning raw response.");
    } else {
      console.log("Goal data successfully extracted. Ending processing.");
    }

    console.log("Processed response:", { 
      hasGoalData: !!goalData, 
      responseTextLength: cleanedResponse.length,
      stage,
      userMessageCount
    });

    // Save conversation context to cache for future use
    await setConversationContext(cacheKey, geminiPrompt);

    return new Response(
      JSON.stringify({
        message: cleanedResponse,
        goalData: goalData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in chat API:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Check if a message is a confirmation message
 */
function isConfirmationMessage(message: string): boolean {
  const confirmationPatterns = [
    /\b(yes|confirm|proceed|go ahead|create it|looks good|sounds good|approve)\b/i,
    /\bgood to go\b/i,
    /\bcreate( the)? goal\b/i
  ];
  
  return confirmationPatterns.some(pattern => pattern.test(message.toLowerCase()));
}

/**
 * Extract structured goal data from assistant response
 */
function extractGoalData(response: string, userMessageCount: number): { goalData: GoalData | null; cleanedResponse: string } {
  // Only extract data if we've had enough interactions (at least 5)
  if (userMessageCount < 6) {
    return { goalData: null, cleanedResponse: response };
  }
  
  // Look for JSON data enclosed in triple backticks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      
      // Check if we have minimal valid goal data
      if (jsonData.title && jsonData.goal_type) {
        // Set default dates if not provided
        const today = new Date();
        
        // Set default start date to today if not provided
        if (!jsonData.start_date) {
          jsonData.start_date = today.toISOString().split("T")[0];
        }
        
        // Set default target date to one month from now if not provided
        if (!jsonData.target_date) {
          const targetDate = new Date(today);
          targetDate.setMonth(targetDate.getMonth() + 1);
          jsonData.target_date = targetDate.toISOString().split("T")[0];
        }
        
        // Provide default description if missing
        if (!jsonData.description) {
          jsonData.description = `My ${jsonData.goal_type} goal: ${jsonData.title}`;
        }
        
        // Remove the JSON block from the response
        const cleanedResponse = response.replace(/```(?:json)?\s*[\s\S]*?\s*```/, "").trim();
        
        return {
          goalData: jsonData,
          cleanedResponse: cleanedResponse || "I've created a goal based on our conversation. Does this look good?"
        };
      }
    } catch (error) {
      console.error("Error parsing goal JSON data:", error);
    }
  }
  
  return { goalData: null, cleanedResponse: response };
}

/**
 * Cache conversation context in Deno KV
 */
async function setConversationContext(_key: string, _context: unknown): Promise<void> {
  try {
    // In a real implementation, this would use Deno KV or another storage mechanism
    // For now we're just logging it
    console.log(`Would cache conversation context`);
  } catch (error) {
    console.error("Error caching conversation context:", error);
  }
}

/**
 * Get cached conversation context
 */
async function getConversationContext(_key: string): Promise<unknown | null> {
  try {
    // In a real implementation, this would retrieve from Deno KV or another storage mechanism
    return null;
  } catch (error) {
    console.error("Error retrieving conversation context:", error);
    return null;
  }
}

/**
 * Fetch Gemini API key from Supabase API keys table
 */
async function fetchGeminiApiKey(): Promise<string> {
  // For our edge function, we can't use the Supabase client directly
  // This would need to be implemented with a proper fetch to your API keys endpoint
  // But we'll just return a fallback key for simplicity in this example
  return "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0";
}
