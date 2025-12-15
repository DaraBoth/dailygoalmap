import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

declare const Deno: {
  env: {
    get(key: string): string | undefined;
    toObject(): Record<string, string>;
  };
};

interface Message {
  role: string;
  content: string;
}

interface RequestData {
  messages: Message[];
  stage?: string;
  conversationId?: string;
}

// Main serve handler
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    // Parse request data
    const requestData = await parseRequestData(req);
    
    // Get Gemini API key
    const geminiApiKey = await getGeminiApiKey();
    if (!geminiApiKey) {
      return createErrorResponse("API key not available");
    }

    // Format messages for Gemini API
    const promptForStage = getPromptForStage(requestData.stage || "collecting");
    const formattedMessages = formatMessagesForGemini(requestData.messages, promptForStage);

    // Return the streaming response
    return createStreamingResponse(formattedMessages, geminiApiKey);
  } catch (error) {
    console.error("Error in generate-goal-chat-stream function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Processing error: ${errorMessage}`);
  }
});

// Handle CORS preflight requests
function handleCorsPreflightRequest(): Response {
  return new Response(null, { 
    status: 204, 
    headers: corsHeaders 
  });
}

// Parse request data
async function parseRequestData(req: Request): Promise<RequestData> {
  const { messages, stage, conversationId } = await req.json();
  
  // Log the request
  console.log("Chat request received:", { 
    messageCount: messages?.length,
    stage, 
    conversationId: conversationId ? `${conversationId.substring(0, 8)}...` : 'none'
  });

  return { messages, stage, conversationId };
}

// Create error response
function createErrorResponse(message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 200, // Use 200 instead of 500 to prevent errors in the frontend
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}

interface GeminiMessage {
  role: string;
  parts: Array<{ text: string }>;
}

// Create streaming response
function createStreamingResponse(formattedMessages: GeminiMessage[], geminiApiKey: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Call Gemini API
        const response = await callGeminiApi(formattedMessages, geminiApiKey);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error: ${response.status}`, errorText);
          throw new Error(`Gemini API error: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Process the stream
        await processGeminiStream(response.body, controller, encoder);
      } catch (error) {
        handleStreamingError(error, controller, encoder);
      }
    }
  });

  // Return the stream
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}

// Call Gemini API
async function callGeminiApi(formattedMessages: GeminiMessage[], geminiApiKey: string): Promise<Response> {
  return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: formattedMessages,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 800,
      },
    }),
  });
}

// Process Gemini stream
async function processGeminiStream(
  responseBody: ReadableStream<Uint8Array>, 
  controller: ReadableStreamDefaultController, 
  encoder: TextEncoder
): Promise<void> {
  const reader = responseBody.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Convert the chunk to text and parse JSON
    const chunk = decoder.decode(value, { stream: true });
    
    try {
      // Gemini streams JSON objects, so we need to parse and extract text
      const lines = chunk.split("\n").filter((line: string) => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') continue;
          
          const jsonObj = JSON.parse(jsonStr);
          
          if (jsonObj.candidates && 
              jsonObj.candidates[0]?.content?.parts && 
              jsonObj.candidates[0].content.parts[0]?.text) {
            const text = jsonObj.candidates[0].content.parts[0].text;
            controller.enqueue(encoder.encode(text));
          }
        } else if (line.trim()) {
          // In case of non-standard format, forward as is
          controller.enqueue(encoder.encode(line));
        }
      }
    } catch {
      // If we can't parse JSON, just forward the raw chunk
      console.error("Error parsing chunk");
      controller.enqueue(value);
    }
  }
  
  controller.close();
}

// Handle streaming error
function handleStreamingError(
  error: unknown, 
  controller: ReadableStreamDefaultController, 
  encoder: TextEncoder
): void {
  console.error("Error streaming Gemini API response:", error);
  // Send error message
  const errorMessage = "I'm having trouble processing your request. Please try again.";
  controller.enqueue(encoder.encode(errorMessage));
  controller.close();
}

// Helper function to get the Gemini API key
async function getGeminiApiKey(): Promise<string> {
  try {
    // Check for environment variable
    const envApiKey = Deno.env.get('GEMINI_API_KEY');
    if (envApiKey) return envApiKey;
    
    // Fallback keys
    const fallbackKeys = [
      "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0",
      "AIzaSyD2SN814JxX4hDIpJfQjgSYTezEn-X3I2k"
    ];
    
    // Attempt to get API key from database
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/api_keys?key_type=eq.gemini&is_default=eq.true`, {
        headers: {
          'ApiKey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const keys = await response.json();
        if (keys.length > 0 && keys[0].key_value) {
          return keys[0].key_value;
        }
      }
    }
    
    // Return first fallback key if nothing else works
    return fallbackKeys[0];
  } catch (error) {
    console.error("Error fetching API key:", error);
    return "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0";
  }
}

// Helper function to get appropriate prompt based on conversation stage
function getPromptForStage(stage: string): string {
  if (stage === "confirming") {
    return `You are helping a user finalize a goal they're planning. Help refine their goal or answer questions. If they confirm, extract the goal information in JSON format. 
    
    IMPORTANT GUIDELINES:
    - Ask short, direct questions that are easy to understand
    - Use simple language and avoid jargon
    - Use Markdown formatting to highlight key points with **bold** or *italics*
    - Keep your responses brief and focused
    - Break up information into short paragraphs or bullet points`;
  }
  
  // Default collecting stage
  return `You are a helpful Goal Planning Assistant that helps create goals. 
  
  IMPORTANT GUIDELINES:
  - Ask short, direct questions that are easy to understand
  - Use simple language and avoid jargon  
  - Use Markdown formatting to highlight key points with **bold** or *italics*
  - Keep your responses brief and focused
  - Break up information into short paragraphs or bullet points
  
  For travel goals, collect:
  - Destination
  - Dates
  - Budget
  - Accommodation
  - Transportation
  - Activities
  
  For other goals, collect:
  - Achievement target
  - Timeline
  - Metrics
  - Resources needed
  
  When you have enough information, summarize the goal and ask for confirmation.`;
}

// Helper function to format messages for Gemini API
function formatMessagesForGemini(clientMessages: Message[], prompt: string): GeminiMessage[] {
  const formattedMessages: GeminiMessage[] = [];
  
  // Add system prompt as user message at the beginning
  formattedMessages.push({
    role: "user",
    parts: [{ text: prompt }]
  });
  
  // Map client messages to Gemini format
  if (Array.isArray(clientMessages)) {
    for (const msg of clientMessages) {
      formattedMessages.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      });
    }
  }
  
  return formattedMessages;
}
