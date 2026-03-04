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
  Bell,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { openCalendarOptionsDialog } from "@/utils/calendarIntegration";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";

interface TaskDetailsPanelProps {
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  goalTitle: string;
  isImmersive?: boolean;
  onClose?: () => void;
}

const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  selectedTask,
  selectedDate,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  goalTitle,
  isImmersive,
  onClose
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
      <div className="w-full h-full flex flex-col overflow-hidden rounded-l-xl sm:rounded-l-2xl lg:rounded-l-3xl">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-border/20 bg-muted/30">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Task Details</h2>
          <p className="text-xs sm:text-sm text-foreground mt-1">Select a task to view details</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-zinc-950/40 backdrop-blur-xl relative overflow-hidden group/empty">
          {/* Ambient Background Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_70%)] opacity-0 group-hover/empty:opacity-100 transition-opacity duration-1000"></div>

          <div className="relative mb-6 sm:mb-8 lg:mb-10">
            {/* Multi-layered icon composition */}
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-2xl sm:rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl group-hover/empty:border-blue-500/20 transition-all duration-700">
              <Calendar className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-gray-700 group-hover/empty:text-blue-400 group-hover/empty:scale-110 transition-all duration-500" />
              <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-lg sm:rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center shadow-lg group-hover/empty:translate-x-1 group-hover/empty:translate-y-1 transition-transform duration-500">
                <Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5 lg:h-5 lg:w-5 text-gray-600 group-hover/empty:text-blue-300 transition-colors" />
              </div>
            </div>
          </div>

          <div className="relative text-center space-y-2 sm:space-y-3">
            <h3 className="text-lg sm:text-xl font-black text-gray-300 tracking-tight uppercase">System Idle</h3>
            <p className="max-w-[200px] sm:max-w-[240px] text-[10px] sm:text-xs text-gray-500 font-medium leading-relaxed uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-b from-gray-400 to-gray-600">
              Awaiting task selection to initialize orbital data visualization.
            </p>
          </div>

          {/* Decorative scanline */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent group-hover/empty:animate-scanline"></div>
        </div>
      </div>
    );
  }

  const isMultiDay = selectedTask.start_date !== selectedTask.end_date;
  const hasTimeRange = selectedTask.daily_start_time && selectedTask.daily_end_time;

  return (
    <div className={cn(
      "w-full h-full flex flex-col overflow-hidden relative",
      isImmersive ? "items-center justify-center p-4 sm:p-6 lg:p-12" : ""
    )}>
      {/* Immersive Background Elements */}
      {isImmersive && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px] bg-primary/2 blur-[120px] rounded-full pointer-events-none" />

          {/* Top Navigation Bar (Compact) */}
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 lg:p-8 flex items-center justify-between z-50">
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 rounded-xl sm:rounded-2xl bg-background/20 backdrop-blur-md border border-border/10 hover:bg-background/40 transition-all group"
              >
                <X className="h-5 w-5 sm:h-5.5 sm:w-5.5 lg:h-6 lg:w-6 text-foreground/60 group-hover:text-foreground group-hover:rotate-90 transition-all duration-300" />
              </Button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary/60" />
                  <h2 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-muted-foreground/60">Mission Node</h2>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground/80 tracking-tight">
                  {selectedTask.title || "Untitled Mission"}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <Badge
                variant={selectedTask.completed ? "default" : "secondary"}
                className={cn(
                  "rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] border-none",
                  selectedTask.completed
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-primary/10 text-primary border border-primary/20"
                )}
              >
                {selectedTask.completed ? "Resolved" : "Active"}
              </Badge>
            </div>
          </div>
        </>
      )}

      {/* Minimalist Header (Non-Immersive) */}
      {!isImmersive && (
        <div className="p-3 sm:p-4 lg:p-6 border-b border-white/5 bg-zinc-950/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-500">Node Insight</h2>
              <p className="text-[10px] sm:text-[11px] font-bold text-blue-400 mt-1 uppercase tracking-widest leading-none">
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : ""}
              </p>
            </div>
            <Badge
              variant={selectedTask.completed ? "default" : "secondary"}
              className={cn(
                "rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest",
                selectedTask.completed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              )}
            >
              {selectedTask.completed ? "Resolved" : "Active"}
            </Badge>
          </div>
        </div>
      )}

      {/* Content Area (Centered Hero) */}
      <div className={cn(
        "flex-1 overflow-y-auto custom-scrollbar scroll-smooth flex flex-col items-center",
        isImmersive ? "pt-20 sm:pt-24 lg:pt-32 pb-8 sm:pb-10 lg:pb-12 px-4 sm:px-6 lg:px-12" : "p-3 sm:p-4 lg:p-6"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTask.id}
            initial={{ opacity: 0, y: 40, filter: "blur(20px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -40, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "w-full flex flex-col gap-16",
              isImmersive ? "max-w-4xl" : ""
            )}
          >
            {/* Primary Content Hero */}
            <div className="flex flex-col items-center text-center space-y-8 sm:space-y-10 lg:space-y-12">
              <div className="space-y-6 sm:space-y-8 max-w-2xl sm:max-w-3xl">
                <div className={cn(
                  "relative prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none transition-all duration-700",
                  isImmersive ? "text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium text-foreground/90 leading-relaxed" : ""
                )}>
                  {/* Decorative faint quotes or marks could go here */}
                  <MarkdownRenderer
                    content={selectedTask.description || selectedTask.title}
                    isStreaming={false}
                    isLoading={false}
                  />
                </div>

                {/* Secondary technical divider */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 py-3 sm:py-4">
                  <div className="h-px w-8 sm:w-10 lg:w-12 bg-gradient-to-r from-transparent to-border/30" />
                  <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-border/40" />
                  <div className="h-px w-8 sm:w-10 lg:w-12 bg-gradient-to-l from-transparent to-border/30" />
                </div>
              </div>

              {/* Refined Action Control (Boutique Style) */}
              <div className="flex flex-col items-center gap-6 sm:gap-8">
                <div className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-foreground/[0.03] border border-border/10">
                  <Button
                    onClick={() => onToggleTaskCompletion(selectedTask.id)}
                    className={cn(
                      "h-10 sm:h-11 lg:h-12 px-4 sm:px-5 lg:px-6 rounded-lg sm:rounded-xl transition-all duration-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]",
                      selectedTask.completed
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                    )}
                  >
                    {selectedTask.completed ? (
                      <span className="flex items-center gap-2 italic">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolved
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Circle className="h-3.5 w-3.5" />
                        Resolve Mission
                      </span>
                    )}
                  </Button>

                  <Button
                    onClick={() => onEditTask(selectedTask)}
                    variant="ghost"
                    className="h-10 sm:h-11 lg:h-12 px-4 sm:px-5 rounded-lg sm:rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] font-bold uppercase tracking-widest text-[8px] sm:text-[9px]"
                  >
                    <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 sm:mr-2" />
                    Adjust
                  </Button>

                  <div className="w-px h-5 sm:h-6 bg-border/20 mx-0.5 sm:mx-1" />

                  <Button
                    onClick={() => onDeleteTask(selectedTask.id)}
                    variant="ghost"
                    className="h-10 sm:h-11 lg:h-12 px-4 sm:px-5 rounded-lg sm:rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 font-bold uppercase tracking-widest text-[8px] sm:text-[9px]"
                  >
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 sm:mr-2" />
                    Terminate
                  </Button>
                </div>

                {/* Distributed Metadata Footer */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-10 text-muted-foreground/40 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[8px] sm:text-[9px]">
                  <div className="flex items-center gap-2 sm:gap-3 group/meta hover:text-foreground/40 transition-colors">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>
                      {isMultiDay
                        ? `${format(new Date(selectedTask.start_date), "MMM d")} — ${format(new Date(selectedTask.end_date), "MMM d")}`
                        : format(new Date(selectedTask.start_date), "MMM d, yyyy")
                      }
                    </span>
                  </div>

                  <div className="h-1 w-1 rounded-full bg-border/40" />

                  <div className="flex items-center gap-2 sm:gap-3 group/meta hover:text-foreground/40 transition-colors">
                    <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{goalTitle}</span>
                  </div>

                  {hasTimeRange && (
                    <>
                      <div className="h-1 w-1 rounded-full bg-border/40" />
                      <div className="flex items-center gap-2 sm:gap-3 group/meta hover:text-foreground/40 transition-colors">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>{selectedTask.daily_start_time?.slice(0, 5)} - {selectedTask.daily_end_time?.slice(0, 5)}</span>
                      </div>
                    </>
                  )}
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
