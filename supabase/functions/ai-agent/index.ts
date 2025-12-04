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

## IMPORTANT: HANDLING MULTIPLE TASKS
When user asks to move/delete/update MULTIPLE tasks:
1. FIRST use get_tasks_by_start_date to get the list of tasks
2. Tell user "I found X tasks" and list them
3. You can only process ONE task per tool call
4. For batch operations, explain you'll process them one by one
5. ALWAYS confirm before batch deletes

## AVAILABLE TOOLS
You can request tool usage by responding with tool requests in this format:
TOOL: tool_name
PARAMS: {"param": "value"}

Available tools:
- get_user_profile: Get user information
- get_goal_detail: Get goal information  
- get_tasks_by_start_date: Get tasks in date range (REQUIRED for batch operations)
- insert_new_task: Create ONE new task
- update_task_info: Update ONE task (needs task_id)
- move_task: Reschedule ONE task (needs task_id, start_date, end_date)
- delete_task: Delete ONE task (needs task_id)
- find_by_title: Search tasks by title

Always get tasks data FIRST before attempting batch operations.`;

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

    // Get user's Gemini API key from database
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('user_id', userId)
      .eq('key_type', 'gemini')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ 
          error: "API_KEY_REQUIRED",
          message: "🔑 Please add your Gemini API key in Profile > API Key Management to use the AI assistant.\n\nThe AI assistant needs a Gemini API key to help you manage tasks and goals.",
          setupRequired: true,
          setupInstructions: {
            title: "How to get your Gemini API Key:",
            steps: [
              "1. Visit https://aistudio.google.com/apikey",
              "2. Sign in with your Google account",
              "3. Click 'Create API Key'",
              "4. Copy the key (starts with 'AIza')",
              "5. Go to Profile > API Key Management in the app",
              "6. Add your Gemini API key"
            ]
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const geminiApiKey = apiKeyData.key_value;

    // Prepare messages for AI
    const aiMessages = [
      {
        role: 'user',
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nContext:\n- User ID: ${context.userId}\n- Goal ID: ${context.goalId || 'Not set'}\n- Date: ${context.currentDate}\n- Time: ${context.currentTime}\n\nConversation history:\n${messages.map((m: Message) => `${m.role}: ${m.content}`).join('\n')}`
        }]
      }
    ];

    // Call Gemini API with timeout and error handling
    let geminiData;
    let aiResponseText;
    
    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
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
        let errorText = '';
        let errorMessage = "The AI service returned an error. ";
        
        try {
          errorText = await geminiResponse.text();
          const errorData = JSON.parse(errorText);
          console.error("Gemini API error:", geminiResponse.status, errorData);
          
          // Parse specific Gemini error messages
          if (errorData.error?.message) {
            errorMessage += errorData.error.message;
          }
        } catch (e) {
          console.error("Gemini API error (raw):", geminiResponse.status, errorText);
        }
        
        // Provide specific guidance based on status code
        if (geminiResponse.status === 400) {
          errorMessage = "❌ Invalid API Key or Request Format. Please check your Gemini API key in Profile > API Key Management.";
        } else if (geminiResponse.status === 429) {
          errorMessage = "⏱️ Rate Limit Exceeded. You've hit the free tier limit. Please wait a moment or upgrade your Gemini API plan.";
        } else if (geminiResponse.status === 401 || geminiResponse.status === 403) {
          errorMessage = "🔑 Authentication Failed. Your Gemini API key is invalid or expired. Please update it in Profile > API Key Management.";
        } else if (geminiResponse.status === 404) {
          errorMessage = "🔍 Model Not Found. The Gemini AI model is unavailable. Please try again later.";
        } else if (!errorMessage.includes('error')) {
          errorMessage = `The AI service is temporarily unavailable (Status: ${geminiResponse.status}). Please try again in a moment.`;
        }
        
        return new Response(
          JSON.stringify({ 
            error: "AI_SERVICE_ERROR",
            message: errorMessage,
            statusCode: geminiResponse.status,
            details: errorText.substring(0, 200) // Include first 200 chars of error for debugging
          }),
          { 
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      geminiData = await geminiResponse.json();
      
      // Validate response structure
      if (!geminiData.candidates || !Array.isArray(geminiData.candidates) || geminiData.candidates.length === 0) {
        console.error("Invalid Gemini response structure:", JSON.stringify(geminiData).substring(0, 500));
        
        // Check for safety filters or blocked content
        if (geminiData.promptFeedback?.blockReason) {
          return new Response(
            JSON.stringify({ 
              error: "AI_SERVICE_ERROR",
              message: `⚠️ Content blocked by AI safety filters: ${geminiData.promptFeedback.blockReason}. Please rephrase your request.`,
              statusCode: 400
            }),
            { 
              status: 503,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: "AI_SERVICE_ERROR",
            message: "⚠️ The AI returned an empty response. This might be due to content filters or API limitations. Please try rephrasing your request.",
            statusCode: 200,
            details: JSON.stringify(geminiData).substring(0, 200)
          }),
          { 
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      aiResponseText = geminiData.candidates[0]?.content?.parts[0]?.text || "I'm having trouble processing your request. Please try again.";
      
      // Log AI response for debugging
      console.log("AI Response Text:", aiResponseText.substring(0, 500));
    } catch (geminiError) {
      console.error("Gemini API fetch failed:", geminiError);
      const errorMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
      
      let userMessage = "🔌 Unable to connect to Gemini AI service. ";
      
      if (errorMsg.includes('fetch')) {
        userMessage += "Network connection failed. Please check your internet connection.";
      } else if (errorMsg.includes('timeout')) {
        userMessage += "Request timed out. The service may be overloaded, please try again.";
      } else if (errorMsg.includes('API key')) {
        userMessage += "Invalid API key format. Please verify your Gemini API key in Profile > API Key Management.";
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
        console.log("Making follow-up Gemini call for natural language response...");
        const followUpResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
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

        if (!followUpResponse.ok) {
          console.error("Follow-up Gemini call failed:", followUpResponse.status);
          // Return tool result with basic formatting instead
          return new Response(
            JSON.stringify({ 
              message: `I executed the action, but here's the raw result: ${JSON.stringify(toolResult)}`,
              toolUsed: toolName
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const followUpData = await followUpResponse.json();
        
        // Validate follow-up response structure
        if (!followUpData.candidates || !Array.isArray(followUpData.candidates) || followUpData.candidates.length === 0) {
          console.error("Invalid follow-up response:", JSON.stringify(followUpData).substring(0, 500));
          
          // Return friendly message about the tool result
          if (toolResult.success) {
            return new Response(
              JSON.stringify({ 
                message: `✅ Done! I've completed the task successfully.`,
                toolUsed: toolName
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            return new Response(
              JSON.stringify({ 
                message: `⚠️ There was an issue: ${toolResult.error || 'Task could not be completed'}`,
                toolUsed: toolName
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        const finalResponse = followUpData.candidates[0]?.content?.parts[0]?.text || aiResponseText;

        return new Response(
          JSON.stringify({ 
            message: finalResponse.replace(/TOOL:.*?PARAMS:.*?}/gs, '').trim(),
            toolUsed: toolName
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (followUpError) {
        console.error("Follow-up Gemini call error:", followUpError);
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
  const requiresGoalId = ['get_tasks_by_start_date', 'insert_new_task', 'move_task', 'delete_task', 'find_by_title'];
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
