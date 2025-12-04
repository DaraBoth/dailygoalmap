/**
 * AI Agent Edge Function - Task Management Assistant
 * Similar to n8n workflow but integrated with Supabase
 */

// @ts-expect-error - Deno std library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
// @ts-expect-error - ESM.sh import for Deno
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

## AVAILABLE TOOLS
You can request tool usage by responding with tool requests in this format:
TOOL: tool_name
PARAMS: {"param": "value"}

Available tools:
- get_user_profile: Get user information (display_name, bio)
- get_goal_detail: Get goal information
- get_tasks_by_start_date: Get tasks in a date range
- insert_new_task: Create a new task
- update_task_info: Update task details
- move_task: Reschedule a task
- delete_task: Delete a task
- find_by_title: Search tasks by title

Always think about what information you need first, then use the appropriate tools.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, goalId, sessionId } = await req.json();
    
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

    // Get Gemini API key
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("Missing Gemini API key");
    }

    // Prepare messages for AI
    const aiMessages = [
      {
        role: 'user',
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nContext:\n- User ID: ${context.userId}\n- Goal ID: ${context.goalId || 'Not set'}\n- Date: ${context.currentDate}\n- Time: ${context.currentTime}\n\nConversation history:\n${messages.map((m: Message) => `${m.role}: ${m.content}`).join('\n')}`
        }]
      }
    ];

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: aiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const geminiData = await geminiResponse.json();
    const aiResponseText = geminiData.candidates[0]?.content?.parts[0]?.text || "I'm having trouble processing your request. Please try again.";

    // Check if AI is requesting tool usage
    const toolMatch = aiResponseText.match(/TOOL: (\w+)\nPARAMS: ({.*?})/s);
    
    if (toolMatch) {
      const toolName = toolMatch[1];
      const params = JSON.parse(toolMatch[2]);
      
      // Execute tool
      let toolResult;
      try {
        toolResult = await executeTool(toolName, params, context, supabase);
      } catch (error) {
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

      const followUpResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [...aiMessages, ...followUpMessages],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          })
        }
      );

      const followUpData = await followUpResponse.json();
      const finalResponse = followUpData.candidates[0]?.content?.parts[0]?.text || aiResponseText;

      return new Response(
        JSON.stringify({ 
          message: finalResponse.replace(/TOOL:.*?PARAMS:.*?}/gs, '').trim(),
          toolUsed: toolName
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        .select()
        .single();
      if (error) throw error;
      return { success: true, task: data };
    }
    
    case 'move_task': {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          start_date: params.start_date,
          end_date: params.end_date,
          daily_start_time: params.daily_start_time,
          daily_end_time: params.daily_end_time
        })
        .eq('id', params.task_id)
        .eq('goal_id', context.goalId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, task: data };
    }
    
    case 'delete_task': {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', params.task_id)
        .eq('goal_id', context.goalId);
      if (error) throw error;
      return { success: true, deleted_task_id: params.task_id };
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
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
