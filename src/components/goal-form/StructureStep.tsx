import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FormStepProps } from "./types";

interface StructureStepProps extends FormStepProps {
  onPrevStep: () => void;
  onNextStep: () => void;
}

const StructureStep: React.FC<StructureStepProps> = ({ form, onPrevStep, onNextStep }) => {
  const [newMilestone, setNewMilestone] = useState({ title: "", due_date: undefined as Date | undefined });
  const [newCategory, setNewCategory] = useState("");
  
  const milestones = form.watch("milestones") || [];
  const category = form.watch("category") || "";

  const addMilestone = () => {
    if (newMilestone.title.trim()) {
      const currentMilestones = form.getValues("milestones") || [];
      form.setValue("milestones", [
        ...currentMilestones,
        {
          title: newMilestone.title.trim(),
          due_date: newMilestone.due_date,
        },
      ]);
      setNewMilestone({ title: "", due_date: undefined });
    }
  };

  const removeMilestone = (index: number) => {
    const currentMilestones = form.getValues("milestones") || [];
    form.setValue("milestones", currentMilestones.filter((_, i) => i !== index));
  };

  const addCategory = () => {
    if (newCategory.trim()) {
      form.setValue("category", newCategory.trim());
      setNewCategory("");
    }
  };

  const removeCategory = () => {
    form.setValue("category", "");
  };

  const predefinedCategories = [
    "Health & Fitness",
    "Career & Professional",
    "Personal Development",
    "Financial",
    "Relationships",
    "Education & Learning",
    "Creative & Hobbies",
    "Travel & Adventure",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Structure Your Goal
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add priority, category, and milestones to organize your goal
        </p>
      </div>

      {/* Priority Selection */}
      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Priority Level
            </FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="bg-white/80 dark:bg-white/15 border-gray-200/60 dark:border-white/25">
                  <SelectValue placeholder="Select priority level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Low Priority
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    Medium Priority
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    High Priority
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Category Selection */}
      <div className="space-y-3">
        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Category
        </FormLabel>
        
        {/* Current Category */}
        {category && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
              {category}
              <button
                type="button"
                onClick={removeCategory}
                className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}

        {/* Predefined Categories */}
        {!category && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Quick select:</p>
            <div className="flex flex-wrap gap-2">
              {predefinedCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => form.setValue("category", cat)}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Category Input */}
        {!category && (
          <div className="flex gap-2">
            <Input
              placeholder="Or enter custom category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              className="bg-white/80 dark:bg-white/15 border-gray-200/60 dark:border-white/25"
            />
            <Button
              type="button"
              onClick={addCategory}
              disabled={!newCategory.trim()}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevStep}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        
        <Button
          type="button"
          onClick={onNextStep}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-foreground"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default StructureStep;
