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
import { useIsMobile } from "@/hooks/use-mobile";
import { addTaskToReminders, isNativeReminderSupported } from "@/utils/nativeReminders";
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
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  const handleAddToReminders = async () => {
    if (!selectedTask) return;

    setIsAddingReminder(true);
    try {
      const success = await addTaskToReminders(selectedTask);
      
      if (success) {
        toast({
          title: "Reminder Added",
          description: "Task reminder has been added to your device.",
        });
      } else {
        toast({
          title: "Failed to Add Reminder",
          description: "Could not add reminder. Please check permissions.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while adding the reminder.",
        variant: "destructive",
      });
    } finally {
      setIsAddingReminder(false);
    }
  };
  if (!selectedTask) {
    return (
      <div className="w-full h-full flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-l border-white/20 dark:border-white/10 overflow-hidden rounded-l-3xl shadow-lg">
        <div className="p-4 lg:p-6 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Task Details</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Select a task to view details</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100/60 dark:bg-blue-900/30 backdrop-blur-sm flex items-center justify-center">
              <Calendar className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Task Selected</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
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
    <div className="w-full h-full flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-l border-white/20 dark:border-white/10 overflow-hidden rounded-l-3xl shadow-lg">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Task Details</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={selectedTask.completed ? "default" : "secondary"}
              className={`${selectedTask.completed
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                }`}
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
                <h3 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {selectedTask.title || selectedTask.description}
                </h3>
                {selectedTask.title && selectedTask.description && selectedTask.title !== selectedTask.description && (
                  <div className="mt-3 p-4 bg-white/80 dark:bg-white/15 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-white/25">
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
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
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Task Metadata */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Task Information
              </h4>

              <div className="grid grid-cols-1 gap-3">
                {/* Date Information */}
                <div className="flex items-center gap-3 p-3 bg-white/80 dark:bg-white/15 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-white/25">
                  <div className="p-2 bg-blue-100/60 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {isMultiDay ? "Date Range" : "Date"}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {isMultiDay
                        ? `${format(new Date(selectedTask.start_date), "MMM d")} - ${format(new Date(selectedTask.end_date), "MMM d, yyyy")}`
                        : format(new Date(selectedTask.start_date), "MMMM d, yyyy")
                      }
                    </p>
                  </div>
                </div>

                {/* Time Information */}
                {hasTimeRange && (
                  <div className="flex items-center gap-3 p-3 bg-white/80 dark:bg-white/15 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-white/25">
                    <div className="p-2 bg-purple-100/60 dark:bg-purple-900/30 rounded-lg">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Time Range
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedTask.daily_start_time?.slice(0, 5)} - {selectedTask.daily_end_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Goal Information */}
                <div className="flex items-center gap-3 p-3 bg-white/80 dark:bg-white/15 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-white/25">
                  <div className="p-2 bg-green-100/60 dark:bg-green-900/30 rounded-lg">
                    <Tag className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Goal
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {goalTitle}
                    </p>
                  </div>
                </div>

                {/* Created/Updated timestamps (if available) */}
                {(selectedTask.created_at || selectedTask.updated_at) && (
                  <div className="flex items-center gap-3 p-3 bg-white/80 dark:bg-white/15 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-white/25">
                    <div className="p-2 bg-gray-100/60 dark:bg-gray-900/30 rounded-lg">
                      <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {selectedTask.updated_at ? "Last Updated" : "Created"}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {format(new Date(selectedTask.updated_at || selectedTask.created_at!), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Actions
              </h4>

              <div className="space-y-3">
                {/* Completion Toggle */}
                <Button
                  onClick={() => onToggleTaskCompletion(selectedTask.id)}
                  className={`w-full justify-start gap-3 h-12 rounded-xl backdrop-blur-sm transition-all duration-200 ${selectedTask.completed
                      ? 'bg-green-100/80 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300/70 dark:border-green-700/60 hover:bg-green-200/80 dark:hover:bg-green-900/60'
                      : 'bg-blue-100/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300/70 dark:border-blue-700/60 hover:bg-blue-200/80 dark:hover:bg-blue-900/60'
                    }`}
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

                {/* Add to Reminder (Mobile Only) */}
                {isMobile && isNativeReminderSupported() && (
                  <Button
                    onClick={handleAddToReminders}
                    disabled={isAddingReminder}
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 rounded-xl bg-purple-50/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-700/50 hover:bg-purple-100/80 dark:hover:bg-purple-900/40 backdrop-blur-sm transition-all duration-200"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="font-medium">
                      {isAddingReminder ? 'Adding...' : 'Add to Device Reminders'}
                    </span>
                  </Button>
                )}

                {/* Edit and Delete */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => onEditTask(selectedTask)}
                    variant="outline"
                    className="w-full justify-start gap-2 h-11 rounded-xl bg-white/80 dark:bg-white/20 backdrop-blur-sm border-gray-200/60 dark:border-white/25 hover:bg-white/90 dark:hover:bg-white/30 transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="font-medium">Edit</span>
                  </Button>

                  <Button
                    onClick={() => onDeleteTask(selectedTask.id)}
                    variant="outline"
                    className="w-full justify-start gap-2 h-11 rounded-xl bg-red-50/60 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50 hover:bg-red-100/60 dark:hover:bg-red-900/30 backdrop-blur-sm transition-all duration-200"
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
