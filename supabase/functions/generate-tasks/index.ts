
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { STANDARD_FUNCTION_SCHEMA, TRAVEL_FUNCTION_SCHEMA } from "./schemas/functionSchemas.ts";
import { buildPrompt } from "./utils/promptBuilder.ts";
import { extractTasksFromResponse } from "./utils/taskExtractor.ts";
import { distributeTasks, enhanceTravelTasks } from "./utils/taskDistribution.ts";
import { createFallbackTasks } from "./utils/fallbackTasks.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { 
      goalTitle, 
      goalDescription, 
      financialData, 
      startDate, 
      targetDate, 
      geminiApiKey,
      goalType,
      travelDetails,
      requestedTaskCount
    } = await req.json();
    
    console.log("Generate tasks request received:", {
      goalTitle,
      goalType,
      hasDescription: !!goalDescription,
      hasFinancialData: !!financialData,
      hasTravelDetails: !!travelDetails,
      startDate,
      targetDate,
      requestedTaskCount
    });
    
    // Use user-provided API key if available, fallback to environment variable, then fallback to hardcoded keys
    const apiKey = geminiApiKey || Deno.env.get('GEMINI_API_KEY') || "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0";
    
    if (!goalTitle) {
      console.error("No goal title provided");
      return new Response(
        JSON.stringify({ error: "Goal title is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Normalize dates
    const normalizedStartDate = startDate || new Date().toISOString().split('T')[0];
    
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const normalizedTargetDate = targetDate || thirtyDaysLater.toISOString().split('T')[0];
    
    // Ensure dates are in the correct order
    const startDateObj = new Date(normalizedStartDate);
    const targetDateObj = new Date(normalizedTargetDate);
    
    // If dates are in wrong order, swap them for processing
    const processStartDate = startDateObj <= targetDateObj ? 
      normalizedStartDate : normalizedTargetDate;
    const processTargetDate = startDateObj <= targetDateObj ? 
      normalizedTargetDate : normalizedStartDate;

    // Calculate days between dates for better task generation
    const daysDiff = Math.round((new Date(processTargetDate).getTime() - new Date(processStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Enhanced task count calculation - let the prompt builder handle this
    const taskCount = requestedTaskCount; // Will be calculated in buildPrompt based on complexity

    // Select the appropriate function schema based on goal type
    const functionSchema = goalType === 'travel' ? TRAVEL_FUNCTION_SCHEMA : STANDARD_FUNCTION_SCHEMA;
    const prompt = buildPrompt(
      goalTitle, 
      goalDescription, 
      processStartDate, 
      processTargetDate, 
      goalType, 
      travelDetails, 
      financialData,
      daysDiff,
      taskCount
    );
    
    console.log("Using prompt:", prompt);

    try {
      // Make request to Gemini API with function calling
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          tools: [{
            functionDeclarations: [functionSchema]
          }],
          toolConfig: {
            functionCallingConfig: {
              mode: "AUTO"
            }
          },
          generationConfig: {
            temperature: 0.8, // Slightly more creative for better task variety
            maxOutputTokens: 4096, // Increased for complex long-term goals
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Gemini API response:", JSON.stringify(data).substring(0, 200) + "...");
      
      // Extract the function call from the response
      const generatedTasks = extractTasksFromResponse(data, goalType);
      
      if (generatedTasks.length === 0) {
        throw new Error("No tasks were generated");
      }

      // Process tasks ensuring they match our database schema
      let formattedTasks = [];
      
      // For short travel periods, preserve all generated tasks with their dates
      if (goalType === 'travel' && daysDiff <= 7) {
        const enhancedTasks = enhanceTravelTasks(generatedTasks, processStartDate, processTargetDate);
        formattedTasks = enhancedTasks.map(task => ({
          id: task.id || uuidv4(),
          description: task.description,
          date: task.date,
          completed: false,
          currency: task.currency || 'USD',
          timeOfDay: task.timeOfDay || 'MORNING'
        }));
      } else {
        // For regular goals or longer travel periods, distribute tasks evenly
        const distributedTasks = distributeTasks(generatedTasks, processStartDate, processTargetDate);
        formattedTasks = distributedTasks.map(task => ({
          id: task.id || uuidv4(),
          description: task.description,
          date: task.date,
          completed: false,
          currency: task.currency || 'USD',
          timeOfDay: task.timeOfDay || 'MORNING'
        }));
      }
      
      console.log(`Generated ${formattedTasks.length} tasks successfully`);
      
      return new Response(
        JSON.stringify({ tasks: formattedTasks }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (apiError) {
      console.error("API error:", apiError);
      
      // Create enhanced fallback tasks as backup
      const fallbackTasks = createFallbackTasks(
        processStartDate, 
        processTargetDate, 
        goalTitle, 
        goalType,
        requestedTaskCount || 15 // Use a reasonable default
      );
      
      // Ensure fallback tasks match our schema too
      const formattedFallbackTasks = fallbackTasks.map(task => ({
        id: task.id || uuidv4(),
        description: task.description,
        date: task.date,
        completed: false,
        timeOfDay: task.timeOfDay || 'MORNING'
      }));
      
      return new Response(
        JSON.stringify({ 
          tasks: formattedFallbackTasks,
          note: "Generated fallback tasks due to API error" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error generating tasks:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate tasks" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
