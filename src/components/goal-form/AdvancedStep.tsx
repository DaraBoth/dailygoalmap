import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Sparkles, Target, BookOpen, DollarSign, Plane, Heart, Loader2 } from "lucide-react";
import { FormStepProps, GoalTemplate, GoalType } from "./types";
import { goalTemplates } from "@/data/goalTemplates";

interface AdvancedStepProps extends FormStepProps {
  onPrevStep: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEdit?: boolean;
}

const getTemplateIcon = (goalType: GoalType) => {
  switch (goalType) {
    case "finance":
    case "financial":
      return DollarSign;
    case "travel":
      return Plane;
    case "education":
      return BookOpen;
    default:
      return Target;
  }
};

const AdvancedStep: React.FC<AdvancedStepProps> = ({ form, onPrevStep, onSubmit, isSubmitting, isEdit = false }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);

  const generateTasksWithAI = form.watch("generate_tasks_with_ai") || false;
  const aiPrompt = form.watch("ai_prompt") || "";
  const goalType = form.watch("goal_type");

  const applyTemplate = (template: GoalTemplate) => {
    setSelectedTemplate(template);
    
    // Apply template data to form
    if (!form.getValues("title")) {
      form.setValue("title", template.name);
    }
    
    if (!form.getValues("category")) {
      form.setValue("category", template.category);
    }
    
    // Apply milestones if none exist
    const currentMilestones = form.getValues("milestones") || [];
    if (currentMilestones.length === 0) {
      const startDate = form.getValues("start_date") || new Date();
      const milestones = template.milestones.map(milestone => ({
        title: milestone.title,
        due_date: milestone.due_date_offset 
          ? new Date(startDate.getTime() + milestone.due_date_offset * 24 * 60 * 60 * 1000)
          : undefined,
      }));
      form.setValue("milestones", milestones);
    }
    
    // Store template ID for reference
    form.setValue("template_id", template.id);
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    form.setValue("template_id", "");
  };

  // Filter templates by goal type
  const relevantTemplates = goalTemplates.filter(template => 
    template.goal_type === goalType || template.goal_type === "general"
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Advanced Options
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose a template or enable AI task generation
        </p>
      </div>

      {/* Goal Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Goal Templates
          </FormLabel>
          {selectedTemplate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearTemplate}
              className="text-xs"
            >
              Clear Template
            </Button>
          )}
        </div>

        {selectedTemplate ? (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {React.createElement(getTemplateIcon(selectedTemplate.goal_type), { 
                  className: "h-5 w-5 text-blue-600 dark:text-blue-400" 
                })}
                <CardTitle className="text-base">{selectedTemplate.name}</CardTitle>
                <Badge variant="secondary" className="ml-auto">
                  Applied
                </Badge>
              </div>
              <CardDescription>{selectedTemplate.description}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relevantTemplates.map((template) => {
              const IconComponent = getTemplateIcon(template.goal_type);
              return (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-gray-200/60 dark:border-white/25 hover:border-blue-300 dark:hover:border-blue-700"
                  onClick={() => applyTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {template.milestones.length} milestones
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Task Generation */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="generate_tasks_with_ai"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200/60 dark:border-white/25 p-4 bg-white/60 dark:bg-white/10">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Generate Tasks with AI
                </FormLabel>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically create detailed tasks to help achieve your goal
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {generateTasksWithAI && (
          <FormField
            control={form.control}
            name="ai_prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Additional Context (Optional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide any specific requirements, preferences, or constraints for your goal..."
                    className="bg-white/80 dark:bg-white/15 border-gray-200/60 dark:border-white/25 min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This helps AI generate more relevant and personalized tasks
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Navigation Buttons */}
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
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEdit ? "Updating Goal..." : "Creating Goal..."}
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              {isEdit ? "Update Goal" : "Create Goal"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdvancedStep;
