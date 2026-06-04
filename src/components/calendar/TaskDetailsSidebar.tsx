import { Task } from "./types";
import {
  CalendarIcon,
  CheckCircle2,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
  Share2,
  User as UserIcon,
  History,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import CalendarOptionsDialog from "./CalendarOptionsDialog";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import ShareTasksModal, { ShareableTask } from "@/components/dashboard/ShareTasksModal";
import { TaskGoalActionsMenu } from "./TaskGoalActionsMenu";
import { getInitials, useUserProfiles } from "@/hooks/useUserProfiles";
import TaskMetaSheet, { TaskMetaFab } from "./TaskMetaSheet";

interface TaskDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTask: Task | null;
  selectedDate: Date | undefined;
  onToggleTaskCompletion: (taskId: string) => void;
  goalTitle: string;
  goalId?: string;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
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
  onEditTask,
  onDeleteTask,
}: TaskDetailsSidebarProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  const creatorId = selectedTask?.user_id || "";
  const updaterId = selectedTask?.updated_by || creatorId;
  const { profiles } = useUserProfiles(
    [creatorId, updaterId].filter((id): id is string => !!id)
  );
  const creator = creatorId ? profiles[creatorId] : undefined;
  const updater = updaterId ? profiles[updaterId] : undefined;
  const creatorName = creator?.display_name || "Unknown";
  const updaterName = updater?.display_name || creatorName;

  // Read-only field values for the metadata Sheet.
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
              {/* Scrollable body — title stays sticky at the top of the scroll
                  container so it remains visible while reading long descriptions. */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Sticky title + action bar — visible divider separates
                    the title block from the full-bleed description below. */}
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
                        {onEditTask && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditTask(selectedTask)}
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
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="px-4 sm:px-8 lg:px-12 pb-4">
                    <h1
                      className={cn(
                        "w-full text-base sm:text-lg lg:text-xl font-semibold leading-tight tracking-tight text-foreground break-words",
                        selectedTask.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {selectedTask.title || "Untitled"}
                    </h1>
                  </div>
                </div>

                {/* Description — full-bleed main content. */}
                <div className="w-full pt-4 pb-4">
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
                        {onEditTask && (
                          <button
                            type="button"
                            onClick={() => onEditTask(selectedTask)}
                            className="text-primary hover:underline"
                          >
                            Add one
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* People rows — created by / last edited. Stays inline
                    (not in the FAB sheet) since it's authorship context
                    rather than schedule data. */}
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
              </div>

              {/* Floating action button → opens the read-only metadata sheet */}
              <TaskMetaFab
                onClick={() => setMetaOpen(true)}
                startDate={startDate}
                endDate={endDate}
                dailyStart={dailyStart}
                dailyEnd={dailyEnd}
                isAnytime={isAnytime}
                completed={completed}
                tagCount={tags.length}
                className="bottom-24 sm:bottom-24"
              />

              {/* Bottom action bar */}
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
          readOnly
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
