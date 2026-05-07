import React, { useState } from "react";
import { Task } from "./types";
import { format, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  Pencil,
  Trash2,
  Tag,
  ChevronLeft,
  CalendarCheck,
  Loader2,
  AlignLeft,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { openCalendarOptionsDialog } from "@/utils/calendarIntegration";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { formatTaskDateRange, formatTaskTimeRange } from "./taskDateTime";
import ShareTasksModal, { ShareableTask } from "@/components/dashboard/ShareTasksModal";

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
  onClose,
}) => {
  const { toast } = useToast();
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleAddToCalendar = async () => {
    if (!selectedTask) return;
    setIsAddingReminder(true);
    try {
      openCalendarOptionsDialog(selectedTask);
      const taskDate = new Date(selectedTask.start_date);
      if (selectedTask.daily_start_time) {
        const [hours, minutes] = selectedTask.daily_start_time.split(":").map(Number);
        taskDate.setHours(hours, minutes, 0, 0);
      }
      const { addDesktopReminder } = await import("@/pwa/notificationService");
      await addDesktopReminder(selectedTask.title || selectedTask.description, taskDate);
    } catch {
      toast({ title: "Error", description: "Could not open calendar options.", variant: "destructive" });
    } finally {
      setIsAddingReminder(false);
    }
  };

  // ?? Empty state ????????????????????????????????????????????????????????????
  if (!selectedTask) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center bg-background/30">
        <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center">
          <AlignLeft className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/60">No task selected</p>
          <p className="text-xs text-muted-foreground mt-0.5">Click a task on the left to view its details</p>
        </div>
      </div>
    );
  }

  // ?? Helpers ????????????????????????????????????????????????????????????????
  const hasTime = !!(selectedTask.is_anytime || selectedTask.daily_start_time);

  const createdAt = selectedTask.created_at ? new Date(selectedTask.created_at) : null;
  const updatedAt = selectedTask.updated_at ? new Date(selectedTask.updated_at) : null;
  const wasUpdated = updatedAt && isValid(updatedAt) && createdAt && Math.abs(updatedAt.getTime() - createdAt.getTime()) > 5000;
  const hasDescription = selectedTask.description && selectedTask.description !== selectedTask.title;

  // ?? Main view ??????????????????????????????????????????????????????????????
  return (
    <div className="w-full h-full flex flex-col bg-card/80 overflow-hidden">

      {/* ?? Header bar ?? */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-card/95 backdrop-blur-sm">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground shrink-0"
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <span className="text-xs text-muted-foreground truncate flex-1">{goalTitle}</span>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={handleAddToCalendar}
            disabled={isAddingReminder}
          >
            {isAddingReminder
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CalendarCheck className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">Calendar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => onEditTask(selectedTask)}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Share</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
            onClick={() => onDeleteTask(selectedTask.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* ?? Scrollable body ?? */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTask.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="max-w-2xl mx-auto px-6 lg:px-10 py-8 space-y-7"
          >

            {/* ?? Title row ?? */}
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggleTaskCompletion(selectedTask.id)}
                className={cn(
                  "mt-1.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                  selectedTask.completed
                    ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
                    : "border-border/80 bg-background/90 hover:border-primary"
                )}
                title={selectedTask.completed ? "Mark incomplete" : "Mark complete"}
              >
                {selectedTask.completed && <CheckCircle2 className="h-3 w-3" />}
              </button>

              <h1
                className={cn(
                  "text-2xl lg:text-3xl font-bold leading-snug text-foreground flex-1 break-words",
                  selectedTask.completed && "line-through text-muted-foreground"
                )}
              >
                {selectedTask.title || "Untitled Task"}
              </h1>
            </div>

            {/* ?? Properties table ?? */}
            <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/30">

              <PropertyRow label="Status">
                <button
                  onClick={() => onToggleTaskCompletion(selectedTask.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
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
              </PropertyRow>

              <PropertyRow label="Date">
                <span className="flex items-center gap-1.5 text-sm text-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatTaskDateRange(selectedTask.start_date, selectedTask.end_date)}
                </span>
              </PropertyRow>

              {hasTime && (
                <PropertyRow label="Time">
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatTaskTimeRange(
                      selectedTask.daily_start_time,
                      selectedTask.daily_end_time,
                      selectedTask.is_anytime,
                    )}
                  </span>
                </PropertyRow>
              )}

              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <PropertyRow label="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTask.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </PropertyRow>
              )}

              {createdAt && isValid(createdAt) && (
                <PropertyRow label="Created">
                  <span className="text-sm text-muted-foreground">
                    {format(createdAt, "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </PropertyRow>
              )}
              {wasUpdated && (
                <PropertyRow label="Updated">
                  <span className="text-sm text-muted-foreground">
                    {format(updatedAt!, "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </PropertyRow>
              )}
            </div>

            {/* ?? Description ?? */}
            {hasDescription && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed rounded-xl border border-border/40 bg-muted/20 px-5 py-4">
                  <MarkdownRenderer
                    content={selectedTask.description}
                    isStreaming={false}
                    isLoading={false}
                  />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ?? Footer actions ?? */}
      <div className="flex-shrink-0 border-t border-border/50 px-6 py-3 flex items-center justify-between bg-background/40 backdrop-blur-sm">
        <button
          onClick={() => onToggleTaskCompletion(selectedTask.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            selectedTask.completed
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
          )}
        >
          {selectedTask.completed ? (
            <><Circle className="h-4 w-4" /> Mark Incomplete</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Mark Complete</>
          )}
        </button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 rounded-lg text-sm gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => onEditTask(selectedTask)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit task
        </Button>
      </div>

      <ShareTasksModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        tasks={[selectedTask] as unknown as ShareableTask[]}
        goalTitle={goalTitle}
      />
    </div>
  );
};

// ?? Property row helper ????????????????????????????????????????????????????
const PropertyRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center min-h-[42px] px-4 bg-background/60 hover:bg-muted/30 transition-colors">
    <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
    <div className="flex-1 py-2">{children}</div>
  </div>
);

export default TaskDetailsPanel;