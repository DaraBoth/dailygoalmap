import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  Calendar,
  Type,
  FileText,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { Goal, GoalType } from "@/types/goal";
import { useUpdateGoal } from "@/hooks/useUpdateGoal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditGoalSlidePanelProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSuccess: (updatedGoal: Goal) => void;
}

const goalTypes: { value: GoalType; label: string }[] = [
  { value: "general", label: "General Goal" },
  { value: "travel", label: "Travel Plan" },
  { value: "finance", label: "Financial Goal" },
  { value: "education", label: "Education Goal" },
];

const EditGoalSlidePanel: React.FC<EditGoalSlidePanelProps> = ({
  isOpen,
  goal,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [noDuration, setNoDuration] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("general");
  const [isClosing, setIsClosing] = useState(false);

  const { updateGoal, isLoading } = useUpdateGoal();
  const { toast } = useToast();

  const applyGoalToForm = (goalData: Goal) => {
    setTitle(goalData.title || "");
    setDescription(goalData.description || "");
    setGoalType(goalData.metadata?.goal_type || "general");
    const isForever = Boolean(goalData.no_duration || goalData.metadata?.no_duration || !goalData.target_date);
    setNoDuration(isForever);
    setTargetDate(goalData.target_date ? new Date(goalData.target_date) : new Date());

    if (goalData.metadata?.start_date) {
      setStartDate(new Date(goalData.metadata.start_date));
    } else {
      setStartDate(new Date(goalData.created_at));
    }
  };

  // Hydrate form from latest database data when panel opens to avoid stale UI values.
  useEffect(() => {
    const hydrateForm = async () => {
      if (!isOpen || !goal?.id) return;

      try {
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('id', goal.id)
          .single();

        if (!error && data) {
          applyGoalToForm(data as unknown as Goal);
          return;
        }
      } catch (err) {
        console.warn('Falling back to local goal data for edit panel hydration:', err);
      }

      applyGoalToForm(goal);
    };

    void hydrateForm();
  }, [isOpen, goal?.id]);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSave = async () => {
    if (!goal || !title.trim()) {
      toast({
        title: "Error",
        description: "Goal title is required.",
        variant: "destructive",
      });
      return;
    }

    const result = await updateGoal(goal.id, {
      title: title.trim(),
      description: description.trim(),
      target_date: noDuration ? null : targetDate,
      no_duration: noDuration,
      start_date: startDate,
      metadata: {
        ...goal.metadata,
        goal_type: goalType,
        start_date: startDate.toISOString(),
        no_duration: noDuration,
      },
    });

    if (result.success && result.goal) {
      // Always return freshly fetched goal so next open shows latest persisted values.
      const { data: refreshedGoal } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goal.id)
        .single();

      onSuccess((refreshedGoal as unknown as Goal) || result.goal);
      handleClose();
    }
  };

  const handleCancel = () => {
    if (goal) {
      applyGoalToForm(goal);
    }
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* Slide Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: isClosing ? "100%" : 0 }}
            exit={{ x: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 200,
              duration: 0.3 
            }}
            className="fixed right-0 top-0 h-[100dvh] w-full md:max-w-xl bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-xl border-l border-border/60 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-slate-100/95 dark:bg-slate-950/95 border-b border-border/60 px-4 sm:px-6 py-4 text-foreground">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Edit Goal</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-full p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                Update your goal details
              </p>
            </div>

            {/* Form Content — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium">
                  <Type className="h-4 w-4" />
                  Goal Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter goal title..."
                  className="bg-background/80 border-border rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your goal..."
                  rows={4}
                  className="bg-background/80 border-border rounded-xl resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4" />
                  Goal Type
                </Label>
                <Select value={goalType} onValueChange={(value: GoalType) => setGoalType(value)}>
                  <SelectTrigger className="bg-background/80 border-border rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <MobileDatePicker
                  date={startDate}
                  setDate={setStartDate}
                  placeholder="Select start date"
                  className="bg-background/80 border-border rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/25 px-3 py-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Forever (No Due Date)
                  </Label>
                  <Switch checked={noDuration} onCheckedChange={setNoDuration} />
                </div>

                {!noDuration && (
                  <>
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      Due Date
                    </Label>
                    <MobileDatePicker
                      date={targetDate}
                      setDate={setTargetDate}
                      placeholder="Select due date"
                      className="bg-background border-border rounded-xl"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-border/60 bg-card/90 backdrop-blur-sm">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 bg-background border-border rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading || !title.trim()}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditGoalSlidePanel;
