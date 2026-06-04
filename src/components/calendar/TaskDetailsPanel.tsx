import React, { useMemo, useState } from "react";
import { Task, TASK_COLORS } from "./types";
import { isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  ChevronLeft,
  CalendarCheck,
  Loader2,
  AlignLeft,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CalendarOptionsDialog from "./CalendarOptionsDialog";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";
import ShareTasksModal, { ShareableTask } from "@/components/dashboard/ShareTasksModal";
import { TaskGoalActionsMenu } from "./TaskGoalActionsMenu";
import TaskMetaSheet, { TaskMetaFab } from "./TaskMetaSheet";

interface TaskDetailsPanelProps {
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onColorChange?: (taskId: string, color: string | null) => void;
  goalTitle: string;
  goalId?: string;
  isImmersive?: boolean;
  onClose?: () => void;
}

const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  selectedTask,
  selectedDate,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  onColorChange,
  goalTitle,
  goalId,
  isImmersive,
  onClose,
}) => {
  const { toast } = useToast();
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  // Derive meta-sheet values from the selected task. Always called so React
  // hook order stays stable even when there's no task selected.
  const startDate = useMemo(
    () => (selectedTask?.start_date ? new Date(selectedTask.start_date) : new Date()),
    [selectedTask?.start_date]
  );
  const endDate = useMemo(
    () => (selectedTask?.end_date ? new Date(selectedTask.end_date) : startDate),
    [selectedTask?.end_date, startDate]
  );
  const dailyStart = (selectedTask?.daily_start_time || "09:00").slice(0, 5);
  const dailyEnd = (selectedTask?.daily_end_time || "10:00").slice(0, 5);
  const isAnytime = !!selectedTask?.is_anytime || !selectedTask?.daily_start_time;
  const completed = !!selectedTask?.completed;
  const color = selectedTask?.color ?? null;
  const tags = Array.isArray(selectedTask?.tags)
    ? (selectedTask!.tags as string[]).filter((t): t is string => typeof t === "string")
    : [];

  const handleAddToCalendar = async () => {
    if (!selectedTask) return;
    setIsAddingReminder(true);
    try {
      setCalendarOpen(true);
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

  const hasDescription = selectedTask.description && selectedTask.description !== selectedTask.title;

  return (
    <div className="w-full h-full flex flex-col bg-card/80 overflow-hidden relative">
      {/* Top action bar — stays above the sticky title */}
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

          {/* Color picker — sits next to the Calendar button in the top bar
              so the title row stays clean (only checkbox + title). */}
          <div className="relative">
            <button
              type="button"
              title="Change color"
              onClick={() => setColorPickerOpen(o => !o)}
              className="h-7 px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-border/60 shadow-sm"
                style={{
                  backgroundColor: selectedTask.color ?? 'transparent',
                  outline: selectedTask.color ? undefined : '2px dashed hsl(var(--muted-foreground)/0.4)',
                }}
              />
              <span className="hidden md:inline">
                {TASK_COLORS.find(c => c.hex === selectedTask.color)?.label ?? 'Color'}
              </span>
            </button>
            <AnimatePresence>
              {colorPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-9 z-30 flex flex-wrap gap-2 p-2.5 rounded-xl border border-border/60 bg-popover shadow-lg"
                >
                  {TASK_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => {
                        onColorChange?.(selectedTask.id, c.hex);
                        setColorPickerOpen(false);
                      }}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition-all hover:scale-110",
                        selectedTask.color === c.hex
                          ? "border-foreground scale-110 shadow-sm"
                          : "border-transparent hover:border-muted-foreground/50",
                      )}
                      style={{
                        backgroundColor: c.hex ?? 'transparent',
                        outline: c.hex ? undefined : '2px dashed hsl(var(--muted-foreground)/0.4)',
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
          {goalId ? (
            <TaskGoalActionsMenu task={selectedTask} sourceGoalId={goalId} label="More" />
          ) : null}
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

      {/* Scrollable body — title sticks at the top while description scrolls */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTask.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Sticky title row */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/60 px-6 lg:px-10 pt-6 pb-4">
              <h1
                className={cn(
                  "w-full text-base lg:text-lg font-semibold leading-snug text-foreground break-words",
                  selectedTask.completed && "line-through text-muted-foreground"
                )}
              >
                {selectedTask.title || "Untitled Task"}
              </h1>
            </div>

            {/* Description — full-bleed main content. Extra bottom padding
                leaves room for the floating action button + footer. */}
            <div className="w-full pt-4 pb-32">
              {hasDescription ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed bg-muted/20 px-6 lg:px-10 py-4">
                  <MarkdownRenderer
                    content={selectedTask.description}
                    isStreaming={false}
                    isLoading={false}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic px-6 lg:px-10">
                  No description.{" "}
                  <button
                    type="button"
                    onClick={() => onEditTask(selectedTask)}
                    className="text-primary hover:underline"
                  >
                    Add one
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating action button — opens the read-only metadata sheet */}
      <TaskMetaFab
        onClick={() => setMetaOpen(true)}
        startDate={startDate}
        endDate={endDate}
        dailyStart={dailyStart}
        dailyEnd={dailyEnd}
        isAnytime={isAnytime}
        completed={completed}
        tagCount={tags.length}
        className="bottom-20"
      />

      {/* Footer actions */}
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
        shareType="detail"
        shareDate={selectedTask?.start_date ? new Date(selectedTask.start_date) : undefined}
      />

      <CalendarOptionsDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        task={selectedTask}
      />

      <TaskMetaSheet
        open={metaOpen}
        onOpenChange={setMetaOpen}
        startDate={startDate}
        endDate={endDate}
        dailyStart={dailyStart}
        dailyEnd={dailyEnd}
        isAnytime={isAnytime}
        completed={completed}
        color={color}
        tags={tags}
        readOnly
      />
    </div>
  );
};

export default TaskDetailsPanel;
