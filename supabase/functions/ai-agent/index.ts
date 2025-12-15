/**
 * AI Agent Edge Function - Refactored Version
 * Multi-model AI assistant with fallback support
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
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
- id: UUID (unique identifier for each task - REQUIRED for updates/deletes)
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

## CRITICAL: TASK ID USAGE
⚠️ NEVER use placeholder IDs like "task_1", "task_2", etc.
⚠️ ALWAYS use the ACTUAL UUID from the task's "id" field
- When you retrieve tasks using get_tasks_by_start_date, each task has an "id" field
- This ID is a UUID like "550e8400-e29b-41d4-a716-446655440000"
- Store these REAL IDs and use them for update_task_info, move_task, delete_task operations
- The conversation memory system will help you map "task 1" references to actual UUIDs

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
  * Returns tasks with their ACTUAL UUIDs in the "id" field - save these for updates/deletes
- insert_new_task: Create ONE new task
  * Params: title, description, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), daily_start_time (HH:MM:SS), daily_end_time (HH:MM:SS)
- update_task_info: Update task title, description, or completion status
  * Params: task_id (REQUIRED - use the ACTUAL UUID from the task's "id" field), title (optional), description (optional), completed (optional: 'true' or 'false')
  * Use this to rename tasks, update descriptions, or mark as complete/incomplete
  * ⚠️ task_id MUST be the real UUID, not "task_1" or similar placeholders
- move_task: Reschedule ONE task to a different date/time
  * Params: task_id (REQUIRED - use the ACTUAL UUID), start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), daily_start_time (HH:MM:SS), daily_end_time (HH:MM:SS)
  * ⚠️ task_id MUST be the real UUID from the database
- move_tasks_batch: Move MULTIPLE tasks at once
  * Params: task_ids (array of ACTUAL UUIDs), new_start_date (YYYY-MM-DD), new_end_date (optional)
- delete_task: Delete ONE task (needs task_id - the ACTUAL UUID)
  * ⚠️ task_id MUST be the real UUID, not a placeholder
- delete_tasks_batch: Delete MULTIPLE tasks at once (needs task_ids array of ACTUAL UUIDs)
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

### How Task IDs Work:
- Every task in the database has a unique UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")
- When you retrieve tasks via get_tasks_by_start_date, you get task objects with an "id" field
- This "id" field contains the ACTUAL UUID you MUST use for updates/deletes

### Task Memory System (for user convenience):
- Tasks are automatically stored with reference numbers (task_1, task_2, etc.) for USER convenience
- When a USER says "delete task 1", you can use task_id="1" or "task_1"
- The backend will automatically resolve these to the real UUID
- BUT: You should prefer extracting and using the actual UUID from the task result directly

### RECOMMENDED WORKFLOW:
1. User asks: "Delete my workout task"
2. You call: get_tasks_by_start_date or find_by_title
3. You receive the task object with an "id" field containing the UUID
4. You extract the ACTUAL ID from the result
5. You use that exact UUID in delete_task

### Alternative (using memory references):
1. After getting tasks, they are stored with position numbers (task_1, task_2, etc.)
2. You can reference them by position: "1", "2", "task_1", "task_2"
3. Backend automatically resolves these to the real UUID

### CORRECT Examples:
- Extract ID from result and use the actual UUID
- Use position numbers like "1" or "task_1" which backend resolves to UUID
- Use partial title matches like "workout" or "meeting" which backend finds in memory

### WRONG Examples (will fail):
- Making up IDs like "task_1" without first getting the tasks
- Using task titles as IDs directly without the memory system
- Inventing placeholder IDs that don't exist in the database

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
⚠️ CRITICAL: Use the REAL task ID from get_tasks_by_start_date results, NOT placeholders!

- Mark task as complete:
TOOL: update_task_info
PARAMS: {"task_id":"<USE-ACTUAL-UUID-FROM-TASK-RESULT>","completed":"true"}

- Rename a task:
TOOL: update_task_info
PARAMS: {"task_id":"<USE-ACTUAL-UUID-FROM-TASK-RESULT>","title":"New task name"}

- Update description:
TOOL: update_task_info
PARAMS: {"task_id":"<USE-ACTUAL-UUID-FROM-TASK-RESULT>","description":"Updated description text"}

### 4. MOVE/RESCHEDULE TASK
⚠️ CRITICAL: Use the REAL task ID from get_tasks_by_start_date results!

- Move one task to tomorrow:
TOOL: move_task
PARAMS: {"task_id":"<USE-ACTUAL-UUID-FROM-TASK-RESULT>","start_date":"${tomorrowIso}","end_date":"${tomorrowIso}","daily_start_time":"09:00:00","daily_end_time":"10:00:00"}

- Move task to later today:
TOOL: move_task
PARAMS: {"task_id":"<USE-ACTUAL-UUID-FROM-TASK-RESULT>","start_date":"${context.currentDate}","end_date":"${context.currentDate}","daily_start_time":"15:00:00","daily_end_time":"16:00:00"}

### 5. DELETE TASK
⚠️ CRITICAL: Use the REAL task ID from get_tasks_by_start_date results!

TOOL: delete_task
PARAMS: {"task_id":"<USE-ACTUAL-UUID-FROM-TASK-RESULT>"}

### 6. BATCH OPERATIONS (for multiple tasks)
⚠️ CRITICAL: Use REAL task IDs from get_tasks_by_start_date results!

- Move multiple tasks to tomorrow:
TOOL: move_tasks_batch
PARAMS: {"task_ids":["<REAL-UUID-1>","<REAL-UUID-2>","<REAL-UUID-3>"],"new_start_date":"${tomorrowIso}","new_end_date":"${tomorrowIso}"}

- Delete multiple tasks:
TOOL: delete_tasks_batch
PARAMS: {"task_ids":["<REAL-UUID-1>","<REAL-UUID-2>","<REAL-UUID-3>"]}

### 7. SEARCH TASKS
TOOL: find_by_title
PARAMS: {"title_search":"meeting","limit":20}

## CRITICAL TOOL USAGE PATTERNS
⚠️⚠️⚠️ MOST IMPORTANT: NEVER INVENT TASK IDs! ⚠️⚠️⚠️

**CORRECT WORKFLOW for updating/deleting tasks:**
1. User says: "Delete the workout task"
2. You call: get_tasks_by_start_date or find_by_title to get the task
3. You receive task data with ACTUAL UUIDs in the "id" field
4. You extract the real UUID from the response
5. You use that exact UUID in your delete_task call

**WRONG WORKFLOW (will fail):**
1. User says: "Delete the workout task"
2. You immediately call delete_task with an invented ID ❌

ALWAYS fetch first, then act with the real ID!`;

    // Prepare messages for API call
    const formattedMessages = [
      {
        role: 'user',
        parts: [{
          text: `${systemInstruction}

Conversation history:
${aiMessages.map((m: Message) => `${m.role}: ${m.content}`).join('\n')}`
        }]
      }
    ];

    // Make the AI call
    const apiKey = apiKeys[0].key_value;
    const aiResponseText = await callAIModel(targetModel, apiKey, formattedMessages);

    // Check if AI is requesting tool usage
    const toolMatch = aiResponseText.match(/TOOL: (\w+)\nPARAMS: ({.*?})/s);
    
    if (toolMatch) {
      const toolName = toolMatch[1];
      let params: ToolParams;
      
      try {
        params = JSON.parse(toolMatch[2]);
      } catch {
        return new Response(
          JSON.stringify({ 
            message: "I understood what you want, but had trouble executing it. Could you rephrase your request?"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Execute tool
      let toolResult;
      try {
        console.log(`Executing tool: ${toolName} with params:`, JSON.stringify(params));
        toolResult = await executeTool(toolName, params, context, supabase);
        console.log(`Tool ${toolName} result:`, JSON.stringify(toolResult).substring(0, 300));
      } catch (error) {
        console.error(`Tool ${toolName} execution failed:`, error);
        toolResult = { error: error instanceof Error ? error.message : String(error) };
      }

      // Get AI to process the tool result
      const followUpMessages = [
        ...formattedMessages,
        {
          role: 'user',
          parts: [{
            text: `Tool ${toolName} executed. Result:\n${JSON.stringify(toolResult, null, 2)}\n\nPlease provide a natural response to the user based on this data. Remember: NO technical details, IDs, or tool names in your response.`
          }]
        }
      ];

      try {
        const followUpResponse = await callAIModel(targetModel, apiKey, followUpMessages);

        return new Response(
          JSON.stringify({ 
            message: followUpResponse.replace(/TOOL:.*?PARAMS:.*?}/gs, '').trim(),
            toolUsed: toolName
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ 
            message: `Action completed successfully.`,
            toolUsed: toolName
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return direct response if no tools needed
    return new Response(
      JSON.stringify({ message: aiResponseText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

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
async function callAIModel(modelId: ModelType, apiKey: string, messages: Array<{role: string; parts: Array<{text: string}>}>): Promise<string> {
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

async function callGemini(modelId: ModelType, apiKey: string, messages: Array<{role: string; parts: Array<{text: string}>}>): Promise<string> {
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

async function callOpenAI(modelId: ModelType, apiKey: string, messages: Array<{role: string; parts: Array<{text: string}>}>): Promise<string> {
  const openAIMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.parts ? msg.parts[0].text : ''
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

async function callClaude(modelId: ModelType, apiKey: string, messages: Array<{role: string; parts: Array<{text: string}>}>): Promise<string> {
  const claudeMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.parts ? msg.parts[0].text : ''
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
