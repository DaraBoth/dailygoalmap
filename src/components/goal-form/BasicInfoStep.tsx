import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DatePicker } from "@/components/ui";
import { ArrowRight, Plane, DollarSign, GraduationCap, Sparkles, Target, Heart, Briefcase } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { GoalFormValues, goalTypes } from "./types";

interface BasicInfoStepProps {
  form: UseFormReturn<GoalFormValues>;
  onNextStep: () => void;
  selectedGoalType: string;
  compact?: boolean;
}

const BasicInfoStep = ({
  form,
  onNextStep,
  selectedGoalType,
  compact = false
}: BasicInfoStepProps) => {
  const handleNextStep = async () => {
    // Validate the basic fields before moving to next step
    const result = await form.trigger(['title', 'goal_type', 'target_date']);
    if (result) {
      onNextStep();
    }
  };

  return (
    <div className="space-y-6">
      {/* Goal Type Selection */}
      <FormField
        control={form.control}
        name="goal_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
              What type of goal is this?
            </FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className="w-full bg-white/80 dark:bg-white/10 border-gray-200 dark:border-white/20 rounded-lg h-11">
                <SelectValue placeholder="Select goal type" />
              </SelectTrigger>
              <SelectContent>
                {goalTypes.map((type) => {
                  let IconComponent;
                  switch (type.value) {
                    case "travel":
                      IconComponent = Plane;
                      break;
                    case "finance":
                      IconComponent = DollarSign;
                      break;
                    case "education":
                      IconComponent = GraduationCap;
                      break;
                    default:
                      IconComponent = Target;
                  }
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Goal Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
              What's your goal?
            </FormLabel>
            <FormControl>
              <Input
                placeholder={selectedGoalType === 'travel' ? "e.g., Trip to Japan" : "e.g., Learn Spanish"}
                {...field}
                className="bg-white/80 dark:bg-white/10 border-gray-200 dark:border-white/20 rounded-lg h-11 text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Describe your goal
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={selectedGoalType === 'travel' ? "Describe your travel plans, places you want to visit..." : "What do you want to achieve and why?"}
                {...field}
                className="bg-white/80 dark:bg-white/10 border-gray-200 dark:border-white/20 rounded-lg min-h-[100px] resize-none text-base"
              />
            </FormControl>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Be specific - this helps AI generate better tasks for you
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => {
            const today = new Date();
            if (!field.value) {
              field.onChange(today);
            }
            return (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Start Date
                </FormLabel>
                <DatePicker
                  date={field.value || today}
                  setDate={field.onChange}
                  className="w-full bg-white/80 dark:bg-white/10 border-gray-200 dark:border-white/20 rounded-lg"
                />
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="target_date"
          render={({ field }) => {
            const defaultTargetDate = new Date();
            defaultTargetDate.setMonth(defaultTargetDate.getMonth() + 1);

            if (!field.value) {
              field.onChange(defaultTargetDate);
            }

            return (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Target Date
                </FormLabel>
                <DatePicker
                  date={field.value || defaultTargetDate}
                  setDate={field.onChange}
                  className="w-full bg-white/80 dark:bg-white/10 border-gray-200 dark:border-white/20 rounded-lg"
                />
                <FormMessage />
              </FormItem>
            )
          }}
        />
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={handleNextStep}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 h-11 rounded-lg font-medium"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BasicInfoStep;
