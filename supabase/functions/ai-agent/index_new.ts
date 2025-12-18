/**
 * AI Agent Edge Function - Refactored Version
 * Multi-model AI assistant with fallback support
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { AgentContext, Message, ModelType } from './types.ts';
import { getModelInfo, getModelsByProvider } from './models.ts';
import { streamAIResponse } from './streaming.ts';
import { executeTool } from './tools.ts';

const SYSTEM_PROMPT = `You are **GuoErrAI**, a personal AI assistant helping users manage their goals, tasks, and daily schedules.

## YOUR CAPABILITIES
- Plan daily schedules and activities
- Create and manage tasks
- Track progress and provide insights
- Answer questions about goals and tasks
- Provide personalized recommendations

## COMMUNICATION RULES
- Be conversational and friendly
- NEVER mention technical details (IDs, tool names, database fields)
- Use "you" and "your" (not "the user")
- Provide clear, actionable responses
- Use Markdown formatting

## FORMATTING GUIDELINES
**When showing tasks/schedules:**
- ALWAYS format as markdown tables with columns: Task | Description | Date | Time | Status
- Make dates and times easy to read (e.g., "Dec 5, 2024" instead of "2024-12-05")
- Include clickable links where relevant
- Show task descriptions to give full context
- Keep descriptions concise (truncate if too long)
- Example table format:

| Task | Description | Date | Time | Status |
|------|-------------|------|------|--------|
| Morning workout | 30 min cardio | Dec 5 | 06:00 - 07:00 | ✅ Done |
| Team meeting | Discuss project updates | Dec 5 | 10:00 - 11:00 | ⏳ Pending |

**When showing links:**
- Format as clickable buttons: [Button Text](url)
- For task management: [View Task](/goal/task-id)
- For external resources: [Read Article](https://example.com)

**When listing multiple items:**
- Use tables for structured data (tasks, schedules, comparisons)
- Use bullet points for simple lists
- Use numbered lists for sequential steps

## DATABASE SCHEMA KNOWLEDGE
Tasks table structure:
- start_date: DATE (format: "YYYY-MM-DD") - the day the task is scheduled
- end_date: DATE (format: "YYYY-MM-DD") - the day the task ends
- daily_start_time: TIME (format: "HH:MM:SS") - time of day the task starts (e.g., "14:30:00" for 2:30 PM)
- daily_end_time: TIME (format: "HH:MM:SS") - time of day the task ends (e.g., "15:30:00" for 3:30 PM)

CRITICAL TIME FORMAT RULES:
- NEVER use timestamp format for daily_start_time or daily_end_time
- Use 24-hour format: "09:00:00" (9 AM), "15:30:00" (3:30 PM), "22:00:00" (10 PM)
- Always include seconds: "HH:MM:SS"
- start_date and end_date are just dates: "2024-12-04", NOT timestamps

Examples:
✅ CORRECT: start_date="2024-12-04", daily_start_time="14:30:00"
❌ WRONG: start_date="2024-12-04T14:30:00", daily_start_time="2024-12-04T14:30:00"

## IMPORTANT: HANDLING MULTIPLE TASKS
When user asks to move/delete/update MULTIPLE tasks:
1. Use batch operations tools when available (move_tasks_batch, delete_tasks_batch)
2. For single operations, process one at a time and inform the user
3. ALWAYS confirm before batch deletes

## AVAILABLE TOOLS
You can request tool usage by responding with tool requests in this format:
TOOL: tool_name
PARAMS: {"param": "value"}

Available tools:
- get_user_profile: Get user information
- get_goal_detail: Get goal information  
- get_tasks_by_start_date: Get tasks in date range
  * Params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), limit (optional)
- insert_new_task: Create ONE new task
  * Params: title, description, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), daily_start_time (HH:MM:SS), daily_end_time (HH:MM:SS)
- update_task_info: Update ONE task (needs task_id)
- move_task: Reschedule ONE task
  * Params: task_id, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), daily_start_time (HH:MM:SS), daily_end_time (HH:MM:SS)
- move_tasks_batch: Move MULTIPLE tasks at once
  * Params: task_ids (array), new_start_date (YYYY-MM-DD), new_end_date (optional)
- delete_task: Delete ONE task (needs task_id)
- delete_tasks_batch: Delete MULTIPLE tasks at once (needs task_ids array)
- find_by_title: Search tasks by title
- google_search: Search Google for information
  * Params: query (search query), country (optional, e.g., 'us'), language (optional, e.g., 'en')
  * Use this when user asks questions requiring current information, facts, or web search
- send_notification: Send push notification to user
  * Params: title, message, url (optional)
  * Use this to remind users about important tasks or updates

For batch operations, use the batch tools to handle multiple items efficiently.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, goalId, sessionId, stream, modelId, selectedKeyIds } = await req.json();
    
    if (!userId) {
      throw new Error("userId is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context
    const now = new Date();
    const currentDate = new Date();
    const context: AgentContext = {
      userId,
      goalId,
      sessionId: sessionId || `session_${Date.now()}`,
      currentDate: now.toISOString().split('T')[0],
      currentTime: now.toTimeString().split(' ')[0],
      timezone: 'UTC'
    };

    // Get the user's latest message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('Invalid user message');
    }

    // Determine which model to use
    let targetModel: ModelType = modelId || 'gemini-2.0-flash-exp';
    
    // Get model info to determine provider
    const modelInfo = getModelInfo(targetModel);
    if (!modelInfo) {
      throw new Error(`Unknown model: ${targetModel}`);
    }

    // Get API keys for this provider
    let apiKeys: any[] = [];
    
    if (selectedKeyIds && selectedKeyIds.length > 0) {
      // Use specific selected keys
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_value, key_label, key_type')
        .in('id', selectedKeyIds)
        .eq('user_id', userId)
        .eq('key_type', modelInfo.provider);
      
      if (!error && data) {
        apiKeys = data;
      }
    } else {
      // Get all keys for this provider (for fallback)
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_value, key_label, key_type, is_default')
        .eq('user_id', userId)
        .eq('key_type', modelInfo.provider)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        apiKeys = data;
      }
    }

    if (apiKeys.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "NO_API_KEY",
          message: `No API key found for ${modelInfo.provider}. Please add one in Profile > API Key Management.`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Found ${apiKeys.length} API key(s) for ${modelInfo.provider}`);

    // Format date/time for prompt
    const dateFormatted = currentDate.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const timeFormatted = currentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });

    // Build AI messages
    const aiMessages = [
      {
        role: 'user',
        parts: [{
          text: `${SYSTEM_PROMPT}

CURRENT DATE AND TIME (CRITICAL):
📅 Today is: ${dateFormatted}
🕒 Current time: ${timeFormatted}
📊 ISO Date: ${context.currentDate}
⏰ ISO Time: ${context.currentTime}

When user says:
- "today" → use ${context.currentDate}
- "tomorrow" → use ${new Date(currentDate.getTime() + 86400000).toISOString().split('T')[0]}
- "yesterday" → use ${new Date(currentDate.getTime() - 86400000).toISOString().split('T')[0]}

Context:
- User ID: ${context.userId}
- Goal ID: ${context.goalId || 'Not set'}

Conversation history:
${messages.map((m: Message) => `${m.role}: ${m.content}`).join('\n')}`
        }]
      }
    ];

    // Check if streaming is requested
    if (stream) {
      // Try each API key until one succeeds
      for (let i = 0; i < apiKeys.length; i++) {
        try {
          const keyData = apiKeys[i];
          console.log(`Attempting stream with key ${i + 1}/${apiKeys.length}: ${keyData.key_label}`);
          
          const streamResponse = await streamAIResponse(
            targetModel,
            keyData.key_value,
            aiMessages,
            keyData.key_label
          );

          return new Response(streamResponse, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        } catch (streamError) {
          console.error(`Key ${i + 1} failed:`, streamError);
          
          // If this was the last key, return error
          if (i === apiKeys.length - 1) {
            throw streamError;
          }
          
          // Otherwise continue to next key
          console.log(`Trying next key...`);
        }
      }
    }

    // Non-streaming path - try each key for tool execution
    for (let i = 0; i < apiKeys.length; i++) {
      try {
        const keyData = apiKeys[i];
        console.log(`Attempting non-stream with key ${i + 1}/${apiKeys.length}: ${keyData.key_label}`);
        
        const aiResponseText = await callAIModel(targetModel, keyData.key_value, aiMessages);
        
        // Check for tool usage
        const toolMatch = aiResponseText.match(/TOOL: (\w+)\nPARAMS: ({.*?})/s);
        
        if (toolMatch) {
          const toolName = toolMatch[1];
          const params = JSON.parse(toolMatch[2]);
          
          const toolResult = await executeTool(toolName, params, context, supabase);
          
          // Get AI to format the result
          const followUpMessages = [{
            role: 'user',
            parts: [{
              text: `Tool ${toolName} executed. Result:\n${JSON.stringify(toolResult, null, 2)}\n\nPlease provide a natural response to the user based on this data. Remember: NO technical details, IDs, or tool names in your response.`
            }]
          }];

          const followUpResponse = await callAIModel(targetModel, keyData.key_value, [...aiMessages, ...followUpMessages]);

          return new Response(
            JSON.stringify({ 
              message: followUpResponse.replace(/TOOL:.*?PARAMS:.*?}/gs, '').trim(),
              toolUsed: toolName,
              keyUsed: keyData.key_label
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Return direct response
        return new Response(
          JSON.stringify({ 
            message: aiResponseText,
            keyUsed: keyData.key_label
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
      } catch (keyError) {
        console.error(`Key ${i + 1} failed:`, keyError);
        
        if (i === apiKeys.length - 1) {
          throw keyError;
        }
        
        console.log(`Trying next key...`);
      }
    }

    throw new Error('All API keys failed');

  } catch (error) {
    console.error("Error in AI agent:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An error occurred",
        message: "I'm having trouble processing your request. Please try again."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Non-streaming AI calls
async function callAIModel(modelId: ModelType, apiKey: string, messages: any[]): Promise<string> {
  const modelInfo = getModelInfo(modelId);
  if (!modelInfo) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  switch (modelInfo.provider) {
    case 'gemini':
      return await callGemini(modelId, apiKey, messages);
    case 'openai':
      return await callOpenAI(modelId, apiKey, messages);
    case 'claude':
      return await callClaude(modelId, apiKey, messages);
    default:
      throw new Error(`Unsupported provider: ${modelInfo.provider}`);
  }
}

async function callGemini(modelId: ModelType, apiKey: string, messages: any[]): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
}

async function callOpenAI(modelId: ModelType, apiKey: string, messages: any[]): Promise<string> {
  const openAIMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.parts ? msg.parts[0].text : msg.content
  }));

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 4096
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated";
}

async function callClaude(modelId: ModelType, apiKey: string, messages: any[]): Promise<string> {
  const claudeMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.parts ? msg.parts[0].text : msg.content
  }));

  let systemMessage = '';
  const userMessages = claudeMessages.filter(msg => {
    if (msg.content.includes('SYSTEM_PROMPT')) {
      systemMessage = msg.content;
      return false;
    }
    return true;
  });

  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 8192,
        temperature: 0.7,
        system: systemMessage || undefined,
        messages: userMessages.length > 0 ? userMessages : claudeMessages
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "No response generated";
}
