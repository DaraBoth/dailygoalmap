import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DatePicker } from "@/components/ui";
import { ArrowRight, Plane, DollarSign, GraduationCap, Sparkles } from "lucide-react";
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
  return (
    <div className="rounded-xl bg-background shadow-xl p-6">
      <FormField
        control={form.control}
        name="goal_type"
        render={({ field }) => (
          <FormItem className="mb-4">
            <FormLabel className="text-base font-semibold text-foreground">Goal Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className="w-full border border-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground">
                <SelectValue placeholder="Select goal type" />
              </SelectTrigger>
              <SelectContent>
                {goalTypes.map((type) => {
                  let IconComponent;
                  switch (type.icon) {
                    case "Sparkles":
                      IconComponent = Sparkles;
                      break;
                    case "Plane":
                      IconComponent = Plane;
                      break;
                    case "Calendar":
                      IconComponent = type.value === "finance" ? DollarSign : GraduationCap;
                      break;
                    default:
                      IconComponent = Sparkles;
                  }
                  return (
                    <SelectItem key={type.value} value={type.value} className="flex items-center gap-2">
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

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem className="mb-4">
            <FormLabel className="text-base font-semibold text-foreground">Goal Title</FormLabel>
            <FormControl>
              <Input
                placeholder={selectedGoalType === 'travel' ? "e.g., Trip to Japan, European Adventure" : "e.g., Save for a vacation, Learn to cook"}
                {...field}
                className="bg-background border border-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="mb-4">
            <FormLabel className="text-base font-semibold text-foreground">Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder={selectedGoalType === 'travel' ? "Describe your travel plans, places you want to visit, and what you want to experience..." : "Describe your goal in more detail..."}
                {...field}
                className={`${compact ? "h-16" : "h-24"} resize-none bg-background border border-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-4`}>
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
                <FormLabel className="text-base font-semibold text-foreground">Start Date</FormLabel>
                <DatePicker
                  date={field.value || today}
                  setDate={field.onChange}
                  className="w-full border border-muted rounded-lg focus:ring-2 focus:ring-blue-500"
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
            // Set default target date to 1 month from today if not set
            const defaultTargetDate = new Date();
            defaultTargetDate.setMonth(defaultTargetDate.getMonth() + 1);

            if (!field.value) {
              field.onChange(defaultTargetDate);
            }

            return (
              <FormItem>
                <FormLabel className="text-base font-semibold text-foreground">Target Date</FormLabel>
                <DatePicker
                  date={field.value || defaultTargetDate}
                  setDate={field.onChange}
                  className="w-full border border-muted rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <FormMessage />
              </FormItem>
            )
          }}
        />
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onNextStep}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg px-6 py-2 shadow"
        >
          Next: Structure
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BasicInfoStep;
