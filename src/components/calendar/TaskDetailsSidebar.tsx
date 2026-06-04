import { Task, TASK_COLORS } from "./types";
import {
  CalendarIcon,
  Check,
  Copy,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
  Share2,
  User as UserIcon,
  History,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import CalendarOptionsDialog from "./CalendarOptionsDialog";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import ShareTasksModal, { ShareableTask } from "@/components/dashboard/ShareTasksModal";
import { TaskGoalActionsMenu } from "./TaskGoalActionsMenu";
import { getInitials, useUserProfiles } from "@/hooks/useUserProfiles";
import TaskMetaSheet, { TaskMetaFab } from "./TaskMetaSheet";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import { useTaskEditor, TaskUpdateRange } from "./useTaskEditor";

interface TaskDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  goalTitle: string;
  goalId?: string;
  onUpdateTask?: (
    taskId: string,
    description: string,
    date: Date,
    time?: string,
    range?: TaskUpdateRange
  ) => void;
  onDeleteTask?: (taskId: string) => void;
  /** Called when the user changes color in read mode (fire-and-forget persist). */
  onColorChange?: (taskId: string, color: string | null) => void;
  /** When true, mount with the editor already in edit mode. */
  initialEditMode?: boolean;
}

function normalizeMarkdown(md: string) {
  return md
    .replace(/(\*\*.+?\*\*)\n(\*\*)/g, "$1\n\n$2")
    .replace(/(#+ .+)\n([^])/g, "$1\n\n$2");
}

const TaskDetailsSidebar = ({
  isOpen,
  onClose,
  selectedTask,
  selectedDate,
  onToggleTaskCompletion,
  goalTitle,
  goalId,
  onUpdateTask,
  onDeleteTask,
  onColorChange,
  initialEditMode,
}: TaskDetailsSidebarProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(!!initialEditMode);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useTaskEditor(selectedTask);
  const {
    title, description, startDate, endDate, dailyStart, dailyEnd,
    isAnytime, completed, color, tags, timeError,
    setTitle, setDescription, setStartDate, setEndDate, setDailyStart,
    setDailyEnd, setIsAnytime, setCompleted, setColor, setTags, setTimeError,
    buildRange, buildCombinedDateTime, resetFromTask,
  } = editor;

  const creatorId = selectedTask?.user_id || "";
  const updaterId = selectedTask?.updated_by || creatorId;
  const { profiles } = useUserProfiles(
    [creatorId, updaterId].filter((id): id is string => !!id)
  );
  const creator = creatorId ? profiles[creatorId] : undefined;
  const updater = updaterId ? profiles[updaterId] : undefined;
  const creatorName = creator?.display_name || "Unknown";
  const updaterName = updater?.display_name || creatorName;

  // Reset to view mode each time a different task is selected, unless the
  // caller asked to open this sidebar straight into edit mode.
  useEffect(() => {
    setIsEditing(!!initialEditMode);
  }, [selectedTask?.id, initialEditMode]);

  // Closing the sheet drops back to view mode so the next open isn't
  // accidentally still editable.
  useEffect(() => {
    if (!isOpen) setIsEditing(false);
  }, [isOpen]);

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

  const handleAddToReminders = async () => {
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

  const handleSave = () => {
    if (!selectedTask || !title.trim() || !onUpdateTask) return;
    if (timeError) {
      setMetaOpen(true);
      return;
    }
    onUpdateTask(
      selectedTask.id,
      description.trim(),
      buildCombinedDateTime(),
      isAnytime ? undefined : (dailyStart || "09:00"),
      buildRange()
    );
    setIsEditing(false);
  };

  const handleCancel = () => {
    resetFromTask();
    setIsEditing(false);
  };

  const updatedAt = selectedTask?.updated_at ? new Date(selectedTask.updated_at) : null;
  const createdAt = selectedTask?.created_at ? new Date(selectedTask.created_at) : null;
  const wasEdited =
    !!updatedAt && !!createdAt && Math.abs(updatedAt.getTime() - createdAt.getTime()) > 5000;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "p-0 overflow-hidden bg-slate-100/95 dark:bg-slate-950/95 border-border/60 shadow-2xl",
            isMobile
              ? "h-[92vh] rounded-t-3xl"
              : "w-full sm:w-[560px] lg:w-[720px] xl:w-[820px] sm:max-w-none"
          )}
        >
          {selectedTask ? (
            <div className="h-full flex flex-col relative">
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Sticky title + action bar */}
                <div className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-border/60">
                  <SheetHeader className="px-4 sm:px-8 lg:px-12 pt-4 sm:pt-5 pb-2 pr-12 sm:pr-16">
                    <div className="w-full flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        <SheetTitle className="text-xs font-medium text-muted-foreground truncate">
                          {goalTitle}
                        </SheetTitle>
                      </div>

                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        {/* Color picker — works in both view and edit mode.
                            In view mode it persists via onColorChange; in edit
                            mode it updates local state and is saved with the rest. */}
                        <div className="relative">
                          <button
                            type="button"
                            title="Change color"
                            onClick={() => setColorPickerOpen(o => !o)}
                            className="h-8 px-2 sm:px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-border/60 shadow-sm"
                              style={{
                                backgroundColor: (isEditing ? color : selectedTask.color) ?? 'transparent',
                                outline: (isEditing ? color : selectedTask.color)
                                  ? undefined
                                  : '2px dashed hsl(var(--muted-foreground)/0.4)',
                              }}
                            />
                            <span className="hidden sm:inline">Color</span>
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
                                      } else if (onColorChange) {
                                        onColorChange(selectedTask.id, c.hex);
                                      }
                                      setColorPickerOpen(false);
                                    }}
                                    className={cn(
                                      "h-5 w-5 rounded-full border-2 transition-all hover:scale-110",
                                      (isEditing ? color : selectedTask.color) === c.hex
                                        ? "border-foreground scale-110 shadow-sm"
                                        : "border-transparent hover:border-muted-foreground/50"
                                    )}
                                    style={{
                                      backgroundColor: c.hex ?? 'transparent',
                                      outline: c.hex
                                        ? undefined
                                        : '2px dashed hsl(var(--muted-foreground)/0.4)',
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
                              onClick={handleCancel}
                              className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Cancel</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={!title.trim()}
                              className="h-8 px-2 sm:px-2.5 rounded-md text-xs gap-1.5"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Save</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            {onUpdateTask && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyDescription}
                              className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                              title="Copy description"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Copy</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShareOpen(true)}
                              className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                              title="Share"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Share</span>
                            </Button>
                            {onDeleteTask && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteTask(selectedTask.id)}
                                className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="px-4 sm:px-8 lg:px-12 pb-4">
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
                          "text-base sm:text-lg lg:text-xl font-semibold leading-tight tracking-tight text-foreground"
                        )}
                      />
                    ) : (
                      <h1
                        className={cn(
                          "w-full text-base sm:text-lg lg:text-xl font-semibold leading-tight tracking-tight text-foreground break-words",
                          selectedTask.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {selectedTask.title || "Untitled"}
                      </h1>
                    )}
                  </div>
                </div>

                {/* Description — full-bleed main content. */}
                <div className="w-full pt-4 pb-4">
                  {isEditing ? (
                    <MarkdownEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Add a description, paste images, write a checklist, drop in code…"
                      minHeight={isMobile ? "260px" : "440px"}
                      className="rounded-none border-0 bg-transparent focus-within:ring-0"
                      contentClassName="px-2 sm:px-3"
                    />
                  ) : (
                    <div className="bg-muted/15 px-4 py-3 sm:px-6 sm:py-4 lg:px-12 min-h-[200px] sm:min-h-[280px]">
                      {selectedTask.description?.trim() ? (
                        <MarkdownRenderer
                          content={normalizeMarkdown(selectedTask.description)}
                          isStreaming={false}
                          isLoading={false}
                          noCopy
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No description.{" "}
                          {onUpdateTask && (
                            <button
                              type="button"
                              onClick={() => setIsEditing(true)}
                              className="text-primary hover:underline"
                            >
                              Add one
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* People rows — only shown in read mode */}
                {!isEditing && (
                  <div className="w-full px-4 sm:px-8 lg:px-12 pb-40">
                    <div className="rounded-xl border border-border/40 bg-background/30 backdrop-blur-sm divide-y divide-border/30 overflow-hidden">
                      {creatorId && (
                        <PropertyRow
                          icon={<UserIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                          label="Created by"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6 ring-1 ring-border/60 shrink-0">
                              <AvatarImage src={creator?.avatar_url || undefined} alt={creatorName} />
                              <AvatarFallback className="text-[10px] font-semibold">
                                {getInitials(creatorName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs sm:text-sm text-foreground truncate">
                              {creatorName}
                            </span>
                            {createdAt && (
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                · {format(createdAt, "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </PropertyRow>
                      )}

                      {wasEdited && updatedAt && (
                        <PropertyRow
                          icon={<History className="h-3.5 w-3.5 text-muted-foreground" />}
                          label="Last edited"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-5 w-5 ring-1 ring-border/60 shrink-0">
                              <AvatarImage src={updater?.avatar_url || undefined} alt={updaterName} />
                              <AvatarFallback className="text-[9px] font-semibold">
                                {getInitials(updaterName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs sm:text-sm text-foreground truncate">
                              {updaterName}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              · {formatDistanceToNow(updatedAt, { addSuffix: true })}
                            </span>
                          </div>
                        </PropertyRow>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Floating action button → opens metadata sheet */}
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
                className="bottom-24 sm:bottom-24"
              />

              {/* Bottom action bar — hidden while editing to keep focus on save/cancel */}
              {!isEditing && (
                <div className="flex-shrink-0 border-t border-border/50 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 pt-3 pb-safe-or-4 sm:pb-3 flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={handleAddToReminders}
                    disabled={isAddingReminder}
                    className="min-h-11 text-sm px-4 gap-2"
                  >
                    {isAddingReminder ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {isAddingReminder ? "Adding..." : "Add to Calendar"}
                  </Button>
                  {goalId && selectedTask ? (
                    <TaskGoalActionsMenu
                      task={selectedTask}
                      sourceGoalId={goalId}
                      label="More"
                      triggerClassName="min-h-11 px-4 rounded-md text-sm border border-border bg-background hover:bg-accent text-foreground gap-2"
                    />
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full p-6 sm:p-8 lg:p-12 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3 sm:mb-4">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">
                No task selected
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Select a task to view its details
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {selectedTask && (
        <ShareTasksModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          tasks={[selectedTask] as unknown as ShareableTask[]}
          goalTitle={goalTitle}
          shareType="detail"
          shareDate={selectedTask?.start_date ? new Date(selectedTask.start_date) : undefined}
        />
      )}

      <CalendarOptionsDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        task={selectedTask}
      />

      {selectedTask && (
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
      )}
    </>
  );
};

const PropertyRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  align?: "center" | "start";
  children: React.ReactNode;
}> = ({ icon, label, align = "center", children }) => (
  <div
    className={cn(
      "px-3 sm:px-4 py-2.5 flex gap-3 hover:bg-muted/30 transition-colors",
      align === "center" ? "items-center" : "items-start"
    )}
  >
    <div className="flex items-center gap-2 w-24 sm:w-28 shrink-0 text-muted-foreground">
      {icon}
      <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
);

export default TaskDetailsSidebar;
