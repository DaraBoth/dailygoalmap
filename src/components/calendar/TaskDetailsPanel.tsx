import React, { useEffect, useRef, useState } from "react";
import { Task, TASK_COLORS } from "./types";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  Pencil,
  Trash2,
  ChevronLeft,
  CalendarCheck,
  Loader2,
  AlignLeft,
  Share2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CalendarOptionsDialog from "./CalendarOptionsDialog";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";
import ShareTasksModal, { ShareableTask } from "@/components/dashboard/ShareTasksModal";
import { TaskGoalActionsMenu } from "./TaskGoalActionsMenu";
import TaskMetaSheet, { TaskMetaFab } from "./TaskMetaSheet";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import { useTaskEditor, TaskUpdateRange } from "./useTaskEditor";

interface TaskDetailsPanelProps {
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  onUpdateTask: (
    taskId: string,
    description: string,
    date: Date,
    time?: string,
    range?: TaskUpdateRange
  ) => void;
  onDeleteTask: (taskId: string) => void;
  onColorChange?: (taskId: string, color: string | null) => void;
  goalTitle: string;
  goalId?: string;
  isImmersive?: boolean;
  onClose?: () => void;
  /** When true, mount with the editor already in edit mode. */
  initialEditMode?: boolean;
}

const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  selectedTask,
  selectedDate,
  onToggleTaskCompletion,
  onUpdateTask,
  onDeleteTask,
  onColorChange,
  goalTitle,
  goalId,
  isImmersive,
  onClose,
  initialEditMode,
}) => {
  const { toast } = useToast();
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(!!initialEditMode);
  const [pendingDelete, setPendingDelete] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useTaskEditor(selectedTask);
  const {
    title, description, startDate, endDate, dailyStart, dailyEnd,
    isAnytime, completed, color, tags, timeError,
    setTitle, setDescription, setStartDate, setEndDate, setDailyStart,
    setDailyEnd, setIsAnytime, setCompleted, setColor, setTags, setTimeError,
    buildRange, buildCombinedDateTime, resetFromTask,
  } = editor;

  // When the selected task changes, drop back to read mode unless the
  // caller explicitly asked to land in edit mode for this new selection.
  useEffect(() => {
    setIsEditing(!!initialEditMode);
    setPendingDelete(false);
  }, [selectedTask?.id, initialEditMode]);

  // Auto-resize the title textarea while editing so it behaves like the
  // Notion title field used in the old Edit dialog.
  useEffect(() => {
    if (!isEditing) return;
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, isEditing]);

  const handleCopyDescription = async () => {
    if (!selectedTask?.description?.trim()) {
      toast({ title: "Nothing to copy", description: "This task has no description.", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedTask.description);
      toast({ title: "Copied", description: "Description copied to clipboard." });
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text manually and copy it.", variant: "destructive" });
    }
  };

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

  const handleSave = () => {
    if (!selectedTask || !title.trim()) return;
    if (timeError) {
      setMetaOpen(true);
      return;
    }
    const desc = description.trim();
    const date = buildCombinedDateTime();
    const time = isAnytime ? undefined : (dailyStart || "09:00");
    const range = buildRange();
    onUpdateTask(selectedTask.id, desc, date, time, range);
    setIsEditing(false);
  };

  const handleCancel = () => {
    resetFromTask();
    setPendingDelete(false);
    setIsEditing(false);
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
    // data-task-detail-panel="open" lets the GoalChatWidget's modal detector
    // hide the floating AI Coach FAB while the panel is showing a task.
    <div
      data-task-detail-panel="open"
      className="w-full h-full flex flex-col bg-card/80 overflow-hidden relative"
    >
      {/* Top action bar */}
      <div className="flex-shrink-0 relative z-20 flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-card/95 backdrop-blur-sm">
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
          {!isEditing && (
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
          )}

          {/* Color picker — also available while editing */}
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
                  backgroundColor: (isEditing ? color : selectedTask.color) ?? 'transparent',
                  outline: (isEditing ? color : selectedTask.color) ? undefined : '2px dashed hsl(var(--muted-foreground)/0.4)',
                }}
              />
              <span className="hidden md:inline">
                {TASK_COLORS.find(c => c.hex === (isEditing ? color : selectedTask.color))?.label ?? 'Color'}
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
                        if (isEditing) {
                          setColor(c.hex);
                        } else {
                          onColorChange?.(selectedTask.id, c.hex);
                        }
                        setColorPickerOpen(false);
                      }}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition-all hover:scale-110",
                        (isEditing ? color : selectedTask.color) === c.hex
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

          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={handleCancel}
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Cancel</span>
              </Button>
              <Button
                size="sm"
                className="h-7 px-2.5 rounded-md text-xs gap-1.5"
                onClick={handleSave}
                disabled={!title.trim()}
              >
                <Check className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Save</span>
              </Button>
            </>
          ) : pendingDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-destructive font-medium hidden md:inline">Delete?</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2.5 rounded-md text-xs gap-1"
                onClick={() => { setPendingDelete(false); onDeleteTask(selectedTask.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Confirm</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 rounded-md text-xs text-muted-foreground"
                onClick={() => setPendingDelete(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={handleCopyDescription}
                title="Copy description"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Copy</span>
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
                onClick={() => setPendingDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Scrollable body — title sticks at the top while description scrolls */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedTask.id}-${isEditing ? "edit" : "read"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Sticky title row */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/60 px-6 lg:px-10 pt-6 pb-4">
              {isEditing ? (
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled"
                  rows={1}
                  autoFocus
                  className={cn(
                    "w-full resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground/40",
                    "text-base lg:text-lg font-semibold leading-snug tracking-tight text-foreground"
                  )}
                />
              ) : (
                <h1
                  className={cn(
                    "w-full text-base lg:text-lg font-semibold leading-snug text-foreground break-words",
                    selectedTask.completed && "line-through text-muted-foreground"
                  )}
                >
                  {selectedTask.title || "Untitled Task"}
                </h1>
              )}
            </div>

            {/* Description — full-bleed main content. */}
            <div className="w-full pt-4 pb-32">
              {isEditing ? (
                <MarkdownEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Add a description, paste images, write a checklist, drop in code…"
                  minHeight="440px"
                  className="rounded-none border-0 bg-transparent focus-within:ring-0"
                  contentClassName="px-2 sm:px-3"
                />
              ) : hasDescription ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed bg-muted/20 px-6 lg:px-10 py-4">
                  <MarkdownRenderer
                    content={selectedTask.description}
                    isStreaming={false}
                    isLoading={false}
                    noCopy
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic px-6 lg:px-10">
                  No description.{" "}
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
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

      {/* Floating action button — opens metadata sheet (editable while editing) */}
      <TaskMetaFab
        onClick={() => setMetaOpen(true)}
        startDate={startDate}
        endDate={endDate}
        dailyStart={dailyStart}
        dailyEnd={dailyEnd}
        isAnytime={isAnytime}
        completed={completed}
        tagCount={tags.length}
        color={color}
        hasError={!!timeError}
        className="bottom-5"
      />

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
        timeError={timeError}
        readOnly={!isEditing}
        setStartDate={isEditing ? setStartDate : undefined}
        setEndDate={isEditing ? setEndDate : undefined}
        setDailyStart={isEditing ? setDailyStart : undefined}
        setDailyEnd={isEditing ? setDailyEnd : undefined}
        setIsAnytime={isEditing ? setIsAnytime : undefined}
        setCompleted={isEditing ? setCompleted : undefined}
        setColor={isEditing ? setColor : undefined}
        setTags={isEditing ? setTags : undefined}
        setTimeError={isEditing ? setTimeError : undefined}
      />
    </div>
  );
};

export default TaskDetailsPanel;
