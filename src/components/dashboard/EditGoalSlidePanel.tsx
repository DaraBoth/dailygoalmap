import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Calendar, Type, FileText, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { Goal, GoalType } from "@/types/goal";
import { useUpdateGoal } from "@/hooks/useUpdateGoal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  const [goalType, setGoalType] = useState<GoalType>("general");
  const [isClosing, setIsClosing] = useState(false);

  const { updateGoal, isLoading } = useUpdateGoal();
  const { toast } = useToast();

  // Initialize form data when goal changes
  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description);
      setGoalType(goal.metadata.goal_type);
      setTargetDate(new Date(goal.target_date));
      
      // Handle start date from metadata
      if (goal.metadata.start_date) {
        setStartDate(new Date(goal.metadata.start_date));
      } else {
        setStartDate(new Date(goal.created_at));
      }
    }
  }, [goal]);

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
      target_date: targetDate,
      start_date: startDate,
      metadata: {
        ...goal.metadata,
        goal_type: goalType,
        start_date: startDate.toISOString(),
      },
    });

    if (result.success && result.goal) {
      onSuccess(result.goal);
      handleClose();
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description);
      setGoalType(goal.metadata.goal_type);
      setTargetDate(new Date(goal.target_date));
      if (goal.metadata.start_date) {
        setStartDate(new Date(goal.metadata.start_date));
      }
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
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-l border-white/20 dark:border-white/10 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Edit Goal</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-white hover:bg-white/20 rounded-full p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-white/80 text-sm mt-1">
                Update your goal details
              </p>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Goal Title */}
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
                  className="bg-white/80 dark:bg-white/10 backdrop-blur-sm border-white/20 dark:border-white/10 rounded-xl"
                />
              </div>

              {/* Description */}
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
                  rows={3}
                  className="bg-white/80 dark:bg-white/10 backdrop-blur-sm border-white/20 dark:border-white/10 rounded-xl resize-none"
                />
              </div>

              {/* Goal Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4" />
                  Goal Type
                </Label>
                <Select value={goalType} onValueChange={(value: GoalType) => setGoalType(value)}>
                  <SelectTrigger className="bg-white/80 dark:bg-white/10 backdrop-blur-sm border-white/20 dark:border-white/10 rounded-xl">
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

              {/* Start Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <MobileDatePicker
                  date={startDate}
                  setDate={setStartDate}
                  placeholder="Select start date"
                  className="bg-white/80 dark:bg-white/10 backdrop-blur-sm border-white/20 dark:border-white/10 rounded-xl"
                />
              </div>

              {/* Target Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </Label>
                <MobileDatePicker
                  date={targetDate}
                  setDate={setTargetDate}
                  placeholder="Select due date"
                  className="bg-white/80 dark:bg-white/10 backdrop-blur-sm border-white/20 dark:border-white/10 rounded-xl"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 p-6 border-t border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 bg-white/80 dark:bg-white/10 backdrop-blur-sm border-white/20 dark:border-white/10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading || !title.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl"
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
