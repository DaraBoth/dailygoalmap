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
            <div className="flex-shrink-0 liquid-glass border-b border-white/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground">{goalTitle}</div>
                  <h2 className="text-lg font-semibold text-foreground truncate mt-1">{selectedTask?.title || 'Task Details'}</h2>
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
                    className="p-1.5 rounded-lg liquid-glass text-foreground hover:opacity-80 transition-all duration-200"
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
                  <div className={`px-3 py-1 rounded-full text-sm font-medium liquid-glass ${
                    selectedTask.completed ? 'text-success' : 'text-primary'
                  }`}>
                    {selectedTask.completed ? 'Completed' : 'In Progress'}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="liquid-glass-card p-3">
                    <div className="text-xs text-muted-foreground font-medium">Date</div>
                    <div className="text-sm text-foreground">{selectedDate ? format(selectedDate, 'MMMM d, yyyy') : format(new Date(selectedTask.start_date), 'MMMM d, yyyy')}</div>
                  </div>

                  <div className="liquid-glass-card p-3">
                    <div className="text-xs text-muted-foreground font-medium">Time</div>
                    <div className="text-sm text-foreground">{selectedTask.daily_start_time ? `${selectedTask.daily_start_time.slice(0,5)} - ${selectedTask.daily_end_time?.slice(0,5) ?? ''}` : '—'}</div>
                  </div>
                </div>

                {/* Description */}
                <div className="liquid-glass-card p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTask.description}</p>
                </div>

                {/* Progress & Tags */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="liquid-glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
                      <div className="text-sm text-muted-foreground">{selectedTask.completed ? '100%' : '0%'}</div>
                    </div>
                    <div className="h-2 w-full liquid-glass rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: selectedTask.completed ? '100%' : '0%' }} />
                    </div>
                  </div>

                  {selectedTask.tags && selectedTask.tags.length > 0 && (
                    <div className="liquid-glass-card p-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs rounded-md liquid-glass text-foreground">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky action footer */}
                <div className="pt-4 sticky bottom-0 liquid-glass -mx-4 px-4 pb-4">
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
                <div className="text-xs text-muted-foreground pt-2 border-t border-white/20">
                  <div>Created: {format(new Date(selectedTask.created_at), "MMM d, yyyy 'at' h:mm a")}</div>
                  {selectedTask.updated_at && selectedTask.updated_at !== selectedTask.created_at && (
                    <div>Updated: {format(new Date(selectedTask.updated_at), "MMM d, yyyy 'at' h:mm a")}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
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