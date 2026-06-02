import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { MobileTimePicker } from "@/components/ui/mobile-time-picker";
import { Label } from "@/components/ui/label";
import { Clock, Trash2, AlertTriangle } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { Task } from "./types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import TaskTagInput from "./TaskTagInput";
import MarkdownEditor from "@/components/editor/MarkdownEditor";


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
    }
  ) => void;
  onDeleteTask: (taskId: string) => void;
  task: Task | null;
  existingTags?: string[];
}

const EditTaskDialog = ({ isOpen, onClose, onUpdateTask, onDeleteTask, task, existingTags = [] }: EditTaskDialogProps) => {
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
  const [timeError, setTimeError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // helpers
  const toMins = (t: string) => { const [h = "0", m = "0"] = t.split(":"); return parseInt(h) * 60 + parseInt(m); };
  const fromMins = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const isSameDayTask = startDate.toDateString() === endDate.toDateString();

  const handleStartTimeChange = (value: string) => {
    const v = value || "09:00";
    setDailyStart(v);
    setTimeError(null);
    if (isSameDayTask) {
      if (toMins(v) >= toMins(dailyEnd)) setDailyEnd(fromMins(Math.min(toMins(v) + 60, 23 * 60 + 59)));
    }
  };

  const handleEndTimeChange = (value: string) => {
    const v = value || dailyEnd;
    if (isSameDayTask && toMins(v) < toMins(dailyStart)) {
      setTimeError("End time cannot be before start time on the same day.");
      return;
    }
    setTimeError(null);
    setDailyEnd(v);
  };

  useEffect(() => {
    if (task) {
      const description = task.description.replace(/🔴\s*/, '');
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
      setTags(Array.isArray(task.tags) ? task.tags.filter((t): t is string => typeof t === "string") : []);
    }
  }, [task]);

  // Auto-resize title textarea for Notion-style appearance.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task && title.trim()) {
      const description = taskDescription.trim();
      const combinedDateTime = new Date(selectedDate);
      const [hours, minutes] = (dailyStart || taskTime).split(':');
      combinedDateTime.setHours(parseInt(hours), parseInt(minutes));

      const finalStart = dailyStart || "09:00";
      const finalEnd = dailyEnd || finalStart;
      const durationMinutes = isAnytime
        ? null
        : Math.max(0, toMins(finalEnd) + differenceInCalendarDays(endDate, startDate) * 1440 - toMins(finalStart));

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
        <div className="flex flex-col h-full">
          <SheetHeader className="sr-only">
            <SheetTitle>Edit Task</SheetTitle>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className={cn(
              "mx-auto w-full",
              isMobile ? "px-4 pt-6 pb-8" : "px-10 lg:px-14 pt-10 pb-10 max-w-3xl"
            )}>
              <form
                id="edit-task-form"
                onSubmit={handleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                    e.preventDefault();
                  }
                }}
                className="space-y-6"
              >
                {/* Notion-style title */}
                <textarea
                  ref={titleRef}
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled"
                  rows={1}
                  className={cn(
                    "w-full resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 text-foreground font-bold leading-tight tracking-tight",
                    isMobile ? "text-2xl" : "text-3xl lg:text-4xl"
                  )}
                />

                {/* Meta */}
                <div className="space-y-2 border-t border-border/40 pt-4" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Start Date</Label>
                      <MobileDatePicker
                        date={startDate}
                        minDate={undefined}
                        maxDate={endDate}
                        setDate={(d) => {
                          if (!d) return;
                          setStartDate(d);
                          if (d > endDate) setEndDate(d);
                          else if (d.toDateString() !== endDate.toDateString() && toMins(dailyEnd) < toMins(dailyStart)) setDailyEnd("23:59");
                          setSelectedDate(d);
                          setTimeError(null);
                        }}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">End Date</Label>
                      <MobileDatePicker
                        date={endDate}
                        minDate={startDate}
                        maxDate={undefined}
                        setDate={(d) => {
                          if (!d) return;
                          const next = d < startDate ? startDate : d;
                          setEndDate(next);
                          if (next.toDateString() !== startDate.toDateString() && toMins(dailyEnd) < toMins(dailyStart)) setDailyEnd("23:59");
                          setTimeError(null);
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {!isAnytime && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            Start Time
                          </Label>
                          <MobileTimePicker
                            value={dailyStart}
                            onChange={handleStartTimeChange}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            End Time
                          </Label>
                          <MobileTimePicker
                            value={dailyEnd}
                            onChange={handleEndTimeChange}
                          />
                        </div>
                      </div>
                      {timeError && (
                        <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          {timeError}
                        </p>
                      )}
                    </div>
                  )}

                  {startDate.toDateString() !== endDate.toDateString() && (
                    <p className="text-xs text-muted-foreground">
                      Spans {Math.max(0, differenceInCalendarDays(endDate, startDate)) + 1} days
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center justify-between bg-muted/40 border border-border px-3 py-2.5 rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground">Anytime</Label>
                      <Switch checked={isAnytime} onCheckedChange={(v) => { setIsAnytime(v); setTimeError(null); }} />
                    </div>

                    <div className="flex items-center justify-between bg-muted/40 border border-border px-3 py-2.5 rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground">Completed</Label>
                      <Switch checked={completed} onCheckedChange={setCompleted} />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tags</Label>
                    <TaskTagInput
                      value={tags}
                      onChange={setTags}
                      suggestions={existingTags}
                    />
                  </div>
                </div>

                {/* Description editor */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </Label>
                  <MarkdownEditor
                    value={taskDescription}
                    onChange={setTaskDescription}
                    placeholder="Write something, paste images, or add a code block…"
                    minHeight={isMobile ? "200px" : "360px"}
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 sm:p-5 bg-slate-100/90 dark:bg-slate-900/85 border-t border-border/60">
            <div className="mx-auto max-w-3xl space-y-2.5">
              <Button
                type="submit"
                form="edit-task-form"
                disabled={!title.trim() || !!timeError}
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
      </SheetContent>
    </Sheet>
  );
};

export default EditTaskDialog;
