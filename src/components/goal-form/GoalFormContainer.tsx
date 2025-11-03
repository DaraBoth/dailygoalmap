import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plane, Sparkles, X } from "lucide-react";
import { GoalFormValues, goalSchema, GoalFormProps, GoalType, GoalFormStep } from "./types";
import BasicInfoStep from "./BasicInfoStep";
import TravelDetailsStep from "./TravelDetailsStep";
import StructureStep from "./StructureStep";
import AdvancedStep from "./AdvancedStep";
import { useCreateGoal, CreateGoalPayload, GoalMetadata } from "@/hooks/useCreateGoal";
import { useUpdateGoal, UpdateGoalPayload } from "@/hooks/useUpdateGoal";
import { ScrollArea } from "../ui";

const GoalFormContainer = ({ onSuccess, initialData, compact = false, onClose, refetchGoals, isEdit = false, goalId }: GoalFormProps) => {
  const { createGoal, isLoading: isCreating } = useCreateGoal();
  const { updateGoal, isLoading: isUpdating } = useUpdateGoal();
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

  // Navigation functions for the new 3-step flow
  const handleNextStep = () => {
    if (step === 'basics') {
      setStep('structure');
    } else if (step === 'structure') {
      setStep('advanced');
    }
  };

  const handlePrevStep = () => {
    if (step === 'advanced') {
      setStep('structure');
    } else if (step === 'structure') {
      setStep('basics');
    }
  };



  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl bg-card rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={onClose}
          className="absolute z-20 top-4 right-4 text-foreground transition-colors duration-200"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header with step indicator */}
        <div className="liquid-glass bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-foreground">
          <h1 className={`${compact ? "text-xl" : "text-2xl"} font-bold flex items-center gap-2`}>
            <Sparkles className="h-5 w-5" /> {isEdit ? "Edit Goal" : "Set a New Goal"}
          </h1>
          {!compact && (
            <p className="opacity-90 text-foreground/80">
              {isEdit ? "Update your goal with structured planning" : "Create your goal with structured planning and optional AI assistance"}
            </p>
          )}

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${step === 'basics' ? 'liquid-glass text-foreground' : 'bg-white/10 text-foreground/60'
              }`}>
              1. Basics
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${step === 'structure' ? 'liquid-glass text-foreground' : 'bg-white/10 text-foreground/60'
              }`}>
              2. Structure
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${step === 'advanced' ? 'liquid-glass text-foreground' : 'bg-white/10 text-foreground/60'
              }`}>
              3. Advanced
            </div>
          </div>
        </div>

        <div className="p-6 backdrop-blur-sm text-card-foreground ">
          <ScrollArea className="h-full">
            <Form {...form}>
              <form className="space-y-4">
                {step === 'basics' ? (
                  <BasicInfoStep
                    form={form}
                    onNextStep={handleNextStep}
                    selectedGoalType={selectedGoalType}
                  />
                ) : step === 'structure' ? (
                  <StructureStep
                    form={form}
                    onPrevStep={handlePrevStep}
                    onNextStep={handleNextStep}
                  />
                ) : step === 'advanced' && selectedGoalType === 'travel' ? (
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
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default GoalFormContainer;
