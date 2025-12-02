
import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { GoalFormValues, GoalType } from "./types";
import { SmartLink } from "@/components/ui/SmartLink";
import { useGoalCreation } from "@/components/goal/chat/hooks/useGoalCreation";

interface AISettingsStepProps {
  form: UseFormReturn<GoalFormValues>;
  onPrevStep: () => void;
  selectedGoalType: GoalType;
  apiKeys: {id: string, key_name: string}[];
  selectedKeyId: string;
  setSelectedKeyId: (id: string) => void;
  onSubmit: () => void;
  createGoalWithTasks: () => void;
  isSubmitting: boolean;
  isCreatingWithAI: boolean;
  compact?: boolean;
  refetchGoals?: () => void;
}

const AISettingsStep = ({
  form,
  onPrevStep,
  selectedGoalType,
  apiKeys,
  selectedKeyId,
  setSelectedKeyId,
  onSubmit,
  createGoalWithTasks,
  isSubmitting,
  isCreatingWithAI,
  compact = false,
  refetchGoals
}: AISettingsStepProps) => {
  const { toast } = useToast();
  const { createGoal } = useGoalCreation();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handleCreateGoal = async () => {
    const values = form.getValues();

    // Validate required fields
    if (!values.title || !values.target_date || !values.goal_type) {
      toast({
        title: "Cannot Create Goal",
        description: "Please fill out all required fields before creating a goal.",
        variant: "destructive",
      });
      return;
    }

    try {
      const goalTypeFixed = values.goal_type as GoalType;
      
      const result = await createGoal(
        {
          title: values.title,
          description: values.description || "",
          target_date: values.target_date.toISOString().split("T")[0],
          start_date: values.start_date ? values.start_date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          goal_type: goalTypeFixed,
        },
        async () => "" // No API key needed for non-AI goal creation
      );

      console.log(result);
      
      if (result.success) {
        toast({
          title: "Success!",
          description: "Your goal has been created.",
          variant: "success",
        });

        setIsModalOpen(false);
        if (refetchGoals) {
          refetchGoals();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error creating goal:", error);
      toast({
        title: "Error",
        description: "Could not create goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="mb-4">
        <h2 className={`${compact ? "text-lg" : "text-xl"} font-bold text-foreground mb-2`}>AI Task Generation</h2>
        {!compact && (
          <p className="text-muted-foreground mb-4">
            We'll use Google's Gemini AI to automatically create a personalized task plan to help you achieve your goal.
          </p>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select AI API Key</label>
          {apiKeys.length > 0 ? (
            <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an API key" />
              </SelectTrigger>
              <SelectContent>
                {apiKeys.map(key => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.key_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
              No Gemini API keys found. The system will use a default key if available.
              <SmartLink
                to="/profile"
                className="text-blue-500 hover:underline ml-1"
              > 
                Add one here?
              </SmartLink>
            </div>
          )}
          {!compact && (
            <p className="text-xs text-muted-foreground mt-2">
              AI task generation works best with a valid API key.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-4 flex-wrap gap-2 sm:flex-row sm:gap-2">
        <Button
          type="button"
          onClick={onPrevStep}
          variant="outline"
          size={compact ? "sm" : "default"}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {selectedGoalType === 'travel' ? 'Travel Details' : 'Basic Info'}
        </Button>
        
        <div className="flex flex-col sm:flex-row sm:space-x-2 flex-wrap gap-2 w-full sm:w-auto">
        <Button
            type="button"
            onClick={handleCreateGoal}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white w-full sm:w-auto"
            size={compact ? "sm" : "default"}
          >
            Create Goal
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (form.formState.isValid) {
                createGoalWithTasks();
              } else {
                toast({
                  title: "Cannot Create Goal",
                  description: "Please ensure all required fields are filled out before proceeding.",
                  variant: "destructive",
                });
              }
            }}
            disabled={isCreatingWithAI}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white w-full sm:w-auto"
            size={compact ? "sm" : "default"}
          >
            {isCreatingWithAI ? (
              <>Creating with AI...</>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Goal with AI Tasks
              </>
            )}
          </Button>
          
        </div>
      </div>
    </>
  );
};

export default AISettingsStep;
