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
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-background/95 backdrop-blur-2xl z-50 shadow-2xl border-l border-border"
        >
          <div className="h-full flex flex-col max-h-screen overflow-hidden">
            {/* Header - goal title, task title and controls */}
            <div className="flex-shrink-0 p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                      {goalTitle}
                    </span>
                    {selectedTask && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        selectedTask.completed
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      )}>
                        {selectedTask.completed ? (
                          <><CheckCircle2 className="h-3 w-3" /> Done</>
                        ) : (
                          <><Circle className="h-3 w-3" /> Active</>
                        )}
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-foreground leading-tight tracking-tight break-words">
                    {selectedTask?.title || 'Task Details'}
                  </h2>
                </div>

                <button
                  onClick={onClose}
                  className="mt-1 p-2 rounded-xl bg-accent border border-border text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all duration-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {selectedTask ? (
              <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
                {/* Info Grid - Date & Time in a unified elegant panel */}
                <div className="bg-muted/40 border border-border rounded-2xl p-1 overflow-hidden">
                  <div className="grid grid-cols-2">
                    <div className="p-4 border-r border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Scheduled</span>
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : format(new Date(selectedTask.start_date), 'MMMM d, yyyy')}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Duration</span>
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        {selectedTask.daily_start_time ? (
                          <span className="flex items-center gap-1">
                            {selectedTask.daily_start_time.slice(0, 5)}
                            <span className="opacity-30">→</span>
                            {selectedTask.daily_end_time?.slice(0, 5) ?? '...'}
                          </span>
                        ) : 'All Day'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automation - Sync to Local Reminders */}
                <Button
                  variant="outline"
                  onClick={handleAddToReminders}
                  disabled={isAddingReminder}
                  className="w-full h-12 rounded-2xl bg-accent border-border text-foreground hover:bg-accent/80 transition-all duration-300 font-bold group"
                >
                  <div className="flex items-center justify-center w-full relative">
                    {isAddingReminder ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2 text-blue-400 group-hover:scale-125 transition-transform" />
                    )}
                    <span>{isAddingReminder ? "Syncing..." : "Sync to Local Reminders"}</span>
                    <div className="absolute right-0 opacity-20 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </Button>

                {/* Description - Prominent and clean */}
                <div className="relative group">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1 w-4 bg-primary/50 rounded-full" />
                      Detailed Overview
                    </h3>
                  </div>

                  <div className="bg-muted/40 border border-border rounded-2xl p-6 text-sm text-foreground leading-relaxed shadow-inner">
                    <MarkdownRenderer
                      content={normalizeMarkdown(selectedTask.description)}
                      isStreaming={false}
                      isLoading={false}
                    />
                  </div>
                </div>

                {/* Tags Section */}
                {selectedTask.tags && selectedTask.tags.length > 0 && (
                  <div className="space-y-3 px-1">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      Classification
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.tags.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 text-[11px] font-bold rounded-lg bg-primary/10 border border-primary/20 text-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Info */}
                <div className="pt-6 border-t border-white/5 flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">
                  <span className="opacity-50">Entry Created</span>
                  <div className="h-1 w-1 bg-white/20 rounded-full" />
                  <span className="text-gray-400">{format(new Date(selectedTask.created_at), "MMM d, yyyy h:mm a")}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Select a task to view full technical specifications</p>
              </div>
            )}

            {/* Premium Action Footer */}
            {selectedTask && (
              <div className="p-6 pt-2 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent">
                <div className="space-y-4">
                  <Button
                    className={cn(
                      "w-full h-14 text-sm font-black uppercase tracking-widest transition-all duration-300 rounded-2xl border",
                      selectedTask.completed
                        ? "bg-zinc-800 hover:bg-zinc-700 text-white/70 border-white/10"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)] border-white/20"
                    )}
                    onClick={() => onToggleTaskCompletion(selectedTask.id)}
                  >
                    {selectedTask.completed ? "Reactivate Task" : "Confirm Completion"}
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    {onEditTask && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-2xl bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 font-bold"
                        onClick={() => onEditTask(selectedTask)}
                      >
                        <Edit2 className="h-4 w-4 mr-2 opacity-60" />
                        Modify
                      </Button>
                    )}
                    {onDeleteTask && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-2xl bg-transparent border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 font-bold"
                        onClick={() => onDeleteTask(selectedTask.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2 opacity-60" />
                        Purge
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailsSidebar;