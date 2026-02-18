import { Task } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarIcon, CheckCircle2, Circle, Edit2, Trash2, Clock, AlertCircle, Tag, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { TaskTags } from "./TaskTags";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { openCalendarOptionsDialog } from "@/utils/calendarIntegration";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";

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

  function normalizeMarkdown(md: string) {
    return md
      .replace(/(\*\*.+?\*\*)\n(\*\*)/g, '$1\n\n$2')
      .replace(/(#+ .+)\n([^])/g, '$1\n\n$2');
  }


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-background z-50 shadow-2xl border-l border-border"
        >
          {selectedTask ? (
            <div className="h-full flex flex-col">
              {/* Notion-style Minimal Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="h-7 w-7 rounded-md hover:bg-muted transition-colors flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <span className="text-xs text-muted-foreground font-medium">{goalTitle}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {onEditTask && (
                    <button
                      onClick={() => onEditTask(selectedTask)}
                      className="h-7 px-3 rounded-md hover:bg-muted transition-colors text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  {onDeleteTask && (
                    <button
                      onClick={() => onDeleteTask(selectedTask.id)}
                      className="h-7 px-3 rounded-md hover:bg-destructive/10 transition-colors text-xs font-medium text-muted-foreground hover:text-destructive flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Notion-style Page Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-12 py-8">
                  {/* Icon + Title (Notion style) */}
                  <div className="mb-6">
                    <div className="flex items-start gap-2 mb-2">
                      <div className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-1.5",
                        selectedTask.completed 
                          ? "bg-green-500/10 text-green-600 dark:text-green-500" 
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                      )}>
                        {selectedTask.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <h1 className="text-3xl font-bold text-foreground leading-tight flex-1 break-words">
                        {selectedTask.title}
                      </h1>
                    </div>
                  </div>

                  {/* Properties (Notion style) */}
                  <div className="space-y-1 mb-8 pb-8 border-b border-border/50">
                    {/* Status Property */}
                    <div className="group flex items-center hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                      <div className="w-32 shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">Status</span>
                      </div>
                      <button
                        onClick={() => onToggleTaskCompletion(selectedTask.id)}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          selectedTask.completed
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                        )}
                      >
                        {selectedTask.completed ? (
                          <><CheckCircle2 className="h-3 w-3" /> Completed</>
                        ) : (
                          <><Circle className="h-3 w-3" /> In Progress</>
                        )}
                      </button>
                    </div>

                    {/* Date Property */}
                    <div className="group flex items-center hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                      <div className="w-32 shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">Date</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {selectedDate ? format(selectedDate, 'MMM d, yyyy') : format(new Date(selectedTask.start_date), 'MMM d, yyyy')}
                      </div>
                    </div>

                    {/* Time Property */}
                    {selectedTask.daily_start_time && (
                      <div className="group flex items-center hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                        <div className="w-32 shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">Time</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {selectedTask.daily_start_time.slice(0, 5)} - {selectedTask.daily_end_time?.slice(0, 5) ?? '...'}
                        </div>
                      </div>
                    )}

                    {/* Tags Property */}
                    {selectedTask.tags && selectedTask.tags.length > 0 && (
                      <div className="group flex items-start hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                        <div className="w-32 shrink-0 pt-0.5">
                          <span className="text-xs font-medium text-muted-foreground">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTask.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Created Property */}
                    <div className="group flex items-center hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                      <div className="w-32 shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">Created</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(selectedTask.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>

                  {/* Description (Notion-style content block) */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownRenderer
                      content={normalizeMarkdown(selectedTask.description)}
                      isStreaming={false}
                      isLoading={false}
                    />
                  </div>
                </div>
              </div>

              {/* Notion-style Bottom Actions */}
              <div className="border-t border-border/50 px-6 py-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddToReminders}
                  disabled={isAddingReminder}
                  className="h-8 text-xs"
                >
                  {isAddingReminder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                  )}
                  {isAddingReminder ? "Adding..." : "Add to Calendar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No task selected</h3>
              <p className="text-sm text-muted-foreground">Select a task to view its details</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailsSidebar;