import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { Task } from "./types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import TaskMetaSheet, { TaskMetaFab } from "./TaskMetaSheet";

interface EditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (
    taskId: string,
    description: string,
    date: Date,
    time?: string,
    range?: {
      title?: string;
      start_date?: Date | null;
      end_date?: Date | null;
      daily_start_time?: string | null;
      daily_end_time?: string | null;
      is_anytime?: boolean;
      duration_minutes?: number | null;
      completed?: boolean;
      tags?: string[];
      color?: string | null;
    }
  ) => void;
  onDeleteTask: (taskId: string) => void;
  task: Task | null;
  existingTags?: string[];
}

const EditTaskDialog = ({
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  task,
  existingTags = [],
}: EditTaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [taskTime, setTaskTime] = useState("09:00");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dailyStart, setDailyStart] = useState<string>("09:00");
  const [dailyEnd, setDailyEnd] = useState<string>("10:00");
  const [isAnytime, setIsAnytime] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);
  const [color, setColor] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const isMobile = useIsMobile();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const toMins = (t: string) => {
    const [h = "0", m = "0"] = t.split(":");
    return parseInt(h) * 60 + parseInt(m);
  };

  useEffect(() => {
    if (task) {
      const description = task.description.replace(/🔴\s*/, "");
      setTaskDescription(description);
      setSelectedDate(new Date(task.start_date));
      setTitle(task.title || "");
      if (task.start_date) setStartDate(new Date(task.start_date));
      if (task.end_date) setEndDate(new Date(task.end_date));

      const hasTime = !!task.daily_start_time;
      const anytime = !hasTime || !!task.is_anytime;
      setIsAnytime(anytime);

      const startTime = hasTime ? task.daily_start_time!.slice(0, 5) : "09:00";
      const endTime = task.daily_end_time ? task.daily_end_time.slice(0, 5) : "10:00";
      setDailyStart(startTime);
      setDailyEnd(endTime);
      setTaskTime(startTime);
      setTimeError(null);
      setCompleted(!!task.completed);
      setTags(
        Array.isArray(task.tags)
          ? task.tags.filter((t): t is string => typeof t === "string")
          : []
      );
      setColor(task.color ?? null);
      setMetaOpen(false);
    }
  }, [task]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    // The time error is only visible inside the meta sheet — if the user
    // tried to submit with an invalid time and the sheet is closed, pop it
    // back open so the message is actually reachable.
    if (timeError) {
      setMetaOpen(true);
      return;
    }

    if (task && title.trim()) {
      const description = taskDescription.trim();
      const combinedDateTime = new Date(selectedDate);
      const [hours, minutes] = (dailyStart || taskTime).split(":");
      combinedDateTime.setHours(parseInt(hours), parseInt(minutes));

      const finalStart = dailyStart || "09:00";
      const finalEnd = dailyEnd || finalStart;
      const durationMinutes = isAnytime
        ? null
        : Math.max(
            0,
            toMins(finalEnd) +
              differenceInCalendarDays(endDate, startDate) * 1440 -
              toMins(finalStart)
          );

      const range = {
        title: title,
        start_date: startDate,
        end_date: endDate,
        daily_start_time: isAnytime ? null : finalStart,
        daily_end_time: isAnytime ? null : finalEnd,
        is_anytime: isAnytime,
        duration_minutes: durationMinutes,
        completed,
        tags,
        color,
      };

      onUpdateTask(task.id, description, combinedDateTime, taskTime, range);
      onClose();
    }
  };

  const handleDelete = () => {
    if (task) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  if (!task) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 overflow-hidden bg-slate-100/95 dark:bg-slate-950/95 border-border/60 shadow-2xl flex flex-col",
          isMobile
            ? "h-[92vh] rounded-t-3xl"
            : "w-full sm:w-[520px] lg:w-[720px] xl:w-[860px] sm:max-w-none"
        )}
      >
        <div className="flex flex-col h-full relative">
          <SheetHeader className="sr-only">
            <SheetTitle>Edit Task</SheetTitle>
          </SheetHeader>

          {/* Scrollable body — title stays sticky at top */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <form
              id="edit-task-form"
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                  e.preventDefault();
                }
              }}
            >
              {/* Sticky Notion-style title — divider beneath separates it
                  from the full-bleed description area below. */}
              <div
                className={cn(
                  "sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md",
                  "border-b border-border/60",
                  isMobile ? "px-4 pt-6 pb-3" : "px-10 lg:px-14 pt-10 pb-4"
                )}
              >
                <textarea
                  ref={titleRef}
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled"
                  rows={1}
                  className={cn(
                    "w-full resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 text-foreground font-semibold leading-tight tracking-tight",
                    isMobile ? "text-base" : "text-lg lg:text-xl"
                  )}
                />
              </div>

              {/* Description — full-bleed main content. Editor wrapper has
                  no border/bg and its inner prose padding is shrunk so the
                  text starts close to the sheet edges. */}
              <div className="w-full pb-40">
                <MarkdownEditor
                  value={taskDescription}
                  onChange={setTaskDescription}
                  placeholder="Add a description, paste images, write a checklist, drop in code…"
                  minHeight={isMobile ? "260px" : "440px"}
                  className="rounded-none border-0 bg-transparent focus-within:ring-0"
                  contentClassName="px-2 sm:px-3"
                />
              </div>
            </form>
          </div>

          {/* Floating action button for metadata */}
          <TaskMetaFab
            onClick={() => setMetaOpen(true)}
            startDate={startDate}
            endDate={endDate}
            dailyStart={dailyStart}
            dailyEnd={dailyEnd}
            isAnytime={isAnytime}
            completed={completed}
            tagCount={tags.length}
            hasError={!!timeError}
            className="bottom-36 sm:bottom-36"
          />

          {/* Footer */}
          <div className="flex-shrink-0 p-4 sm:p-5 bg-slate-100/90 dark:bg-slate-900/85 border-t border-border/60">
            <div className="mx-auto max-w-3xl space-y-2.5">
              <Button
                type="submit"
                form="edit-task-form"
                disabled={!title.trim()}
                className="w-full h-11"
              >
                Update Task
              </Button>
              <div className="flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-10"
                >
                  Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="flex-1 h-10">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the task.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>

        <TaskMetaSheet
          open={metaOpen}
          onOpenChange={setMetaOpen}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          dailyStart={dailyStart}
          dailyEnd={dailyEnd}
          setDailyStart={setDailyStart}
          setDailyEnd={setDailyEnd}
          isAnytime={isAnytime}
          setIsAnytime={setIsAnytime}
          completed={completed}
          setCompleted={setCompleted}
          color={color}
          setColor={setColor}
          tags={tags}
          setTags={setTags}
          existingTags={existingTags}
          timeError={timeError}
          setTimeError={setTimeError}
        />
      </SheetContent>
    </Sheet>
  );
};

export default EditTaskDialog;
