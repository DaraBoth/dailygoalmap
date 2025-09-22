
/**
 * Generate tasks for a specific goal
 */
export async function generateTasksForGoal(goal: any, apiKey: string): Promise<{description: string,date: string}[]> {
  try {
    // Create a prompt for Gemini based on the goal
    const promptData = {
      goal_title: goal.title,
      goal_description: goal.description || "",
      goal_type: goal.metadata?.goal_type || "general",
      target_date: goal.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : "",
      current_date: new Date().toISOString().split('T')[0]
    };
    
    // Call Gemini API to generate tasks
    const prompt = `You are a goal planning assistant. Generate 2–4 practical, achievable daily tasks for today to help make progress toward this goal.

- Goal: ${promptData.goal_title}
- Description: ${promptData.goal_description}
- Type: ${promptData.goal_type}
- Target date: ${promptData.target_date}
- Today's date: ${promptData.current_date}

${goal.metadata?.goal_type === 'travel' ? `
Additional travel details:
- Destination: ${goal.metadata?.travel_destination || 'Not specified'}
- Accommodation: ${goal.metadata?.travel_accommodation || 'Not specified'}
- Transportation: ${goal.metadata?.travel_transportation || 'Not specified'}
- Budget: ${goal.metadata?.travel_budget || 'Not specified'}
- Activities: ${(goal.metadata?.travel_activities || []).join(', ') || 'Not specified'}
` : ''}

Task generation requirements:
- Each task must have a clear, actionable **description**.
- Each task must include a specific **time** to complete it (e.g., "08:30 AM", "2:00 PM") instead of vague terms like "MORNING" or "EVENING".
- Each task must include the **date** in ISO format (e.g., "2025-03-28T08:30:00.000Z") to represent when the task is intended to be done.
- Do not mark any task as completed.

Respond with ONLY a JSON array of objects, formatted **exactly like this**:
[
  {
    "description": "Task description here",
    "date": "2025-03-28T08:30:00.000Z",
  },
  {
    "description": "Second task here",
    "date": "2025-03-28T14:00:00.000Z",
  }
]
`;
 
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ 
            role: "user", 
            parts: [{ text: prompt }] 
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 800,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const taskText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Extract JSON from response
      const jsonMatch = taskText.match(/\[\s*{[\s\S]*}\s*\]/);
      if (!jsonMatch) {
        console.error("No valid JSON found in response:", taskText);
        return [];
      }
      
      try {
        const tasks = JSON.parse(jsonMatch[0]);
        console.log(`Generated ${tasks.length} tasks for goal: ${goal.title}`);
        return tasks;
      } catch (error) {
        console.error("Error parsing tasks JSON:", error);
        return [];
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error; // Re-throw to allow for retry with different API key
    }
  } catch (error) {
    console.error("Error generating tasks:", error);
    throw error; // Re-throw to allow for retry with different API key
  }
}
