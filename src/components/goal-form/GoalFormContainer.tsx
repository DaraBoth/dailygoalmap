import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, X, ArrowLeft } from "lucide-react";
import { GoalFormValues, goalSchema, GoalFormProps, GoalType, GoalFormStep } from "./types";
import BasicInfoStep from "./BasicInfoStep";
import TravelDetailsStep from "./TravelDetailsStep";
import StructureStep from "./StructureStep";
import AdvancedStep from "./AdvancedStep";
import { useCreateGoal, CreateGoalPayload, GoalMetadata } from "@/hooks/useCreateGoal";
import { useUpdateGoal, UpdateGoalPayload } from "@/hooks/useUpdateGoal";
import { ScrollArea } from "../ui";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const GoalFormContainer = ({ onSuccess, initialData, compact = false, onClose, refetchGoals, isEdit = false, goalId }: GoalFormProps) => {
  const { createGoal, isLoading: isCreating } = useCreateGoal();
  const { updateGoal, isLoading: isUpdating } = useUpdateGoal();
  const navigate = useNavigate();
  const isLoading = isCreating || isUpdating;
  const [step, setStep] = useState<GoalFormStep>('basics');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const getInitialDate = () => {
    if (initialData?.target_date) {
      const date = new Date(initialData.target_date);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  };

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      target_date: getInitialDate(),
      start_date: new Date(),
      goal_type: (initialData?.goal_type as GoalType) || "general",
      // Structure fields
      priority: undefined,
      category: "",
      milestones: [],
      // Advanced fields
      template_id: "",
      generate_tasks_with_ai: false,
      ai_prompt: "",
      recurrence: undefined,
      // Travel-specific fields
      travel_destination: initialData?.travel_details?.destination || "",
      travel_accommodation: initialData?.travel_details?.accommodation || "",
      travel_transportation: initialData?.travel_details?.transportation || "",
      travel_budget: initialData?.travel_details?.budget || "",
      travel_activities: "",
    },
  });

  const selectedGoalType = form.watch('goal_type') as GoalType;

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter(a => a !== activity));
    } else {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const handleSubmit = async () => {
    const values = form.getValues();

    // Build metadata from form values
    const metadata: GoalMetadata = {
      version: 1,
      goal_type: values.goal_type,
      priority: values.priority,
      category: values.category,
      start_date: values.start_date?.toISOString(),
      milestones: values.milestones?.map(m => ({ title: m.title || '', due_date: m.due_date?.toISOString() })) || [],
      template_id: values.template_id,
      recurrence: values.recurrence ? {
        type: values.recurrence.type || 'daily',
        timeRange: values.recurrence.timeRange as [string, string] || undefined,
        daysOfWeek: values.recurrence.daysOfWeek
      } : undefined,
    };

    // Add travel-specific fields if applicable
    if (values.goal_type === 'travel') {
      metadata.travel_destination = values.travel_destination;
      metadata.travel_accommodation = values.travel_accommodation;
      metadata.travel_transportation = values.travel_transportation;
      metadata.travel_budget = values.travel_budget;
      metadata.travel_activities = selectedActivities;
    }

    if (isEdit && goalId) {
      // Update existing goal
      const updatePayload: UpdateGoalPayload = {
        title: values.title,
        description: values.description,
        target_date: values.target_date,
        start_date: values.start_date,
        metadata: {
          ...metadata,
          start_date: values.start_date?.toISOString() || new Date().toISOString()
        },
      };

      const result = await updateGoal(goalId, updatePayload, {
        generateTasksWithAI: values.generate_tasks_with_ai,
        aiPrompt: values.ai_prompt,
      });

      if (result.success && result.goal) {
        onSuccess(result.goal);
        form.reset();
        setStep('basics');
        setSelectedActivities([]);
        if (onClose) onClose();
        if (refetchGoals) refetchGoals();
      }
    } else {
      // Create new goal
      const createPayload: CreateGoalPayload = {
        title: values.title,
        description: values.description,
        target_date: values.target_date,
        start_date: values.start_date,
        metadata,
      };

      const result = await createGoal(createPayload, {
        generateTasksWithAI: values.generate_tasks_with_ai,
        aiPrompt: values.ai_prompt,
      });

      if (result.success && result.goal) {
        onSuccess(result.goal);
        form.reset();
        setStep('basics');
        setSelectedActivities([]);
        if (onClose) onClose();
        if (refetchGoals) refetchGoals();
      }
    }
  };

  // Navigation functions for the simplified 2-step flow
  const handleNextStep = () => {
    if (step === 'basics') {
      setStep('advanced');
    }
  };

  const handlePrevStep = () => {
    if (step === 'advanced') {
      setStep('basics');
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Bar */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/goal/create' })}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {isEdit ? "Edit Goal" : "Create New Goal"}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {isEdit ? "Update your goal details" : "Set up your goal in just 2 simple steps"}
                </p>
              </div>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-8 sm:py-12">
        {/* Step Indicator */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all transform ${
              step === 'basics' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105' 
                : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'basics' ? 'bg-white text-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                1
              </div>
              <span className="hidden sm:inline">Goal Details</span>
            </div>
            
            <div className="w-16 sm:w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                style={{ width: step === 'basics' ? '0%' : '100%' }}
              />
            </div>
            
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all transform ${
              step === 'advanced' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105' 
                : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'advanced' ? 'bg-white text-purple-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                2
              </div>
              <span className="hidden sm:inline">AI Assistant</span>
            </div>
          </div>
        </div>

        {/* Form Content Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            <Form {...form}>
              <form className="space-y-6">
                {step === 'basics' ? (
                  <BasicInfoStep
                    form={form}
                    onNextStep={handleNextStep}
                    selectedGoalType={selectedGoalType}
                  />
                ) : selectedGoalType === 'travel' ? (
                  <TravelDetailsStep
                    form={form}
                    onPrevStep={handlePrevStep}
                    onNextStep={() => setStep('advanced')}
                    selectedActivities={selectedActivities}
                    toggleActivity={toggleActivity}
                  />
                ) : (
                  <AdvancedStep
                    form={form}
                    onPrevStep={handlePrevStep}
                    onSubmit={handleSubmit}
                    isSubmitting={isLoading}
                    isEdit={isEdit}
                  />
                )}
              </form>
            </Form>
          </div>
        </div>

        {/* Helper Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 Tip: {step === 'basics' 
              ? 'Be specific with your goal details for better AI task generation' 
              : 'Enable AI to get personalized daily action plans'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoalFormContainer;
