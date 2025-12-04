import React, { useState } from "react";
import { Task } from "./types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Edit,
  Trash2,
  MapPin,
  User,
  Tag,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { openCalendarOptionsDialog } from "@/utils/calendarIntegration";
import { useToast } from "@/hooks/use-toast";

interface TaskDetailsPanelProps {
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  goalTitle: string;
}

const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  selectedTask,
  selectedDate,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  goalTitle
}) => {
  const { toast } = useToast();
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  const handleAddToReminders = async () => {
    if (!selectedTask) return;

    setIsAddingReminder(true);
    try {
      // Show calendar options dialog
      openCalendarOptionsDialog(selectedTask);

      // Add desktop notification reminder as a backup
      const taskDate = new Date(selectedTask.start_date);
      if (selectedTask.daily_start_time) {
        const [hours, minutes] = selectedTask.daily_start_time.split(':').map(Number);
        taskDate.setHours(hours, minutes, 0, 0);
      }

      const { addDesktopReminder } = await import('@/pwa/notificationService');
      await addDesktopReminder(selectedTask.title || selectedTask.description, taskDate);

      // Note: Success message will be shown after actual calendar addition
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while opening calendar options.",
        variant: "destructive",
      });
    } finally {
      setIsAddingReminder(false);
    }
  };
  if (!selectedTask) {
    return (
      <div className="w-full h-full flex flex-col 78 overflow-hidden rounded-l-3xl">
        <div className="p-4 lg:p-6 border-b border-white/20 liquid-glass">
          <h2 className="text-lg font-semibold text-foreground">Task Details</h2>
          <p className="text-sm text-foreground mt-1">Select a task to view details</p>
        </div>

        <div className="flex-1 flex items-center  justify-center p-6 liquid-glass">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full liquid-glass flex items-center justify-center">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Task Selected</h3>
            <p className="text-sm text-foreground">
              Click on a task in the calendar to view its details
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isMultiDay = selectedTask.start_date !== selectedTask.end_date;
  const hasTimeRange = selectedTask.daily_start_time && selectedTask.daily_end_time;

  return (
    <div className="w-full h-full flex flex-col liquid-glass-container overflow-hidden rounded-l-3xl">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-white/20 liquid-glass">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Task Details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={selectedTask.completed ? "default" : "secondary"}
              className="liquid-glass"
            >
              {selectedTask.completed ? "Completed" : "Pending"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTask.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Task Title & Description */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl lg:text-2xl font-bold text-foreground leading-tight">
                  {selectedTask.title || selectedTask.description}
                </h3>
                {selectedTask.title && selectedTask.description && selectedTask.title !== selectedTask.description && (
                  <div className="mt-3 p-4 liquid-glass-card">
                    <div className="text-sm text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 underline break-words"
                            />
                          ),
                        }}
                      >
                        {selectedTask.description}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Task Metadata */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Task Information
              </h4>

              <div className="grid grid-cols-1 gap-3">
                {/* Date Information */}
                <div className="flex items-center gap-3 p-3 liquid-glass-card">
                  <div className="p-2 liquid-glass rounded-lg">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {isMultiDay ? "Date Range" : "Date"}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {isMultiDay
                        ? `${format(new Date(selectedTask.start_date), "MMM d")} - ${format(new Date(selectedTask.end_date), "MMM d, yyyy")}`
                        : format(new Date(selectedTask.start_date), "MMMM d, yyyy")
                      }
                    </p>
                  </div>
                </div>

                {/* Time Information */}
                {hasTimeRange && (
                  <div className="flex items-center gap-3 p-3 liquid-glass-card">
                    <div className="p-2 liquid-glass rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Time Range
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedTask.daily_start_time?.slice(0, 5)} - {selectedTask.daily_end_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Goal Information */}
                <div className="flex items-center gap-3 p-3 liquid-glass-card">
                  <div className="p-2 liquid-glass rounded-lg">
                    <Tag className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Goal
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {goalTitle}
                    </p>
                  </div>
                </div>

                {/* Created/Updated timestamps (if available) */}
                {(selectedTask.created_at || selectedTask.updated_at) && (
                  <div className="flex items-center gap-3 p-3 liquid-glass-card">
                    <div className="p-2 liquid-glass rounded-lg">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {selectedTask.updated_at ? "Last Updated" : "Created"}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {format(new Date(selectedTask.updated_at || selectedTask.created_at!), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Actions
              </h4>

              <div className="space-y-3">
                {/* Completion Toggle */}
                <Button
                  onClick={() => onToggleTaskCompletion(selectedTask.id)}
                  className={`w-full justify-start gap-3 h-12 rounded-xl transition-all duration-200 liquid-glass ${selectedTask.completed ? 'text-success' : 'text-primary'}`}
                  variant="outline"
                >
                  {selectedTask.completed ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Mark as Incomplete</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-5 w-5" />
                      <span className="font-medium">Mark as Complete</span>
                    </>
                  )}
                </Button>

                {/* Download Reminder */}
                <Button
                  onClick={handleAddToReminders}
                  disabled={isAddingReminder}
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 rounded-xl liquid-glass transition-all duration-200"
                >
                  <Bell className="h-5 w-5" />
                  <span className="font-medium">
                    {isAddingReminder ? 'Adding...' : 'Add Reminder'}
                  </span>
                </Button>

                {/* Edit and Delete */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => onEditTask(selectedTask)}
                    variant="outline"
                    className="w-full justify-start gap-2 h-11 rounded-xl liquid-glass transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="font-medium">Edit</span>
                  </Button>

                  <Button
                    onClick={() => onDeleteTask(selectedTask.id)}
                    variant="destructive"
                    className="w-full justify-start gap-2 h-11 rounded-xl liquid-glass transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="font-medium">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TaskDetailsPanel;
