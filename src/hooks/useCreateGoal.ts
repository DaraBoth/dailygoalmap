import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateMultipleTasks } from "@/components/calendar/services/taskGenerator";
import { v4 as uuidv4 } from 'uuid';
import { format } from "date-fns";

// Enhanced metadata schema with versioning
export interface GoalMetadata {
  version: number;
  goal_type: 'general' | 'travel' | 'finance' | 'education' | 'financial';
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  start_date?: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    timeRange?: [string, string]; // ['07:00', '08:00']
    daysOfWeek?: number[]; // [1, 3, 5] for Mon, Wed, Fri
  };
  milestones?: Array<{
    title: string;
    due_date?: string;
  }>;
  template_id?: string;
  // Travel-specific fields
  travel_destination?: string;
  travel_accommodation?: string;
  travel_transportation?: string;
  travel_budget?: string;
  travel_activities?: string[];
  // Financial-specific fields
  financial_details?: {
    targetAmount?: number;
    currentSavings?: number;
    monthlySavingsTarget?: number;
    currency?: string;
  };
  // User Context for AI Task Generation (System Prompt)
  user_context?: {
    // Daily Schedule & Time Management
    wake_up_time?: string; // e.g., "06:00"
    sleep_time?: string; // e.g., "22:00"
    work_start_time?: string; // e.g., "09:00"
    work_end_time?: string; // e.g., "17:00"
    busy_periods?: Array<{ // Times when user is unavailable
      day?: string; // "monday", "tuesday", etc., or "weekdays", "weekends"
      start_time: string;
      end_time: string;
      description?: string; // e.g., "Work commute", "Kids pickup"
    }>;
    available_time_per_day?: string; // e.g., "2 hours", "30 minutes"
    preferred_work_times?: string; // e.g., "morning", "evening" (changed from array to string)
    
    // Financial Context (for saving/finance goals)
    monthly_income?: number;
    monthly_expenses?: number;
    current_savings?: number;
    debt_amount?: number;
    financial_obligations?: string; // e.g., "Rent $1000, Car loan $300"
    
    // Personal Context
    age_range?: string; // e.g., "18-25", "26-35", "36-50", "50+"
    occupation?: string;
    education_level?: string;
    living_situation?: string; // e.g., "Live alone", "With family", "Roommates"
    family_responsibilities?: string; // e.g., "2 kids", "Elderly care"
    
    // Goal-Specific Context
    current_skill_level?: string; // e.g., "Beginner", "Intermediate", "Advanced"
    past_experience?: string; // Relevant past attempts or experience
    known_obstacles?: string; // Challenges they anticipate
    motivation_level?: string; // "High", "Medium", "Need support"
    accountability_preference?: string; // "Self-driven", "Need reminders", "Need accountability partner"
    
    // Health & Lifestyle
    health_conditions?: string; // Anything that affects scheduling
    exercise_routine?: string; // Existing commitments
    dietary_restrictions?: string; // For health/cooking goals
    energy_levels?: string; // e.g., "Morning person", "Night owl", "Varies"
    
    // Additional Context
    timezone?: string;
    language_preference?: string;
    other_commitments?: string; // Other goals or major life events
    special_notes?: string; // Anything else AI should know
  };
  [key: string]: any;
}

export interface CreateGoalPayload {
  title: string;
  description?: string;
  target_date?: Date | null;
  no_duration?: boolean;
  start_date?: Date;
  metadata: GoalMetadata;
}

export interface CreateGoalOptions {
  generateTasksWithAI?: boolean;
  aiPrompt?: string;
  requestedTaskCount?: number;
}

export interface CreateGoalResult {
  success: boolean;
  goal?: any;
  error?: string;
}

// Convert old-format tasks to new 4-column schema
function convertTaskToNewSchema(task: any, defaultTime: string = "09:00"): any {
  const taskDate = new Date(task.date);
  const dateStr = format(taskDate, 'yyyy-MM-dd');
  
  // Extract time from timeOfDay or use default
  let startTime = defaultTime;
  let endTime = format(new Date(`2000-01-01T${defaultTime}:00`).getTime() + 60 * 60 * 1000, 'HH:mm');
  
  if (task.timeOfDay) {
    switch (task.timeOfDay.toUpperCase()) {
      case 'MORNING':
        startTime = '07:00';
        endTime = '08:00';
        break;
      case 'MIDDAY':
        startTime = '12:00';
        endTime = '13:00';
        break;
      case 'AFTERNOON':
        startTime = '15:00';
        endTime = '16:00';
        break;
      case 'EVENING':
        startTime = '19:00';
        endTime = '20:00';
        break;
    }
  }

  return {
    id: task.id || uuidv4(),
    title: task.description.length > 80 ? task.description.substring(0, 80) + '...' : task.description,
    description: task.description,
    start_date: `${dateStr}T${startTime}:00`,
    end_date: `${dateStr}T${endTime}:00`,
    daily_start_time: startTime,
    daily_end_time: endTime,
    completed: task.completed || false,
  };
}

