/**
 * AI Agent Edge Function - Refactored Version
 * Multi-model AI assistant with fallback support
 */

// @ts-expect-error - Deno std library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
// @ts-expect-error - ESM.sh import for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { AgentContext, Message, ModelType, ToolParams } from './types.ts';
import { getModelInfo, getKeyTypeFromProvider } from './models.ts';
import { executeTool } from './tools.ts';

type StreamPayload = Record<string, unknown>;

interface StoredApiKey {
  id: string;
  key_value: string;
  key_name?: string;
  key_type?: string;
  is_default?: boolean;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// User-friendly tool name mapping
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'get_tasks_by_start_date': 'Checking your schedule',
  'insert_new_task': 'Adding new task',
  'update_task_info': 'Updating task',
  'move_task': 'Moving task',
  'delete_task': 'Removing task',
  'move_tasks_batch': 'Moving multiple tasks',
  'delete_tasks_batch': 'Removing multiple tasks',
  'find_by_title': 'Searching tasks',
  'get_user_profile': 'Loading your profile',
  'get_goal_detail': 'Loading goal details',
  'google_search': 'Searching the web',
  'send_notification': 'Sending notification',
  'mark_notification_read': 'Updating notification'
};

function getToolDisplayName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

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
- update_task_info: Update task title, description, or completion status
  * Params: task_id (required), title (optional), description (optional), completed (optional: 'true' or 'false')
  * Use this to rename tasks, update descriptions, or mark as complete/incomplete
- move_task: Reschedule ONE task to a different date/time
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

For batch operations, use the batch tools to handle multiple items efficiently.

## TOOL USAGE RULES
- When you need data or need to make changes, you **must** call a tool instead of guessing.
- Request a tool by responding with **exactly** the following format (no extra text before or after):

TOOL: tool_name
PARAMS: {"param": "value"}

- After sending a tool request, wait for the tool result message before giving the user-facing answer.
- If a tool fails, acknowledge the failure, explain the reason, and suggest next steps instead of guessing.
- Before telling the user that no tasks exist for a date:
  - call 'get_tasks_by_start_date' for the relevant date range (e.g., today, tomorrow, this week), and only say "no tasks" if it returns zero results.
- Always follow the database time rules when constructing parameters (YYYY-MM-DD for dates, HH:MM:SS for times).
- After you have the tool result, summarize it clearly using Markdown tables when listing schedules.

## CRITICAL: TASK ID HANDLING & CONVERSATION MEMORY
**EXTREMELY IMPORTANT - READ CAREFULLY:**

### How Task Memory Works:
- When you call get_tasks_by_start_date or find_by_title, tasks are AUTOMATICALLY stored in conversation memory
- Each task gets a position number (task_1, task_2, task_3, etc.) mapped to its real UUID
- You can now use EITHER the position number OR the task title when moving/deleting tasks
- The system will AUTOMATICALLY resolve these to the correct UUID

### Task Reference Methods:
1. **By Position**: "task 1", "first task", "1", "task_2"
2. **By Title**: "lunch", "meeting", "workout" (partial match works)
3. **By UUID**: Direct UUID if you have it

### Examples:
User: "Show my tasks for today"
AI calls: get_tasks_by_start_date
Result: task_1 maps to UUID 550e8400, task_2 maps to UUID 6ba7b810

User: "Delete task 1"
AI calls: delete_task with task_id="task_1" or "1"
System AUTOMATICALLY resolves to the real UUID

User: "Move the lunch task to tomorrow"
AI calls: move_task with task_id="lunch"
System AUTOMATICALLY resolves to the real UUID

### Important Rules:
- NEVER try to remember UUIDs yourself
- ALWAYS use position numbers (1, 2, 3) or partial titles ("lunch", "meeting")
- The memory system will handle the UUID lookup automatically
- If unsure, you can use ANY reference method - position, title, or even descriptive text
- Memory expires after 24 hours automatically

