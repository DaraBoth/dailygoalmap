
/**
 * Extract tasks from the Gemini API response
 */
export function extractTasksFromResponse(response: any, goalType?: string): any[] {
  // Check for function call in response
  try {
    const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    
    if (!functionCall) {
      console.error("No function call found in API response");
      return [];
    }
    
    // Get function name and args
    const functionName = functionCall.name;
    console.log("Found function call:", functionName);
    
    const args = functionCall.args;
    console.log("Function args:", JSON.stringify(args).substring(0, 200) + "...");
    
    // Check for tasks array in different possible response formats
    if (args && args.tasks && Array.isArray(args.tasks)) {
      return processTasksArray(args.tasks, goalType);
    }
    
    console.error("No tasks array found in function call args");
    return [];
  } catch (error) {
    console.error("Error extracting tasks from API response:", error);
    return [];
  }
}

/**
 * Process tasks array and apply goal-specific enhancements
 */
function processTasksArray(tasks: any[], goalType?: string): any[] {
  // Basic validation and cleaning of tasks
  return tasks
    .filter(task => task && typeof task.description === 'string' && task.description.trim())
    .map(task => {
      // Extract time of day from description if present and not already specified
      let timeOfDay = task.timeOfDay;
      const description = task.description.trim();
      
      if (!timeOfDay) {
        // Check for time of day pattern in brackets
        const timePattern = /\[(MORNING|MIDDAY|AFTERNOON|EVENING)\]/i;
        const match = description.match(timePattern);
        
        if (match) {
          timeOfDay = match[1].toUpperCase();
          // Remove the time pattern from description to clean it up
          const cleanedDescription = description.replace(timePattern, '').trim();
          return {
            description: cleanedDescription,
            date: task.date || null,
            timeOfDay
          };
        }
      }
      
      // Ensure we return a clean, consistent object format
      return {
        description: description,
        date: task.date || null,
        timeOfDay: timeOfDay || null
      };
    });
}
