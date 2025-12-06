import React from "react";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Sparkles, Target, Loader2 } from "lucide-react";
import { FormStepProps } from "./types";

interface AdvancedStepProps extends FormStepProps {
  onPrevStep: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEdit?: boolean;
}

const AdvancedStep: React.FC<AdvancedStepProps> = ({ form, onPrevStep, onSubmit, isSubmitting, isEdit = false }) => {
  const generateTasksWithAI = form.watch("generate_tasks_with_ai") || false;

  const handleSubmit = async () => {
    // Validate required fields before submitting
    const result = await form.trigger(['title', 'goal_type', 'target_date']);
    if (result) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          AI Task Generation
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Let AI create a personalized action plan to help you achieve your goal
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="generate_tasks_with_ai"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border-2 border-purple-200 dark:border-purple-500/30 p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <div className="space-y-0.5 flex-1 pr-4">
                <FormLabel className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Generate Daily Action Plan with AI
                </FormLabel>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                  <p>AI will analyze your goal and create daily tasks and milestones to help you succeed.</p>
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-purple-600"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {generateTasksWithAI && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="ai_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Additional Instructions (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., I prefer morning workouts, budget is , focus on beginner tasks"
                      className="bg-white/80 dark:bg-white/15 border-gray-200/60 dark:border-white/25 min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Share your preferences for more personalized tasks
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevStep}
          className="flex items-center gap-2"
          disabled={isSubmitting}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-foreground"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              {generateTasksWithAI ? <Sparkles className="h-4 w-4" /> : <Target className="h-4 w-4" />}
              {isEdit ? "Update Goal" : (generateTasksWithAI ? "Create & Generate Tasks" : "Create Goal")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdvancedStep;