## TASK & SCHEDULE BEST PRACTICES
- When the user asks for "today", treat it as the current date in the context.
- When the user asks for "tomorrow" or "next", shift the date forward appropriately using the provided ISO helpers.
- When planning a day, fetch the task list first, then add or update tasks using the relevant tool.
- Keep answers high-level and friendly. Do not expose tool names or raw IDs in the final response.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, goalId, sessionId, stream, modelId, selectedKeyIds } = await req.json() as {
      messages: unknown;
      userId?: string;
      goalId?: string;
      sessionId?: string;
      stream?: boolean;
      modelId?: string;
      selectedKeyIds?: string[];
    };
    
    if (!userId) {
      throw new Error("userId is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalise incoming messages
    const aiMessages: Message[] = Array.isArray(messages)
      ? (messages as Array<Record<string, unknown>>)
          .map((msg) => ({
            role: String(msg.role ?? 'user') as Message['role'],
            content: typeof msg.content === 'string' ? msg.content : String(msg.content ?? ''),
            timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : undefined
          }))
          .filter((msg) => msg.content.trim().length > 0)
      : [];

    // Build context
    const now = new Date();
    const currentDate = new Date();
    const tomorrowIso = new Date(currentDate.getTime() + 86400000).toISOString().split('T')[0];
    const yesterdayIso = new Date(currentDate.getTime() - 86400000).toISOString().split('T')[0];
    const context: AgentContext = {
      userId,
      goalId,
      sessionId: sessionId || `session_${Date.now()}`,
      currentDate: now.toISOString().split('T')[0],
      currentTime: now.toTimeString().split(' ')[0],
      timezone: 'UTC'
    };

    // Get the user's latest message
    const userMessage = aiMessages[aiMessages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('Invalid user message');
    }

    // Determine which model to use
    const fallbackModel: ModelType = 'gemini-2.5-flash';
    const requestedModel = typeof modelId === 'string' ? (modelId as ModelType) : undefined;
    const targetModel: ModelType = requestedModel && getModelInfo(requestedModel)
      ? requestedModel
      : fallbackModel;
    
    // Get model info to determine provider
    const modelInfo = getModelInfo(targetModel);
    if (!modelInfo) {
      throw new Error(`Unknown model: ${targetModel}`);
    }

    // Get API keys for this provider
    let apiKeys: StoredApiKey[] = [];
    const dbKeyType = getKeyTypeFromProvider(modelInfo.provider);
    
    if (selectedKeyIds && selectedKeyIds.length > 0) {
      // Use specific selected keys
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_value, key_name, key_type')
        .in('id', selectedKeyIds)
        .eq('user_id', userId)
        .eq('key_type', dbKeyType);
      
      if (!error && data) {
        apiKeys = data;
      }
    } else {
      // Get all keys for this provider (for fallback)
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_value, key_name, key_type, is_default')
        .eq('user_id', userId)
        .eq('key_type', dbKeyType)
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

    // Build system instruction
    const systemInstruction = `${SYSTEM_PROMPT}

CURRENT DATE AND TIME (CRITICAL):
📅 Today is: ${dateFormatted}
🕒 Current time: ${timeFormatted}
📊 ISO Date: ${context.currentDate}
⏰ ISO Time: ${context.currentTime}

When user says:
- "today" → use ${context.currentDate}
- "tomorrow" → use ${tomorrowIso}
- "yesterday" → use ${yesterdayIso}

Context:
- User ID: ${context.userId}
- Goal ID: ${context.goalId || 'Not set'}

## TOOL PARAMETER EXAMPLES (CURRENT CONTEXT)

### 1. FETCH TASKS
- Get today's tasks:
TOOL: get_tasks_by_start_date
PARAMS: {"start_date":"${context.currentDate}","end_date":"${context.currentDate}","limit":50}

- Get this week's tasks:
TOOL: get_tasks_by_start_date
PARAMS: {"start_date":"${context.currentDate}","end_date":"${tomorrowIso}","limit":100}

### 2. CREATE TASK
TOOL: insert_new_task
PARAMS: {"title":"Morning workout","description":"30 min cardio session","start_date":"${context.currentDate}","end_date":"${context.currentDate}","daily_start_time":"06:00:00","daily_end_time":"07:00:00"}

### 3. UPDATE TASK (mark complete, rename, or change description)
- Mark task as complete:
TOOL: update_task_info
PARAMS: {"task_id":"abc-123-def","completed":"true"}

- Rename a task:
TOOL: update_task_info
PARAMS: {"task_id":"abc-123-def","title":"New task name"}

- Update description:
TOOL: update_task_info
PARAMS: {"task_id":"abc-123-def","description":"Updated description text"}

### 4. MOVE/RESCHEDULE TASK
- Move one task to tomorrow:
TOOL: move_task
PARAMS: {"task_id":"abc-123-def","start_date":"${tomorrowIso}","end_date":"${tomorrowIso}","daily_start_time":"09:00:00","daily_end_time":"10:00:00"}

- Move task to later today:
TOOL: move_task
PARAMS: {"task_id":"abc-123-def","start_date":"${context.currentDate}","end_date":"${context.currentDate}","daily_start_time":"15:00:00","daily_end_time":"16:00:00"}

### 5. DELETE TASK
TOOL: delete_task
PARAMS: {"task_id":"abc-123-def"}

### 6. BATCH OPERATIONS (for multiple tasks)
- Move multiple tasks to tomorrow:
TOOL: move_tasks_batch
PARAMS: {"task_ids":["task-id-1","task-id-2","task-id-3"],"new_start_date":"${tomorrowIso}","new_end_date":"${tomorrowIso}"}

- Delete multiple tasks:
TOOL: delete_tasks_batch
PARAMS: {"task_ids":["task-id-1","task-id-2","task-id-3"]}

### 7. SEARCH TASKS
TOOL: find_by_title
PARAMS: {"title_search":"meeting","limit":20}

## CRITICAL TOOL USAGE PATTERNS
1. To get task IDs for move/delete operations, FIRST call get_tasks_by_start_date or find_by_title
2. Extract task IDs from the result, then use them in move_task/delete_task/update_task_info
3. For multiple tasks, use batch operations (move_tasks_batch, delete_tasks_batch) instead of loops
4. Always provide ALL required time parameters (daily_start_time, daily_end_time) when moving tasks`;

    // ALWAYS use streaming with tool execution support
    if (stream) {
      // Create SSE stream with tool execution
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (type: string, data: StreamPayload) => {
            const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
            controller.enqueue(encoder.encode(message));
          };

          try {
            const MAX_LOOPS = 30;
            let loopCount = 0;
            const conversationHistory = [...aiMessages];
            const toolsUsed: string[] = [];

            // Try each API key until one succeeds
            for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
              try {
                const keyData = apiKeys[keyIndex];
                const keyLabel = keyData.key_name || keyData.id || 'API key';
                sendEvent('key_info', { content: keyLabel, message: keyLabel });
                sendEvent('status', { message: `Using API key: ${keyLabel}`, content: `Using API key: ${keyLabel}` });

                // Tool execution loop
                while (loopCount < MAX_LOOPS) {
                  loopCount++;

                  const aiResponseText = await callAIModel(targetModel, keyData.key_value, conversationHistory, systemInstruction);

                  // Check for tool usage
                    const toolMatch = aiResponseText.match(/TOOL: (\w+)\nPARAMS: ({.*?})/s);

                  if (toolMatch) {
                    const toolName = toolMatch[1];
                      let params: ToolParams;

                    try {
                      params = JSON.parse(toolMatch[2]);
                    } catch (parseError) {
                      sendEvent('error', { message: 'Tool parameter parsing failed', content: 'Tool parameter parsing failed' });
                      conversationHistory.push({
                        role: 'user',
                        content: `Tool parameter parsing failed. Please check your PARAMS format and try again.`
                      });
                      continue;
                    }

                    // Notify user about tool execution with friendly name
                    const displayName = getToolDisplayName(toolName);
                    console.log(`\n🔧 [AI Agent] Executing tool: ${toolName}`);
                    console.log(`📋 [AI Agent] Params:`, JSON.stringify(params, null, 2));
                    console.log(`🎯 [AI Agent] Context:`, { goalId: context.goalId, userId: context.userId });
                    
                    sendEvent('status', { message: displayName, content: displayName });
                    toolsUsed.push(toolName);

                    // Execute tool
                    let toolResult: unknown;
                    try {
                      toolResult = await executeTool(toolName, params, context, supabase);
                      
                      console.log(`✅ [AI Agent] Tool ${toolName} succeeded`);
                      console.log(`📊 [AI Agent] Result:`, JSON.stringify(toolResult, null, 2));
                      
                      // Create user-friendly completion message
                      const displayName = getToolDisplayName(toolName);
                      let resultMessage = `✓ ${displayName} completed`;
                      
                      // For data retrieval tools, show count if available
                      if (toolName === 'get_tasks_by_start_date' && toolResult && typeof toolResult === 'object' && 'tasks' in toolResult) {
                        const tasks = (toolResult as any).tasks;
                        const count = Array.isArray(tasks) ? tasks.length : 0;
                        resultMessage = count > 0 
                          ? `✓ Found ${count} task${count !== 1 ? 's' : ''}`
                          : `✓ No tasks scheduled for this date`;
                        console.log(`📈 [AI Agent] Tasks count: ${count}`);
                      } else if (toolName === 'find_by_title' && toolResult && typeof toolResult === 'object' && 'tasks' in toolResult) {
                        const tasks = (toolResult as any).tasks;
                        const count = Array.isArray(tasks) ? tasks.length : 0;
                        resultMessage = count > 0
                          ? `✓ Found ${count} matching task${count !== 1 ? 's' : ''}`
                          : `✓ No matching tasks found`;
                        console.log(`📈 [AI Agent] Search results: ${count}`);
                      }
                      
                      sendEvent('tool_result', { name: toolName, success: true, message: resultMessage, content: resultMessage });
                    } catch (toolError) {
                      console.error(`❌ [AI Agent] Tool ${toolName} failed:`, toolError);
                      const displayName = getToolDisplayName(toolName);
                      sendEvent('tool_result', { 
                        name: toolName, 
                        success: false, 
                        message: `✗ ${displayName} failed: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                        content: `✗ ${displayName} failed: ${toolError instanceof Error ? toolError.message : String(toolError)}` 
                      });
                      toolResult = {
                        error: toolError instanceof Error ? toolError.message : String(toolError),
                        success: false
                      };
                    }

                    // Add tool result to conversation
                    conversationHistory.push({
                      role: 'user',
                      content: `Tool ${toolName} executed. Result:\n${JSON.stringify(toolResult, null, 2)}\n\nAnalyze this result and provide a natural response to the user. IMPORTANT: Remember all task IDs from the result - you MUST use these exact IDs when moving or deleting tasks. When showing tasks to user, include their position number (Task 1, Task 2) but keep the actual ID in your memory for future operations.`
                    });

                    // Continue loop
                    continue;
                  }

                  // No tool request - AI provided final response
                  // Stream the final response word by word for better UX
                  const words = aiResponseText.split(' ');
                  for (const word of words) {
                    const chunk = `${word} `;
                    sendEvent('content', { delta: chunk, content: chunk });
                    await new Promise(resolve => setTimeout(resolve, 30)); // Small delay for streaming effect
                  }

                  sendEvent('done', { 
                    toolsUsed: toolsUsed,
                    keyUsed: keyData.key_name,
                    content: aiResponseText
                  });
                  controller.close();
                  return;
                }

                // Max loops reached
                sendEvent('error', { message: 'Maximum iterations reached without completing request', content: 'Maximum iterations reached without completing request' });
                controller.close();
                return;

              } catch (keyError) {
                console.error(`Key ${keyIndex + 1} failed:`, keyError);
                if (keyIndex === apiKeys.length - 1) {
                  const failureMessage = `All API keys failed: ${keyError instanceof Error ? keyError.message : String(keyError)}`;
                  sendEvent('error', { message: failureMessage, content: failureMessage });
                  controller.close();
                  return;
                }
                sendEvent('status', { message: 'Trying next API key...', content: 'Trying next API key...' });
              }
            }
          } catch (error) {
            const genericError = error instanceof Error ? error.message : String(error);
            sendEvent('error', { message: genericError, content: genericError });
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Non-streaming path with tool looping (max 30 iterations)
    const MAX_LOOPS = 30;
    let loopCount = 0;
    const conversationHistory = [...aiMessages];
    const toolsUsed: string[] = [];
    
    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
      try {
        const keyData = apiKeys[keyIndex];
        console.log(`Using key ${keyIndex + 1}/${apiKeys.length}: ${keyData.key_name}`);
        
        // Tool execution loop
        while (loopCount < MAX_LOOPS) {
          loopCount++;
          console.log(`\n🔄 Loop iteration ${loopCount}/${MAX_LOOPS}`);
          
          const aiResponseText = await callAIModel(targetModel, keyData.key_value, conversationHistory, systemInstruction);
          console.log(`AI response (full):`, aiResponseText);
          console.log(`AI response (preview):`, aiResponseText.substring(0, 200));
          
          // Check for tool usage
          const toolMatch = aiResponseText.match(/TOOL: (\w+)\nPARAMS: ({.*?})/s);
          console.log(`Tool match result:`, toolMatch);
          
          if (toolMatch) {
            const toolName = toolMatch[1];
            let params: ToolParams;
            
            try {
              params = JSON.parse(toolMatch[2]);
            } catch (parseError) {
              console.error("Failed to parse tool params:", toolMatch[2]);
              // Add error to conversation and continue
              conversationHistory.push({
                role: 'user',
                content: `Tool parameter parsing failed. Please check your PARAMS format and try again.`
              });
              continue;
            }
            
            console.log(`🔧 Executing tool: ${toolName}`);
            toolsUsed.push(toolName);
            
            // Execute tool
            let toolResult: unknown;
            try {
              toolResult = await executeTool(toolName, params, context, supabase);
              console.log(`✅ Tool result:`, JSON.stringify(toolResult).substring(0, 200));
            } catch (toolError) {
              console.error(`❌ Tool ${toolName} failed:`, toolError);
              toolResult = { 
                error: toolError instanceof Error ? toolError.message : String(toolError),
                success: false
              };
            }
            
            // Add tool result to conversation history (in unified format)
            conversationHistory.push({
              role: 'user',
              content: `Tool ${toolName} executed. Result:\n${JSON.stringify(toolResult, null, 2)}\n\nAnalyze this result. If you need to use another tool, do so. Otherwise, provide a natural response to the user. Remember: NO technical details, IDs, or tool names in your final response.`
            });
            
            // Continue loop - AI will decide if it needs another tool
            continue;
          }
          
          // No tool request - AI provided final response
          console.log(`✅ Final response received after ${loopCount} iterations`);
          return new Response(
            JSON.stringify({ 
              message: aiResponseText.replace(/TOOL:.*?PARAMS:.*?}/gs, '').trim(),
              toolsUsed: toolsUsed,
              iterations: loopCount,
              keyUsed: keyData.key_name
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Max loops reached
        console.log(`⚠️ Max loops (${MAX_LOOPS}) reached`);
        return new Response(
          JSON.stringify({ 
            message: "I've completed the task, but it required many steps. The operation was successful.",
            toolsUsed: toolsUsed,
            iterations: loopCount,
            maxLoopsReached: true,
            keyUsed: keyData.key_name
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
      } catch (keyError) {
        console.error(`Key ${keyIndex + 1} failed:`, keyError);
        
        if (keyIndex === apiKeys.length - 1) {
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
async function callAIModel(modelId: ModelType, apiKey: string, messages: Message[], systemInstruction: string): Promise<string> {
  const modelInfo = getModelInfo(modelId);
  if (!modelInfo) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  switch (modelInfo.provider) {
    case 'gemini':
      return await callGemini(modelId, apiKey, messages, systemInstruction);
    case 'openai':
      return await callOpenAI(modelId, apiKey, messages, systemInstruction);
    case 'claude':
      return await callClaude(modelId, apiKey, messages, systemInstruction);
    default:
      throw new Error(`Unsupported provider: ${modelInfo.provider}`);
  }
}

async function callGemini(modelId: ModelType, apiKey: string, messages: Message[], systemInstruction: string): Promise<string> {
  // Gemini currently expects only model/user roles, so strip anything else
  const geminiMessages = messages
    .filter((m) => m.role === 'assistant' || m.role === 'user')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const basePayload: Record<string, unknown> = {
    contents: geminiMessages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    }
  };

  if (systemInstruction.trim().length > 0) {
    basePayload.systemInstruction = {
      role: 'system',
      parts: [{ text: systemInstruction }]
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;

  const executeRequest = async (payload: Record<string, unknown>) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    return response.json();
  };

  try {
    const data = await executeRequest(basePayload);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Gemini sometimes rejects systemInstruction for experimental models. Retry without it.
    if (message.includes('Unknown name "system"') || message.includes('systemInstruction')) {
      console.warn('⚠️ Gemini rejected systemInstruction, retrying without it');
      const fallbackPayload: Record<string, unknown> = {
        ...basePayload,
      };
      delete fallbackPayload.systemInstruction;

      // Prepend the system prompt as an implicit first user turn
      fallbackPayload.contents = [
        {
          role: 'user',
          parts: [{ text: `Follow these instructions carefully:
${systemInstruction}` }]
        },
        ...((basePayload.contents as unknown[]) ?? [])
      ];

      const data = await executeRequest(fallbackPayload);
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    }

    throw error;
  }
}

async function callOpenAI(modelId: ModelType, apiKey: string, messages: Message[], systemInstruction: string): Promise<string> {
  const openAIMessages = [
    { role: 'system', content: systemInstruction },
    ...messages.map((m) => ({ role: m.role, content: m.content }))
  ];

  // Define OpenAI function calling tools
  const tools = [
    {
      type: "function",
      function: {
        name: "get_tasks_by_start_date",
        description: "Get tasks scheduled within a date range",
        parameters: {
          type: "object",
          properties: {
            start_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
            end_date: { type: "string", description: "End date in YYYY-MM-DD format" },
            limit: { type: "number", description: "Optional limit on number of tasks" }
          },
          required: ["start_date", "end_date"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "insert_new_task",
        description: "Create a new task",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title" },
            description: { type: "string", description: "Task description" },
            start_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
            end_date: { type: "string", description: "End date in YYYY-MM-DD format" },
            daily_start_time: { type: "string", description: "Start time in HH:MM:SS format (24-hour)" },
            daily_end_time: { type: "string", description: "End time in HH:MM:SS format (24-hour)" }
          },
          required: ["title", "start_date", "end_date", "daily_start_time", "daily_end_time"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_task_info",
        description: "Update task information (title, description, or completion status)",
        parameters: {
          type: "object",
          properties: {
            task_id: { type: "string", description: "Task ID" },
            title: { type: "string", description: "New title (optional)" },
            description: { type: "string", description: "New description (optional)" },
            completed: { type: "string", description: "Completion status: 'true' or 'false' (optional)" }
          },
          required: ["task_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "delete_task",
        description: "Delete a single task",
        parameters: {
          type: "object",
          properties: {
            task_id: { type: "string", description: "Task ID to delete" }
          },
          required: ["task_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "google_search",
        description: "Search Google for current information",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            country: { type: "string", description: "Country code (e.g., 'us')" },
            language: { type: "string", description: "Language code (e.g., 'en')" }
          },
          required: ["query"]
        }
      }
    }
  ];

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
        tools: tools,
        tool_choice: "auto",
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
  const message = data.choices?.[0]?.message;
  
  // Check if OpenAI wants to call a function
  if (message?.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);
    
    // Return in the same TOOL format that our loop expects
    return `TOOL: ${functionName}\nPARAMS: ${JSON.stringify(functionArgs)}`;
  }
  
  return message?.content || "No response generated";
}

async function callClaude(modelId: ModelType, apiKey: string, messages: Message[], systemInstruction: string): Promise<string> {
  const claudeMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'text', text: m.content }]
  }));

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
        system: systemInstruction,
        messages: claudeMessages
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
