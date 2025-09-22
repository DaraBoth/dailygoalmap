
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "./utils/dbClient.ts";
import { generateTasksForGoal } from "./utils/taskGenerator.ts";
import { getCurrentApiKey, rotateApiKey, hasMoreKeysToTry, resetAttemptedKeys } from "./utils/apiKeyManager.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Parse the request body to get any user preferences
    const { forceGenerate, specificGoalId, apiKey } = await req.json().catch(() => ({}));
    
    console.log(`Generating daily tasks. Force: ${forceGenerate}, GoalId: ${specificGoalId || 'all'}`);

    // Create client for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the user ID from the JWT
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No user found');
    }

    console.log(`Generating tasks for user: ${user.id}`);

    // Fetch active goals for the user
    const { data: goals, error: goalsError } = await supabaseClient
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (goalsError) {
      throw goalsError;
    }

    if (!goals || goals.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No active goals found to generate tasks for" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter for specific goal if provided
    const targetGoals = specificGoalId 
      ? goals.filter(goal => goal.id === specificGoalId) 
      : goals;

    if (targetGoals.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Specified goal not found or not active" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing tasks created today for these goals
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: existingTasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .select('goal_id, created_at')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    if (tasksError) {
      throw tasksError;
    }

    // Find goals that don't already have tasks for today
    const existingGoalIds = new Set(existingTasks?.map(task => task.goal_id) || []);
    const goalsNeedingTasks = forceGenerate 
      ? targetGoals 
      : targetGoals.filter(goal => !existingGoalIds.has(goal.id));

    if (goalsNeedingTasks.length === 0 && !forceGenerate) {
      return new Response(
        JSON.stringify({ 
          message: "All goals already have tasks generated for today" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Gemini API key for task generation
    let geminiApiKey;
    
    // First, try to use the API key provided in the request
    if (apiKey) {
      geminiApiKey = apiKey;
    } 
    // Next, check environment variables
    else if (Deno.env.get("GEMINI_API_KEY")) {
      geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    } 
    // Finally, use a fallback key
    else {
      geminiApiKey = getCurrentApiKey();
    }

    if (!geminiApiKey) {
      throw new Error("Missing Gemini API key");
    }

    // Reset key rotation tracking for this request
    resetAttemptedKeys();

    // Generate and insert tasks for each goal
    const tasksCreated = [];
    for (const goal of goalsNeedingTasks) {
      let retryCount = 0;
      let success = false;
      
      while (!success && (retryCount < 3 || hasMoreKeysToTry())) {
        try {
          const generatedTasks = await generateTasksForGoal(goal, geminiApiKey);
          
          // Insert tasks into the database
          if (generatedTasks.length > 0) {
            const tasksToInsert = generatedTasks.map(task => ({
              goal_id: goal.id,
              user_id: user.id,
              description: task.description,
              date: task.date,
              completed: false
            }));
            
            const { data: insertedTasks, error: insertError } = await supabaseClient
              .from('tasks')
              .insert(tasksToInsert)
              .select();
              
            if (insertError) {
              console.error("Error inserting tasks:", insertError);
              continue;
            }
            
            tasksCreated.push(...(insertedTasks || []));
          }
          
          success = true;
        } catch (goalError) {
          // If we get a rate limit error, try with a different API key
          if (goalError.message?.includes("429") || goalError.message?.includes("quota")) {
            geminiApiKey = rotateApiKey();
            console.log(`Rate limit hit, rotating to next API key. Retry ${retryCount + 1}`);
            retryCount++;
          } else {
            console.error(`Error generating tasks for goal ${goal.id}:`, goalError);
            break; // Non-rate limit error, break the retry loop
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Successfully generated ${tasksCreated.length} tasks for today`,
        tasks: tasksCreated,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating daily tasks:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
