import { Task } from "./types";
import { AnimatePresence } from "framer-motion";
import { X, CalendarIcon, CheckCircle2, Circle, Edit2, Trash2, Clock, AlertCircle, Tag, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { TaskTags } from "./TaskTags";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { openCalendarOptionsDialog } from "@/utils/calendarIntegration";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatTaskDate, formatTaskTimeRange } from "./taskDateTime";

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
  const isMobile = useIsMobile();
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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 overflow-hidden",
          isMobile ? "h-[90vh] rounded-t-3xl" : "w-full sm:w-[480px] lg:w-[540px]"
        )}
      >
          {selectedTask ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <SheetHeader className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 pr-14 sm:pr-16">
                <div className="flex items-center justify-between gap-3">
                  <SheetTitle className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{goalTitle}</SheetTitle>
                  
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {onEditTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditTask(selectedTask)}
                        className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl text-xs sm:text-sm"
                      >
                        <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                    )}
                    {onDeleteTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteTask(selectedTask.id)}
                        className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl text-xs sm:text-sm text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 lg:px-12 py-4 sm:py-6 lg:py-8">
                  {/* Icon + Title (Notion style) */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-start gap-2 mb-2">
                      <div className={cn(
                        "h-5 w-5 sm:h-6 sm:w-6 rounded-md flex items-center justify-center shrink-0 mt-1 sm:mt-1.5",
                        selectedTask.completed 
                          ? "bg-green-500/10 text-green-600 dark:text-green-500" 
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                      )}>
                        {selectedTask.completed ? (
                          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        ) : (
                          <Circle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        )}
                      </div>
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight flex-1 break-words">
                        {selectedTask.title}
                      </h1>
                    </div>
                  </div>

                  {/* Properties (Notion style) */}
                  <div className="space-y-1 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border/50">
                    {/* Status Property */}
                    <div className="group flex items-center hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                      <div className="w-20 sm:w-24 lg:w-32 shrink-0">
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
                      <div className="w-20 sm:w-24 lg:w-32 shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">Date</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {selectedDate ? format(selectedDate, 'MMM d, yyyy') : formatTaskDate(selectedTask.start_date)}
                      </div>
                    </div>

                    {/* Time Property */}
                    {(selectedTask.is_anytime || selectedTask.daily_start_time) && (
                      <div className="group flex items-center hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                        <div className="w-20 sm:w-24 lg:w-32 shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">Time</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatTaskTimeRange(
                            selectedTask.daily_start_time,
                            selectedTask.daily_end_time,
                            selectedTask.is_anytime,
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags Property */}
                    {selectedTask.tags && selectedTask.tags.length > 0 && (
                      <div className="group flex items-start hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                        <div className="w-20 sm:w-24 lg:w-32 shrink-0 pt-0.5">
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
                      <div className="w-20 sm:w-24 lg:w-32 shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">Created</span>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(selectedTask.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    {/* Updated Property */}
                    {(() => {
                      const created = new Date(selectedTask.created_at);
                      const updated = selectedTask.updated_at ? new Date(selectedTask.updated_at) : null;
                      if (!updated || Math.abs(updated.getTime() - created.getTime()) <= 5000) return null;
                      return (
                        <div className="group flex items-center hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
                          <div className="w-20 sm:w-24 lg:w-32 shrink-0">
                            <span className="text-xs font-medium text-muted-foreground">Updated</span>
                          </div>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {format(updated, "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                      );
                    })()}
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

              {/* Bottom Actions */}
              <div className="border-t border-border/50 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddToReminders}
                  disabled={isAddingReminder}
                  className="h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4"
                >
                  {isAddingReminder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 sm:mr-2" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                  )}
                  {isAddingReminder ? "Adding..." : "Add to Calendar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full p-6 sm:p-8 lg:p-12 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3 sm:mb-4">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">No task selected</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Select a task to view its details</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
  );
};

export default TaskDetailsSidebar;