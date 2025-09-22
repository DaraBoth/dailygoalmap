
// Standard function schema for task generation
export const STANDARD_FUNCTION_SCHEMA = {
  name: "createTasksForGoal",
  description: "Creates a list of tasks to achieve a goal with dates and descriptions",
  parameters: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "The list of tasks to complete the goal",
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "A detailed actionable description of the task"
            },
            date: {
              type: "string",
              description: "The target date for the task in YYYY-MM-DD format"
            },
            timeOfDay: {
              type: "string",
              description: "The recommended time of day to perform this task (MORNING, MIDDAY, AFTERNOON, or EVENING)",
              enum: ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"]
            }
          },
          required: ["description"]
        }
      }
    },
    required: ["tasks"]
  }
};

// Travel-specific function schema with location
export const TRAVEL_FUNCTION_SCHEMA = {
  name: "createTravelItinerary",
  description: "Creates a detailed travel itinerary with tasks before, during, and after the trip",
  parameters: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "The list of tasks for the travel itinerary",
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "A detailed actionable description of the task or activity"
            },
            date: {
              type: "string",
              description: "The target date for the task in YYYY-MM-DD format"
            },
            timeOfDay: {
              type: "string",
              description: "The recommended time of day (MORNING, MIDDAY, AFTERNOON, or EVENING)",
              enum: ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"]
            },
            location: {
              type: "string",
              description: "Location where the task or activity will take place (optional)"
            },
            category: {
              type: "string",
              description: "Category of the task (pre-trip, during-trip, post-trip)",
              enum: ["pre-trip", "during-trip", "post-trip"]
            }
          },
          required: ["description"]
        }
      }
    },
    required: ["tasks"]
  }
};
