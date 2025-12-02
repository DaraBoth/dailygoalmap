
import { useCallback } from 'react';
import { Goal, GoalData } from '@/types/goal';
import { toast } from '@/components/ui/use-toast';
import { useCreateGoal, CreateGoalPayload, GoalMetadata } from '@/hooks/useCreateGoal';

export const useGoalCreation = () => {
  const { createGoal: createGoalUnified } = useCreateGoal();

  const createGoal = useCallback(async (
    goalData: GoalData,
    fetchGeminiApiKey: () => Promise<string>,
    onSuccess?: (goal: Goal) => void
  ) => {
    // Validate goal data
    if (!goalData.title || !goalData.target_date) {
      return {
        success: false,
        message: "Missing required goal information. Please provide title and target date.",
      };
    }

    try {
      // Convert GoalData to CreateGoalPayload format
      const metadata: GoalMetadata = {
        version: 1,
        goal_type: goalData.goal_type || 'general',
        start_date: goalData.start_date,
        // Add travel details if present
        ...(goalData.travel_details && {
          travel_destination: goalData.travel_details.destination,
          travel_accommodation: goalData.travel_details.accommodation,
          travel_transportation: goalData.travel_details.transportation,
          travel_budget: goalData.travel_details.budget,
          travel_activities: goalData.travel_details.activities,
        }),
        // Add financial details if present
        ...(goalData.financial_details && {
          financial_details: goalData.financial_details,
        }),
      };

      const payload: CreateGoalPayload = {
        title: goalData.title,
        description: goalData.description,
        target_date: new Date(goalData.target_date),
        start_date: goalData.start_date ? new Date(goalData.start_date) : new Date(),
        metadata,
      };
      
      // Use the unified createGoal hook
      const result = await createGoalUnified(payload, {
        generateTasksWithAI: true, // Chat-based goals typically want AI tasks
        aiPrompt: goalData.description,
      });

      if (result.success && result.goal) {
        // Convert the result to the expected Goal format
        const createdGoal: Goal = {
          id: result.goal.id,
          title: result.goal.title,
          description: result.goal.description || '',
          target_date: result.goal.target_date || '',
          status: result.goal.status || 'active',
          created_at: result.goal.created_at,
          updated_at: result.goal.updated_at,
          metadata: result.goal.metadata,
          user_id: result.goal.user_id,
          share_code: result.goal.share_code
        };

        console.log("Goal created:", createdGoal);

        // Call onSuccess callback with the created goal
        if (onSuccess) {
          onSuccess(createdGoal);
        }

        return {
          success: true,
          goal: createdGoal,
          message: "Your goal has been created successfully! I've added tasks to help you achieve it."
        };
      } else {
        return {
          success: false,
          message: result.error || "Failed to create goal"
        };
      }
    } catch (error: any) {
      console.error("Error creating goal:", error);

      return {
        success: false,
        message: "I couldn't create your goal due to a technical issue. Please try again."
      };
    }
  }, []);

  return {
    createGoal
  };
};
