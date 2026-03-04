import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, User, Calendar, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserContextStep from "../goal-form/UserContextStep";
import { GoalFormValues } from "../goal-form/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface EditGoalInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
  onSuccess?: () => void;
}

const EditGoalInfoModal = ({ open, onOpenChange, goal, onSuccess }: EditGoalInfoModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("user-context");

  // Initialize form with existing goal metadata
  const form = useForm<Partial<GoalFormValues>>({
    defaultValues: {
      user_context: goal?.metadata?.user_context || {},
    },
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const values = form.getValues();

      // Update goal metadata with new user context
      const updatedMetadata = {
        ...goal.metadata,
        user_context: values.user_context,
      };

      const { error } = await supabase
        .from("goals")
        .update({ metadata: updatedMetadata })
        .eq("id", goal.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Goal information updated successfully",
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error updating goal info:", error);
      toast({
        title: "Error",
        description: "Failed to update goal information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "overflow-hidden flex flex-col",
          isMobile ? "h-[90vh] rounded-t-3xl" : "w-full sm:w-[600px] lg:w-[800px] xl:w-[900px]"
        )}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
            Edit Goal Information
          </SheetTitle>
          <SheetDescription className="text-xs sm:text-sm">
            Update your personal information to help AI generate better, more personalized tasks
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="user-context" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Your Info
            </TabsTrigger>
            <TabsTrigger value="goal-details" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Goal Details
            </TabsTrigger>
            <TabsTrigger value="ai-preview" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <Form {...form}>
              <TabsContent value="user-context" className="mt-0">
                <UserContextStep form={form as any} />
              </TabsContent>

              <TabsContent value="goal-details" className="mt-0">
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Goal Overview</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Title:</span> {goal?.title}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>{" "}
                        {goal?.metadata?.goal_type || "general"}
                      </div>
                      <div>
                        <span className="font-medium">Target Date:</span>{" "}
                        {goal?.target_date ? new Date(goal.target_date).toLocaleDateString() : "Not set"}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> {goal?.status}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Current Metadata</h3>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">
                      {JSON.stringify(goal?.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai-preview" className="mt-0">
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      How AI Will Use Your Information
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your information is converted into a detailed system prompt that instructs the AI
                      to create personalized, realistic tasks.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4 bg-muted/30">
                    <h4 className="font-medium mb-2">Example AI Instructions:</h4>
                    <div className="space-y-2 text-sm">
                      {form.watch("user_context.wake_up_time") && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>
                            No tasks before {form.watch("user_context.wake_up_time")} (wake up time)
                          </span>
                        </div>
                      )}
                      {form.watch("user_context.work_start_time") && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>
                            Avoid scheduling during work hours:{" "}
                            {form.watch("user_context.work_start_time")} -{" "}
                            {form.watch("user_context.work_end_time")}
                          </span>
                        </div>
                      )}
                      {form.watch("user_context.available_time_per_day") && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>
                            Tasks fit within {form.watch("user_context.available_time_per_day")} per day
                          </span>
                        </div>
                      )}
                      {form.watch("user_context.current_skill_level") && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>
                            Task difficulty matches {form.watch("user_context.current_skill_level")}{" "}
                            level
                          </span>
                        </div>
                      )}
                      {form.watch("user_context.monthly_income") && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>
                            Financial tasks based on actual income $
                            {form.watch("user_context.monthly_income")}
                          </span>
                        </div>
                      )}
                      {!form.watch("user_context.wake_up_time") &&
                        !form.watch("user_context.work_start_time") && (
                          <div className="text-muted-foreground italic">
                            Fill out your information to see personalization preview
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">Benefits:</h4>
                    <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                      <li>Tasks that respect your actual schedule</li>
                      <li>Realistic financial goals based on your income</li>
                      <li>Appropriate difficulty for your skill level</li>
                      <li>Consideration of your commitments and obstacles</li>
                      <li>Better task timing based on your energy levels</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Form>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-3 sm:pt-4 border-t px-4 sm:px-6 pb-4 sm:pb-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting}
            className="h-9 sm:h-10 text-xs sm:text-sm"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="h-9 sm:h-10 text-xs sm:text-sm"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditGoalInfoModal;
