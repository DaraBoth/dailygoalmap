

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "./types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle, Circle, X, Edit, Trash2, Bell } from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enableRealtimeForTable } from "./taskDatabase";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { openCalendarOptionsDialog } from "@/utils/calendarIntegration";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface TaskDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  tasksForDate: Task[];
  selectedTaskIndex: number;
  handleNavigateTask: (direction: 'next' | 'prev' | 'current', index?: number) => void;
  goalTitle: string;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onDirectDeleteTask?: (taskId: string) => void; // Direct deletion without confirmation
  goalId: string; // Added for real-time updates
}

const TaskDetailsDialog = ({
  isOpen,
  onClose,
  selectedTask,
  selectedDate,
  onToggleTaskCompletion,
  tasksForDate,
  selectedTaskIndex: initialTaskIndex,
  handleNavigateTask,
  goalTitle,
  onEditTask,
  onDeleteTask,
  onDirectDeleteTask,
  goalId
}: TaskDetailsDialogProps) => {
  // Subscribe to real-time task updates
  useEffect(() => {
    if (!isOpen || !goalId || !selectedTask) return;

    const setupRealtimeSubscription = async () => {
      try {
        // Enable realtime for tasks table
        await enableRealtimeForTable('tasks');

        // Subscribe to changes for this specific task
        const channel = supabase
          .channel(`task-details-${selectedTask.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tasks',
              filter: `id=eq.${selectedTask.id}`
            },
            async (payload) => {
              if (payload.eventType === 'UPDATE' && selectedTask && handleNavigateTask) {
                const updatedTask = payload.new as Task;
                // Directly fetch the latest task data to ensure consistency
                const { data: freshTask } = await supabase
                  .from('tasks')
                  .select('*')
                  .eq('id', updatedTask.id)
                  .single();

                if (freshTask) {
                  // Force update with latest data
                  handleNavigateTask('current', initialTaskIndex);
                }
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };

    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [isOpen, goalId, selectedTask, handleNavigateTask, initialTaskIndex, onToggleTaskCompletion]);
  const currentIndex = selectedTask ? tasksForDate.findIndex(t => t.id === selectedTask.id) : initialTaskIndex;
  const safeIndex = currentIndex >= 0 ? currentIndex : initialTaskIndex;
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


  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Remove task ID from URL when closing
      const currentUrl = new URL(window.location.toString());
      currentUrl.searchParams.delete('taskId');
      window.history.replaceState({}, '', currentUrl.toString());
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-50 overflow-hidden"
        >
          <div className="h-full flex flex-col max-h-[100dvh] sm:max-h-screen">
            {/* Header with liquid glass effect */}
            <div className="flex-shrink-0 bg-white/90 dark:bg-white/15 backdrop-blur-md border-b border-gray-200/60 dark:border-white/25 p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/80 dark:bg-white/20 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/90 dark:hover:bg-white/30 transition-all duration-200 shadow-lg"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <h2 className="text-lg sm:text-2xl font-bold text-center flex-1 text-gray-900 dark:text-white">{goalTitle}</h2>
                <div className="w-8 sm:w-10"></div> {/* Spacer for alignment */}
              </div>
            </div>

            {/* Main content with proper mobile scrolling */}
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
              <div className="p-3 sm:p-6 space-y-3 sm:space-y-6 pb-safe-or-6">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between bg-white/80 dark:bg-white/15 backdrop-blur-sm rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-200/60 dark:border-white/25">
                  <div className="flex items-center">
                    <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-blue-500" />
                    {selectedDate ? format(selectedDate, "MMM d, yyyy") : ''}
                  </div>
                  <div className="text-xs font-medium">
                    {selectedTask && selectedTask.daily_start_time && selectedTask.daily_end_time && `${selectedTask.daily_start_time.slice(0, 5)} - ${selectedTask.daily_end_time.slice(0, 5)}`}
                  </div>
                </div>

                <div className="bg-white/85 dark:bg-white/15 backdrop-blur-sm p-4 rounded-2xl border border-gray-200/60 dark:border-white/25 flex items-center justify-between shadow-lg">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {tasksForDate.length > 0 ? (
                      <>Task {safeIndex + 1} of {tasksForDate.length}</>
                    ) : (
                      <>No tasks</>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigateTask('prev')}
                      className="h-9 w-9 p-0 rounded-full bg-white/80 dark:bg-white/20 backdrop-blur-sm border-gray-200/60 dark:border-white/25 hover:bg-white/90 dark:hover:bg-white/30 transition-all duration-200"
                      title="Previous task"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigateTask('next')}
                      className="h-9 w-9 p-0 rounded-full bg-white/80 dark:bg-white/20 backdrop-blur-sm border-gray-200/60 dark:border-white/25 hover:bg-white/90 dark:hover:bg-white/30 transition-all duration-200"
                      title="Next task"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedTask ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 dark:bg-white/15 backdrop-blur-md p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200/60 dark:border-white/25 shadow-xl"
                  >
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                        {selectedTask.title}
                      </h3>

                      {selectedTask.description && selectedTask.title && (
                        <div className="bg-white/80 dark:bg-white/15 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-gray-200/60 dark:border-white/25">
                          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed break-words whitespace-pre-wrap">
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

                      {/* Task metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {selectedTask.daily_start_time && selectedTask.daily_end_time && (
                          <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-blue-200/60 dark:border-blue-800/50">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500"></div>
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Time Range</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-200 mt-0.5 sm:mt-1">
                              {selectedTask.daily_start_time.slice(0, 5)} - {selectedTask.daily_end_time.slice(0, 5)}
                            </p>
                          </div>
                        )}

                        {selectedTask.start_date !== selectedTask.end_date && (
                          <div className="bg-purple-50/80 dark:bg-purple-950/30 backdrop-blur-sm rounded-xl p-3 border border-purple-200/60 dark:border-purple-800/50">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Multi-day Task</span>
                            </div>
                            <p className="text-sm font-semibold text-purple-800 dark:text-purple-200 mt-1">
                              {format(new Date(selectedTask.start_date), "MMM d")} - {format(new Date(selectedTask.end_date), "MMM d")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4 mt-2">
                      <Button
                        onClick={() => onToggleTaskCompletion(selectedTask.id)}
                        variant="outline"
                        className={`w-full justify-start gap-3 h-12 rounded-xl backdrop-blur-sm transition-all duration-200 ${selectedTask.completed
                          ? 'bg-green-100/80 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300/70 dark:border-green-700/60 hover:bg-green-200/80 dark:hover:bg-green-900/60'
                          : 'bg-blue-100/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300/70 dark:border-blue-700/60 hover:bg-blue-200/80 dark:hover:bg-blue-900/60'
                          }`}
                      >
                        {selectedTask.completed ? (
                          <>
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Completed</span>
                          </>
                        ) : (
                          <>
                            <Circle className="h-5 w-5" />
                            <span className="font-medium">Mark as Complete</span>
                          </>
                        )}
                      </Button>

                      {/* Download Reminder Button */}
                      <Button
                        onClick={handleAddToReminders}
                        disabled={isAddingReminder}
                        variant="outline"
                        className="w-full justify-start gap-3 h-12 rounded-xl bg-purple-50/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-700/50 hover:bg-purple-100/80 dark:hover:bg-purple-900/40 backdrop-blur-sm transition-all duration-200"
                      >
                        <Bell className="h-5 w-5" />
                        <span className="font-medium">
                          {isAddingReminder ? 'Adding...' : 'Add Reminder'}
                        </span>
                      </Button>

                      <div className="grid grid-cols-2 gap-3">
                        {onEditTask && (
                          <Button
                            onClick={() => onEditTask(selectedTask)}
                            variant="outline"
                            className="w-full justify-start gap-2 h-11 rounded-xl bg-white/80 dark:bg-white/20 backdrop-blur-sm border-gray-200/60 dark:border-white/25 hover:bg-white/90 dark:hover:bg-white/30 transition-all duration-200"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="font-medium">Edit</span>
                          </Button>
                        )}

                        {(onDeleteTask || onDirectDeleteTask) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start gap-2 h-11 rounded-xl bg-red-50/60 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50 hover:bg-red-100/60 dark:hover:bg-red-900/30 backdrop-blur-sm transition-all duration-200"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="font-medium">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the task "{selectedTask.title || selectedTask.description}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    // Use direct delete if available, otherwise use regular delete
                                    if (onDirectDeleteTask) {
                                      onDirectDeleteTask(selectedTask.id);
                                    } else if (onDeleteTask) {
                                      onDeleteTask(selectedTask.id);
                                    }
                                    onClose();
                                  }}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center bg-white/85 dark:bg-white/15 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-white/25">
                    <div className="w-16 h-16 mb-4 rounded-full bg-blue-100/60 dark:bg-blue-900/30 backdrop-blur-sm flex items-center justify-center">
                      <CalendarIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No tasks for this day</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      Navigate to another day or add a new task
                    </p>
                  </div>
                )}

                {tasksForDate.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground/80 mb-3">All Tasks for This Day</h4>
                    <div className="space-y-2">
                      {tasksForDate.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 cursor-pointer ${selectedTask?.id === task.id
                            ? 'bg-blue-50/80 dark:bg-blue-950/60 border-2 border-blue-400/70 dark:border-blue-500/70'
                            : 'bg-white/80 dark:bg-white/15 border border-gray-200/60 dark:border-white/25 hover:bg-white/90 dark:hover:bg-white/20 hover:border-blue-300/50 dark:hover:border-blue-600/50'
                            }`}
                          onClick={() => {
                            // Set this task as selected
                            handleNavigateTask('current', index);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`w-6 h-6 p-0 rounded-full ${task.completed ? 'text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300' : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400'
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTaskCompletion(task.id);
                                }}
                              >
                                {task.completed ? <CheckCircle className="h-5 w-5" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                              </Button>
                              <p className={`text-sm ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {task.title || task.description}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {task.daily_start_time && task.daily_end_time ? `${task.daily_start_time.slice(0, 5)} - ${task.daily_end_time.slice(0, 5)}` : ''}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed footer with liquid glass effect */}
            <div className="flex-shrink-0 bg-white/60 dark:bg-white/10 backdrop-blur-md border-t border-white/20 dark:border-white/10 p-4 sm:p-6">
              <Button
                onClick={onClose}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl border-0 font-medium transition-all duration-200"
              >
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailsDialog;
