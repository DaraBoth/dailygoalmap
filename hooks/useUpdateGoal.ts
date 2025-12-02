import { useState } from "react";
import { updateGoal } from "@/utils/supabaseOperations";
import { Goal, GoalMetadata } from "@/types/goal";
import { useToast } from "@/hooks/use-toast";

export interface UpdateGoalPayload {
  title: string;
  description: string;
  target_date: Date;
  start_date?: Date;
  metadata: GoalMetadata;
}

export interface UpdateGoalOptions {
  generateTasksWithAI?: boolean;
  aiPrompt?: string;
  requestedTaskCount?: number;
}

export const useUpdateGoal = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const updateGoalData = async (
    goalId: string,
    payload: UpdateGoalPayload,
    options: UpdateGoalOptions = {}
  ): Promise<{ success: boolean; goal?: Goal; message?: string }> => {
    setIsLoading(true);
    
    try {
      // Ensure metadata has version and start_date
      const metadata: GoalMetadata = {
        version: 1,
        ...payload.metadata,
        // Ensure start_date is properly set in metadata
        start_date: payload.start_date ? payload.start_date.toISOString().split("T")[0] : payload.metadata.start_date,
      };

      // Prepare goal data for update
      const goalData: Partial<Goal> = {
        title: payload.title,
        description: payload.description || "",
        target_date: (() => {
          const date = new Date(payload.target_date);
          date.setDate(date.getDate() + 1);
          return date.toISOString().split("T")[0];
        })(),
        metadata,
      };



      // Update goal in database
      const updatedGoal = await updateGoal(goalId, goalData);

      toast({
        title: "Success!",
        description: "Your goal has been updated successfully.",
        variant: "default",
      });

      return {
        success: true,
        goal: updatedGoal,
      };
    } catch (error: any) {
      console.error("Error updating goal:", error);
      
      const errorMessage = error?.message || "Failed to update goal. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateGoal: updateGoalData,
    isLoading,
  };
};