export function useCreateGoal() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createGoal = async (
    payload: CreateGoalPayload,
    options: CreateGoalOptions = {}
  ): Promise<CreateGoalResult> => {
    setIsLoading(true);
    
    try {
      // Get authenticated user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("No authenticated user found");
      }

      // Ensure metadata has version
      const metadata: GoalMetadata = {
        version: 1,
        ...payload.metadata,
      };

      // Insert goal into database
      const { data: goalData, error: goalError } = await supabase
        .from("goals")
        .insert([
          ({
            title: payload.title,
            description: payload.description || "",
            target_date: payload.target_date ? payload.target_date.toISOString().split("T")[0] : null,
            no_duration: payload.no_duration ?? !payload.target_date,
            user_id: userData.user.id,
            status: "active",
            metadata,
          } as any),
        ])
        .select()
        .single();

      if (goalError) {
        console.error("Error creating goal:", goalError);
        throw goalError;
      }

      // Add creator to goal_members using RPC
      const { error: memberError } = await supabase.rpc('join_goal', {
        p_goal_id: goalData.id,
        p_user_id: userData.user.id,
        p_role: 'creator'
      });

      if (memberError) {
        console.error("Error adding creator to goal members:", memberError);
        // Don't throw here as goal was created successfully
      }

      // Generate and insert tasks if requested
      if (options.generateTasksWithAI && goalData) {
        try {
          const startDate = payload.start_date || new Date();
          const targetDate = payload.target_date;
          
          console.log(`Generating tasks for goal: ${goalData.title}`);
          
          // Generate tasks using existing AI service
          const generatedTasks = await generateMultipleTasks(
            startDate,
            targetDate,
            goalData.id,
            goalData.title,
            goalData.description,
            {
              goalType: metadata.goal_type,
              travelDetails: metadata.goal_type === 'travel' ? {
                destination: metadata.travel_destination,
                accommodation: metadata.travel_accommodation,
                transportation: metadata.travel_transportation,
                budget: metadata.travel_budget,
                activities: metadata.travel_activities
              } : undefined,
              userContext: metadata.user_context
            },
            options.requestedTaskCount
          );

          console.log(`Generated ${generatedTasks.length} tasks`);

          // Convert tasks to new schema and insert
          if (generatedTasks.length > 0) {
            const tasksToInsert = generatedTasks.map(task => ({
              ...convertTaskToNewSchema(task),
              goal_id: goalData.id,
              user_id: userData.user.id,
            }));

            // Insert tasks in batches
            const batchSize = 10;
            let insertedCount = 0;

            for (let i = 0; i < tasksToInsert.length; i += batchSize) {
              const batch = tasksToInsert.slice(i, i + batchSize);
              const { error: taskError } = await supabase
                .from('tasks')
                .insert(batch);

              if (taskError) {
                console.error(`Error inserting task batch ${Math.floor(i / batchSize) + 1}:`, taskError);
              } else {
                insertedCount += batch.length;
              }
            }

            console.log(`Successfully inserted ${insertedCount} tasks`);
          }
        } catch (taskError) {
          console.error("Error generating/inserting tasks:", taskError);
          // Don't throw here as goal was created successfully
          toast({
            title: "Goal created",
            description: "Goal created successfully, but task generation failed. You can add tasks manually.",
            variant: "default",
          });
        }
      }

      toast({
        title: "Success!",
        description: "Your goal has been created successfully.",
      });

      return {
        success: true,
        goal: goalData,
      };

    } catch (error: any) {
      console.error("Error in createGoal:", error);
      
      toast({
        title: "Error creating goal",
        description: error.message || "Could not create goal",
        variant: "destructive",
      });

      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createGoal,
    isLoading,
  };
}
