/**
 * AI Agent Edge Function - Task Management Assistant
 * Similar to n8n workflow but integrated with Supabase
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface AgentContext {
  userId: string;
  goalId?: string;
  sessionId: string;
  currentDate: string;
  currentTime: string;
  timezone?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
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
|------|------|------|--------|
| Team Meeting | Dec 5, 2024 | 2:30 PM - 3:30 PM | ⏳ Pending |
| Code Review | Dec 5, 2024 | 4:00 PM - 5:00 PM | ✅ Done |

**When providing links:**
- Format as markdown links: [Link Text](URL)
- The UI will automatically render them as clickable buttons
- Example: [View Task](https://app.com/task/123)

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
    const { messages, userId, goalId, sessionId, stream } = await req.json();
    
    if (!userId) {
      throw new Error("userId is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context
    const now = new Date();
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

    // Get user's model preference
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('model_preference')
      .eq('id', userId)
      .single();
    
    const modelPreference = profileData?.model_preference || 'gemini';
    console.log(`User's preferred model: ${modelPreference}`);

    // Get user's API key for the selected model
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('key_value, key_label, id, is_default')
      .eq('user_id', userId)
      .eq('key_type', modelPreference)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (apiKeyError || !apiKeyData) {
      const modelNames: Record<string, string> = {
        'gemini': 'Google Gemini',
        'openai': 'OpenAI',
        'claude': 'Anthropic Claude'
      };
      
      const modelLinks: Record<string, string> = {
        'gemini': 'https://aistudio.google.com/apikey',
        'openai': 'https://platform.openai.com/api-keys',
        'claude': 'https://console.anthropic.com/settings/keys'
      };
      
      return new Response(
        JSON.stringify({ 
          error: "API_KEY_REQUIRED",
          message: `🔑 Please add your ${modelNames[modelPreference]} API key in Profile > API Key Management to use the AI assistant.\n\nYour preferred model is ${modelNames[modelPreference]}, but no API key is configured.`,
          setupRequired: true,
          setupInstructions: {
            title: `How to get your ${modelNames[modelPreference]} API Key:`,
            steps: [
              `1. Visit ${modelLinks[modelPreference]}`,
              "2. Sign in with your account",
              "3. Create or copy your API key",
              "4. Go to Profile > API Key Management in the app",
              `5. Add your ${modelNames[modelPreference]} API key`
            ]
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const apiKey = apiKeyData.key_value;
    const keyLabel = apiKeyData.key_label || `${modelPreference} key`;
    const keyId = apiKeyData.id;
    const isDefault = apiKeyData.is_default;
    
    console.log(`🔑 Using API key: ${keyLabel} (${keyId.substring(0, 8)}...) ${isDefault ? '[DEFAULT]' : ''}`);

    // Format current date for better AI understanding
    const currentDate = new Date();
    const dateFormatted = currentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeFormatted = currentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    // Prepare messages for AI
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
      return await streamAIResponse(modelPreference, apiKey, aiMessages, context, supabase, keyLabel);
    }

    // Call AI API with timeout and error handling
    let aiResponseText;
    
    try {
      aiResponseText = await callAIModel(modelPreference, apiKey, aiMessages);
      
      // Log AI response for debugging
      console.log("AI Response Text:", aiResponseText.substring(0, 500));
    } catch (aiError) {
      console.error("AI API fetch failed:", aiError);
      const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
      
      let userMessage = `🔌 Unable to connect to ${modelPreference === 'gemini' ? 'Google Gemini' : modelPreference === 'openai' ? 'OpenAI' : 'Anthropic Claude'} AI service. `;
      
      if (errorMsg.includes('fetch')) {
        userMessage += "Network connection failed. Please check your internet connection.";
      } else if (errorMsg.includes('timeout')) {
        userMessage += "Request timed out. The service may be overloaded, please try again.";
      } else if (errorMsg.includes('API key')) {
        userMessage += `Invalid API key format. Please verify your ${modelPreference} API key in Profile > API Key Management.`;
      } else {
        userMessage += "Please check your API key and try again. Error: " + errorMsg.substring(0, 100);
      }
      
      return new Response(
        JSON.stringify({ 
          error: "AI_SERVICE_ERROR",
          message: userMessage,
          technicalDetails: errorMsg
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if AI is requesting tool usage
    const toolMatch = aiResponseText.match(/TOOL: (\w+)\nPARAMS: ({.*?})/s);
    
    console.log("Tool match result:", toolMatch ? `Found: ${toolMatch[1]}` : "No tool request found");
    
    if (toolMatch) {
      const toolName = toolMatch[1];
      let params;
      
      try {
        params = JSON.parse(toolMatch[2]);
      } catch (parseError) {
        console.error("Failed to parse tool params:", toolMatch[2]);
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
        {
          role: 'user',
          parts: [{
            text: `Tool ${toolName} executed. Result:\n${JSON.stringify(toolResult, null, 2)}\n\nPlease provide a natural response to the user based on this data. Remember: NO technical details, IDs, or tool names in your response.`
          }]
        }
      ];

      try {
        console.log("Making follow-up AI call for natural language response...");
        const followUpResponse = await callAIModel(modelPreference, apiKey, [...aiMessages, ...followUpMessages]);

        return new Response(
          JSON.stringify({ 
            message: followUpResponse.replace(/TOOL:.*?PARAMS:.*?}/gs, '').trim(),
            toolUsed: toolName
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (followUpError) {
        console.error("Follow-up AI call error:", followUpError);
        // Return simplified success message
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

// Tool execution function
async function executeTool(toolName: string, params: any, context: AgentContext, supabase: any) {
  // Validate goalId for goal-specific operations
  const requiresGoalId = ['get_tasks_by_start_date', 'insert_new_task', 'move_task', 'move_tasks_batch', 'delete_task', 'delete_tasks_batch', 'find_by_title'];
  if (requiresGoalId.includes(toolName) && !context.goalId) {
    throw new Error('This operation requires a goal context. Please select a goal first.');
  }
  
  switch (toolName) {
    case 'get_user_profile': {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', params.user_id || context.userId)
        .single();
      if (error) throw error;
      return { profile: data };
    }
    
    case 'get_goal_detail': {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', params.goal_id || context.goalId)
        .single();
      if (error) throw error;
      return { goal: data };
    }
    
    case 'get_tasks_by_start_date': {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', context.goalId)
        .gte('start_date', params.start_date)
        .lte('start_date', params.end_date)
        .order('start_date', { ascending: true })
        .limit(parseInt(params.limit || '100'));
      if (error) throw error;
      return { tasks: data, count: data?.length || 0 };
    }
    
    case 'insert_new_task': {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          goal_id: context.goalId,
          user_id: context.userId,
          title: params.title,
          description: params.description,
          start_date: params.start_date,
          end_date: params.end_date,
          daily_start_time: params.daily_start_time,
          daily_end_time: params.daily_end_time,
          tags: params.tags || [],
          completed: params.completed === 'true' || false
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, task: data };
    }
    
    case 'update_task_info': {
      const updates: any = {};
      if (params.title) updates.title = params.title;
      if (params.description) updates.description = params.description;
      if (params.completed !== undefined) updates.completed = params.completed === 'true';
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', params.task_id)
        .eq('user_id', context.userId)
        .select()
        .single();
      
      if (error) {
        console.error('Update task error:', error);
        throw error;
      }
      
      return { success: true, task: data };
    }
    
    case 'move_task': {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          start_date: params.start_date,
          end_date: params.end_date || params.start_date,
          daily_start_time: params.daily_start_time,
          daily_end_time: params.daily_end_time
        })
        .eq('id', params.task_id)
        .eq('user_id', context.userId)
        .eq('goal_id', context.goalId)
        .select()
        .single();
      
      if (error) {
        console.error('Move task error:', error);
        throw error;
      }
      
      if (!data) {
        return { 
          success: false, 
          error: 'Task not found or access denied',
          task_id: params.task_id 
        };
      }
      
      return { 
        success: true, 
        task: data,
        message: `Moved "${data.title}" to ${params.start_date}`
      };
    }
    
    case 'delete_task': {
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', params.task_id)
        .eq('user_id', context.userId)
        .eq('goal_id', context.goalId)
        .select();
      
      if (error) {
        console.error('Delete task error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return { 
          success: false, 
          error: 'Task not found or already deleted',
          task_id: params.task_id 
        };
      }
      
      return { 
        success: true, 
        deleted_task_id: params.task_id,
        deleted_task_title: data[0].title
      };
    }
    
    case 'move_tasks_batch': {
      // Batch move multiple tasks to a new date
      if (!params.task_ids || !Array.isArray(params.task_ids) || params.task_ids.length === 0) {
        throw new Error('task_ids array is required for batch move');
      }
      
      if (!params.new_start_date) {
        throw new Error('new_start_date is required for batch move');
      }
      
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const taskId of params.task_ids) {
        try {
          const { data, error } = await supabase
            .from('tasks')
            .update({
              start_date: params.new_start_date,
              end_date: params.new_end_date || params.new_start_date,
            })
            .eq('id', taskId)
            .eq('user_id', context.userId)
            .eq('goal_id', context.goalId)
            .select()
            .single();
          
          if (error) throw error;
          
          if (data) {
            successCount++;
            results.push({ 
              task_id: taskId, 
              success: true, 
              title: data.title,
              moved_to: params.new_start_date
            });
          }
        } catch (error) {
          errorCount++;
          results.push({ 
            task_id: taskId, 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return {
        success: successCount > 0,
        total_tasks: params.task_ids.length,
        moved_count: successCount,
        failed_count: errorCount,
        results: results,
        message: `Successfully moved ${successCount} out of ${params.task_ids.length} tasks to ${params.new_start_date}`
      };
    }
    
    case 'delete_tasks_batch': {
      // Batch delete multiple tasks
      if (!params.task_ids || !Array.isArray(params.task_ids) || params.task_ids.length === 0) {
        throw new Error('task_ids array is required for batch delete');
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .in('id', params.task_ids)
        .eq('user_id', context.userId)
        .eq('goal_id', context.goalId)
        .select();
      
      if (error) {
        console.error('Batch delete error:', error);
        throw error;
      }
      
      return {
        success: true,
        deleted_count: data?.length || 0,
        requested_count: params.task_ids.length,
        deleted_tasks: data?.map((t: any) => ({ id: t.id, title: t.title })),
        message: `Successfully deleted ${data?.length || 0} tasks`
      };
    }
    
    case 'find_by_title': {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', context.goalId)
        .ilike('title', `%${params.title_search}%`)
        .limit(parseInt(params.limit || '50'));
      if (error) throw error;
      return { tasks: data, count: data?.length || 0 };
    }
    
    case 'google_search': {
      // Get SerpAPI key from database
      const { data: serpKeyData, error: serpKeyError } = await supabase
        .from('api_keys')
        .select('key_value')
        .eq('user_id', context.userId)
        .eq('key_type', 'serpapi')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (serpKeyError || !serpKeyData) {
        return {
          success: false,
          error: 'SerpAPI key not found. Please add your SerpAPI key in Profile > API Key Management to use Google Search.'
        };
      }
      
      const serpApiKey = serpKeyData.key_value;
      const searchQuery = params.query;
      const country = params.country || 'us';
      const language = params.language || 'en';
      
      try {
        const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&gl=${country}&hl=${language}&device=desktop`;
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) {
          throw new Error(`SerpAPI returned status ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        
        // Extract organic results
        const results = searchData.organic_results?.slice(0, 5).map((result: any) => ({
          title: result.title,
          link: result.link,
          snippet: result.snippet
        })) || [];
        
        return {
          success: true,
          query: searchQuery,
          results: results,
          answer_box: searchData.answer_box,
          knowledge_graph: searchData.knowledge_graph
        };
      } catch (searchError) {
        console.error('Google search error:', searchError);
        return {
          success: false,
          error: searchError instanceof Error ? searchError.message : 'Search failed'
        };
      }
    }
    
    case 'send_notification': {
      // Get user's push subscription
      const { data: pushData, error: pushError } = await supabase
        .from('push_subscriptions')
        .select('identifier')
        .eq('user_id', context.userId)
        .single();
      
      if (pushError || !pushData) {
        return {
          success: false,
          error: 'No push subscription found. User needs to enable notifications.'
        };
      }
      
      try {
        const notificationPayload = {
          title: params.title || 'DailyGoalMap Notification',
          message: params.message,
          url: params.url || '',
          userId: context.userId,
          subscription: JSON.parse(pushData.identifier)
        };
        
        const notifResponse = await fetch('https://tinynotie-api.vercel.app/openai/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationPayload)
        });
        
        if (!notifResponse.ok) {
          throw new Error(`Notification API returned status ${notifResponse.status}`);
        }
        
        return {
          success: true,
          message: 'Notification sent successfully',
          title: params.title,
          sent_to: context.userId
        };
      } catch (notifError) {
        console.error('Notification error:', notifError);
        return {
          success: false,
          error: notifError instanceof Error ? notifError.message : 'Failed to send notification'
        };
      }
    }
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Streaming Response Handler
async function streamAIResponse(
  model: string,
  apiKey: string,
  messages: any[],
  context: AgentContext,
  supabase: any,
  keyLabel?: string
): Promise<Response> {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`📡 Starting stream for model: ${model}`);
        
        // Send API key info
        if (keyLabel) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'key_info',
            content: keyLabel,
            model: model
          })}\n\n`));
        }
        
        // Send initial thinking message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'thinking',
          content: 'Analyzing your request...'
        })}\n\n`));

        console.log('📡 Sent thinking message');

        // Call appropriate streaming function
        switch (model) {
          case 'gemini':
            await streamGemini(apiKey, messages, controller, encoder);
            break;
          case 'openai':
            await streamOpenAI(apiKey, messages, controller, encoder);
            break;
          case 'claude':
            await streamClaude(apiKey, messages, controller, encoder);
            break;
          default:
            throw new Error(`Unsupported model: ${model}`);
        }

        console.log('📡 Stream finished, sending done signal');

        // Send completion signal
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done'
        })}\n\n`));
        
        controller.close();
      } catch (error) {
        console.error('📡 Streaming error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          content: error instanceof Error ? error.message : 'Streaming failed'
        })}\n\n`));
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

// Streaming functions for each model
async function streamGemini(
  apiKey: string,
  messages: any[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  console.log('🔵 Starting Gemini stream...');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    }
  );

  console.log(`🔵 Gemini response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🔵 Gemini error:', errorText);
    
    // Handle rate limit specifically
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Please wait a moment and try again, or switch to a different model.`);
    }
    
    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log(`🔵 Gemini stream done. Total chunks: ${chunkCount}`);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '[' || trimmed === ']' || trimmed === ',') continue;
      
      try {
        const data = JSON.parse(trimmed.replace(/^,/, ''));
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          chunkCount++;
          console.log(`🔵 Gemini chunk ${chunkCount}:`, text.substring(0, 50));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'content',
            content: text
          })}\n\n`));
        }
      } catch (e) {
        console.error('🔵 Gemini parse error:', e, 'Line:', trimmed.substring(0, 100));
      }
    }
  }
}

async function streamOpenAI(
  apiKey: string,
  messages: any[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
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
        model: "gpt-4-turbo-preview",
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      })
    }
  );

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const text = parsed.choices?.[0]?.delta?.content;
        
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'content',
            content: text
          })}\n\n`));
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}

async function streamClaude(
  apiKey: string,
  messages: any[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
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
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        temperature: 0.7,
        system: systemMessage || undefined,
        messages: userMessages.length > 0 ? userMessages : claudeMessages,
        stream: true
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      
      const data = trimmed.slice(6);

      try {
        const parsed = JSON.parse(data);
        
        if (parsed.type === 'content_block_delta') {
          const text = parsed.delta?.text;
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              content: text
            })}\n\n`));
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}

// AI Model API Calls
async function callAIModel(model: string, apiKey: string, messages: any[]): Promise<string> {
  switch (model) {
    case 'gemini':
      return await callGemini(apiKey, messages);
    case 'openai':
      return await callOpenAI(apiKey, messages);
    case 'claude':
      return await callClaude(apiKey, messages);
    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

async function callGemini(apiKey: string, messages: any[]): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
    }
    throw new Error('Empty response from Gemini API');
  }
  
  return data.candidates[0]?.content?.parts[0]?.text || "I'm having trouble processing your request.";
}

async function callOpenAI(apiKey: string, messages: any[]): Promise<string> {
  // Convert Gemini message format to OpenAI format
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
        model: "gpt-4-turbo-preview",
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 2048,
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('Empty response from OpenAI API');
  }
  
  return data.choices[0]?.message?.content || "I'm having trouble processing your request.";
}

async function callClaude(apiKey: string, messages: any[]): Promise<string> {
  // Convert Gemini message format to Claude format
  const claudeMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.parts ? msg.parts[0].text : msg.content
  }));

  // Extract system message if present
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
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        temperature: 0.7,
        system: systemMessage || undefined,
        messages: userMessages.length > 0 ? userMessages : claudeMessages
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  
  if (!data.content || data.content.length === 0) {
    throw new Error('Empty response from Claude API');
  }
  
  return data.content[0]?.text || "I'm having trouble processing your request.";
}
