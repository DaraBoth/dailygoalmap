
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

// Enhanced schema with new metadata fields
export const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  target_date: z.date({
    required_error: "Target date is required",
  }),
  start_date: z.date().optional(),
  goal_type: z.enum(["general", "travel", "finance", "education", "financial"]),
  // Structure fields (Step 2)
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.string().optional(),
  milestones: z.array(z.object({
    title: z.string().min(1, "Milestone title is required"),
    due_date: z.date().optional(),
  })).optional(),
  // Advanced fields (Step 3)
  template_id: z.string().optional(),
  generate_tasks_with_ai: z.boolean().optional(),
  ai_prompt: z.string().optional(),
  recurrence: z.object({
    type: z.enum(["daily", "weekly", "monthly"]).optional(),
    timeRange: z.array(z.string()).optional(),
    daysOfWeek: z.array(z.number()).optional(),
  }).optional(),
  // Travel-specific fields
  travel_destination: z.string().optional(),
  travel_accommodation: z.string().optional(),
  travel_transportation: z.string().optional(),
  travel_budget: z.string().optional(),
  travel_activities: z.string().optional(),
});

export type GoalType = "general" | "travel" | "finance" | "education" | "financial";

export const goalTypes = [
  { value: "general", label: "General Goal", icon: "Sparkles" },
  { value: "travel", label: "Travel Plan", icon: "Plane" },
  { value: "finance", label: "Financial Goal", icon: "Calendar" },
  { value: "education", label: "Education Goal", icon: "Calendar" }
] as const;

export const travelActivities = [
  "sightseeing", 
  "hiking", 
  "shopping", 
  "relaxing", 
  "adventure", 
  "food tours", 
  "cultural experiences", 
  "beach", 
  "museums", 
  "nightlife"
] as const;

export type GoalFormValues = z.infer<typeof goalSchema>;

export type GoalFormStep = 'basics' | 'structure' | 'advanced';

export interface GoalFormProps {
  onSuccess: (goal: any) => void;
  initialData?: {
    title: string;
    description: string;
    target_date: string;
    goal_type: string;
    travel_details?: {
      destination?: string;
      accommodation?: string;
      transportation?: string;
      budget?: string;
      activities?: string[];
    };
  };
  compact?: boolean;
  onClose?: () => void;
  refetchGoals?: () => void;
  isEdit?: boolean;
  goalId?: string;
}

export type FormStepProps = {
  form: UseFormReturn<GoalFormValues>;
};

// Template interface for goal templates
export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  goal_type: GoalType;
  milestones: Array<{
    title: string;
    due_date_offset?: number; // days from start
  }>;
  suggested_habits?: Array<{
    title: string;
    recurrence: {
      type: 'daily' | 'weekly';
      timeRange?: [string, string];
      daysOfWeek?: number[];
    };
  }>;
}
