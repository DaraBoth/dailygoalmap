import { Task } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarIcon, CheckCircle2, Circle, Edit2, Trash2, Clock, AlertCircle, Tag } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { TaskTags } from "./TaskTags";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { openCalendarOptionsDialog } from "@/utils/calendarIntegration";

interface TaskDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  goalTitle: string;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

const TaskDetailsSidebar = ({
  isOpen,
  onClose,
  selectedTask,
  selectedDate,
  onToggleTaskCompletion,
  goalTitle,
  onEditTask,
  onDeleteTask,
}: TaskDetailsSidebarProps) => {
  const { toast } = useToast();
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  const handleAddToReminders = async () => {
    if (!selectedTask) return;

    setIsAddingReminder(true);
    try {
      openCalendarOptionsDialog(selectedTask);

      const taskDate = new Date(selectedTask.start_date);
      if (selectedTask.daily_start_time) {
        const [hours, minutes] = selectedTask.daily_start_time.split(':').map(Number);
        taskDate.setHours(hours, minutes, 0, 0);
      }

      const { addDesktopReminder } = await import('@/pwa/notificationService');
      await addDesktopReminder(selectedTask.title || selectedTask.description, taskDate);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-50 shadow-xl border-l border-gray-200/60 dark:border-white/10"
        >
          <div className="h-full flex flex-col max-h-screen overflow-hidden">
            {/* Header - goal title, task title and controls */}
            <div className="flex-shrink-0 bg-white/90 dark:bg-white/15 backdrop-blur-md border-b border-gray-200/60 dark:border-white/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{goalTitle}</div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate mt-1">{selectedTask?.title || 'Task Details'}</h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Settings / Edit button */}
                  {onEditTask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="inline-flex items-center gap-2"
                      onClick={() => selectedTask && onEditTask(selectedTask)}
                      aria-label="Edit task"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  )}

                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg bg-white/80 dark:bg-white/20 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/90 dark:hover:bg-white/30 transition-all duration-200"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {selectedTask ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Top row: status */}
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedTask.completed
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {selectedTask.completed ? 'Completed' : 'In Progress'}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-gray-200/60 dark:border-white/10">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Date</div>
                    <div className="text-sm text-gray-900 dark:text-white">{selectedDate ? format(selectedDate, 'MMMM d, yyyy') : format(new Date(selectedTask.start_date), 'MMMM d, yyyy')}</div>
                  </div>

                  <div className="bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-gray-200/60 dark:border-white/10">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Time</div>
                    <div className="text-sm text-gray-900 dark:text-white">{selectedTask.daily_start_time ? `${selectedTask.daily_start_time.slice(0,5)} - ${selectedTask.daily_end_time?.slice(0,5) ?? ''}` : '—'}</div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white/90 dark:bg-white/10 backdrop-blur-md p-4 rounded-xl border border-gray-200/60 dark:border-white/10">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>

                {/* Progress & Tags */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white/90 dark:bg-white/10 backdrop-blur-md p-4 rounded-xl border border-gray-200/60 dark:border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Progress</h3>
                      <div className="text-sm text-gray-500">{selectedTask.completed ? '100%' : '0%'}</div>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: selectedTask.completed ? '100%' : '0%' }} />
                    </div>
                  </div>

                  {selectedTask.tags && selectedTask.tags.length > 0 && (
                    <div className="bg-white/90 dark:bg-white/10 backdrop-blur-md p-4 rounded-xl border border-gray-200/60 dark:border-white/10">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky action footer */}
                <div className="pt-4 sticky bottom-0 bg-gradient-to-t from-white/80 dark:from-gray-900/80 -mx-4 px-4 pb-4">
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => onToggleTaskCompletion(selectedTask.id)}>
                      {selectedTask.completed ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Mark as Incomplete
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4" />
                          Mark as Complete
                        </>
                      )}
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      {onEditTask && (
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => onEditTask(selectedTask)}>
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </Button>
                      )}

                      <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleAddToReminders} disabled={isAddingReminder}>
                        <AlertCircle className="h-4 w-4" />
                        Remind
                      </Button>
                    </div>

                    {onDeleteTask && (
                      <Button variant="destructive" className="w-full flex items-center justify-center gap-2" onClick={() => onDeleteTask(selectedTask.id)}>
                        <Trash2 className="h-4 w-4" />
                        Delete Task
                      </Button>
                    )}
                  </div>
                </div>

                {/* Footer: meta info */}
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200/60 dark:border-white/10">
                  <div>Created: {format(new Date(selectedTask.created_at), "MMM d, yyyy 'at' h:mm a")}</div>
                  {selectedTask.updated_at && selectedTask.updated_at !== selectedTask.created_at && (
                    <div>Updated: {format(new Date(selectedTask.updated_at), "MMM d, yyyy 'at' h:mm a")}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No task selected</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailsSidebar;