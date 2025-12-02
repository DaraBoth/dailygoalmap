import { useState } from "react";
import { updateGoal } from "@/utils/supabaseOperations";
import { Goal } from "@/types/goal";
import { useToast } from "@/hooks/use-toast";

export const useGoalStatus = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const markGoalAsComplete = async (goalId: string): Promise<{ success: boolean; goal?: Goal }> => {
    setIsLoading(true);
    
    try {
      const updatedGoal = await updateGoal(goalId, {
        status: "completed",
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Goal Completed! 🎉",
        description: "Congratulations on achieving your goal!",
        variant: "default",
      });

      return {
        success: true,
        goal: updatedGoal,
      };
    } catch (error: any) {
      console.error("Error marking goal as complete:", error);
      
      toast({
        title: "Error",
        description: "Failed to mark goal as complete. Please try again.",
        variant: "destructive",
      });

      return {
        success: false,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const archiveGoal = async (goalId: string): Promise<{ success: boolean; goal?: Goal }> => {
    setIsLoading(true);
    
    try {
      const updatedGoal = await updateGoal(goalId, {
        status: "archived",
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Goal Archived",
        description: "Goal has been moved to your archive.",
        variant: "default",
      });

      return {
        success: true,
        goal: updatedGoal,
      };
    } catch (error: any) {
      console.error("Error archiving goal:", error);
      
      toast({
        title: "Error",
        description: "Failed to archive goal. Please try again.",
        variant: "destructive",
      });

      return {
        success: false,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateGoal = async (goalId: string): Promise<{ success: boolean; goal?: Goal }> => {
    setIsLoading(true);
    
    try {
      const updatedGoal = await updateGoal(goalId, {
        status: "active",
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Goal Reactivated",
        description: "Goal has been moved back to active goals.",
        variant: "default",
      });

      return {
        success: true,
        goal: updatedGoal,
      };
    } catch (error: any) {
      console.error("Error reactivating goal:", error);
      
      toast({
        title: "Error",
        description: "Failed to reactivate goal. Please try again.",
        variant: "destructive",
      });

      return {
        success: false,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const extendGoalDeadline = async (
    goalId: string, 
    newTargetDate: Date
  ): Promise<{ success: boolean; goal?: Goal }> => {
    setIsLoading(true);
    
    try {
      const updatedGoal = await updateGoal(goalId, {
        target_date: newTargetDate.toISOString().split("T")[0],
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Deadline Extended",
        description: "Goal deadline has been successfully updated.",
        variant: "default",
      });

      return {
        success: true,
        goal: updatedGoal,
      };
    } catch (error: any) {
      console.error("Error extending goal deadline:", error);
      
      toast({
        title: "Error",
        description: "Failed to extend deadline. Please try again.",
        variant: "destructive",
      });

      return {
        success: false,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    markGoalAsComplete,
    archiveGoal,
    reactivateGoal,
    extendGoalDeadline,
    isLoading,
  };
};
