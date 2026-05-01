import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { MobileTimePicker } from "@/components/ui/mobile-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoResizingDescription } from "./AutoResizingDescription";
import { CalendarClock, Clock, Calendar, Trash2, AlertCircle } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { Task } from "./types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";


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
    }
  ) => void;
  onDeleteTask: (taskId: string) => void;
  task: Task | null;
}

const EditTaskDialog = ({ isOpen, onClose, onUpdateTask, onDeleteTask, task }: EditTaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [taskTime, setTaskTime] = useState("09:00");
  const [isPriority, setIsPriority] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dailyStart, setDailyStart] = useState<string>("09:00");
  const [dailyEnd, setDailyEnd] = useState<string>("10:00");
  const [isAnytime, setIsAnytime] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (task) {
      const description = task.description.replace(/🔴\s*/, '');
      setTaskDescription(description);
      setSelectedDate(new Date(task.start_date));
      setTaskTime(task.daily_start_time ? task.daily_start_time.slice(0, 5) : format(new Date(), "HH:mm"));
      setIsPriority(task.description.includes('🔴'));
      setTitle(task.title || "");
      if (task.start_date) setStartDate(new Date(task.start_date));
      if (task.end_date) setEndDate(new Date(task.end_date));
      if (task.daily_start_time) setDailyStart(task.daily_start_time.slice(0, 5));
      if (task.daily_end_time) setDailyEnd(task.daily_end_time.slice(0, 5));
      setIsAnytime(!!task.is_anytime);
      setCompleted(!!task.completed);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task && title.trim()) {
      const raw = taskDescription.trim();
      const description = raw ? (isPriority ? `🔴 ${raw}` : raw) : '';
      // Use dailyStart as the main single-date time anchor if single-day
      const combinedDateTime = new Date(selectedDate);
      const [hours, minutes] = (dailyStart || taskTime).split(':');
      combinedDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Determine multi-day by comparing start and end
      const range = {
        title: title,
        start_date: startDate,
        end_date: endDate,
        daily_start_time: isAnytime ? null : dailyStart,
        daily_end_time: isAnytime ? null : dailyEnd,
        is_anytime: isAnytime,
        duration_minutes: isAnytime ? null : Math.max(0, differenceInCalendarDays(new Date(`2000-01-02T${dailyEnd}:00`), new Date(`2000-01-02T${dailyStart}:00`)) * 1440 + (parseInt(dailyEnd.slice(0,2))*60 + parseInt(dailyEnd.slice(3,5))) - (parseInt(dailyStart.slice(0,2))*60 + parseInt(dailyStart.slice(3,5)))) ,
        completed,
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
          "p-0 overflow-hidden bg-background border-border shadow-2xl flex flex-col",
          isMobile ? "h-[92vh] rounded-t-3xl" : "w-full sm:w-[480px] lg:w-[600px]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="flex-shrink-0 bg-muted/30 border-b border-border px-4 sm:px-5 py-4 sm:py-5">
            <SheetTitle className="flex items-center gap-3 text-base sm:text-lg font-semibold text-foreground">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400" />
              </div>
              Edit Task
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-4 sm:px-5 py-5 pb-10">
              <form id="edit-task-form" onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target !== e.currentTarget) e.preventDefault(); }} className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="task-title" className="text-sm font-medium text-muted-foreground">
                    Title
                  </Label>
                  <Input
                    id="task-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short title"
                    className="bg-background border-border h-11 text-base"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="task-description" className="text-sm font-medium text-muted-foreground">
                    Description
                  </Label>
                  <AutoResizingDescription
                    id="task-description"
                    value={taskDescription}
                    onChange={(v) => setTaskDescription(v)}
                    placeholder="Enter task description"
                    minRows={isMobile ? 3 : 5}
                    row={3}
                    className="bg-background border-border text-base"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                      Start Date
                    </Label>
                    <MobileDatePicker
                      date={startDate}
                      minDate={undefined}
                      maxDate={endDate}
                      setDate={(d) => { if (!d) return; setStartDate(d); if (d > endDate) setEndDate(d); setSelectedDate(d); }}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                      End Date
                    </Label>
                    <MobileDatePicker
                      date={endDate}
                      minDate={startDate}
                      maxDate={undefined}
                      setDate={(d) => { if (!d) return; setEndDate(d < startDate ? startDate : d); }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Times */}
                {!isAnytime && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                        Start Time
                      </Label>
                      <MobileTimePicker
                        value={dailyStart}
                        onChange={(value) => setDailyStart(value || taskTime)}
                        onBlur={(e) => !e.currentTarget.value && setDailyStart(taskTime)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                        End Time
                      </Label>
                      <MobileTimePicker
                        value={dailyEnd}
                        onChange={(value) => setDailyEnd(value || dailyStart)}
                        onBlur={(e) => !e.currentTarget.value && setDailyEnd(dailyStart)}
                      />
                    </div>
                  </div>
                )}

                {startDate.toDateString() !== endDate.toDateString() && (
                  <p className="text-xs text-muted-foreground">
                    Spans {Math.max(0, differenceInCalendarDays(endDate, startDate)) + 1} days
                  </p>
                )}

                {/* Priority, Anytime & Completed */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsPriority(!isPriority)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                      isPriority
                        ? "bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>{isPriority ? "High Priority" : "Normal Priority"}</span>
                  </button>

                  <div className="flex items-center gap-3 bg-muted/40 border border-border px-3 py-2 rounded-lg">
                    <Label className="text-sm font-medium text-muted-foreground">Anytime</Label>
                    <Switch checked={isAnytime} onCheckedChange={setIsAnytime} />
                  </div>

                  <div className="flex items-center gap-3 bg-muted/40 border border-border px-3 py-2 rounded-lg">
                    <Label className="text-sm font-medium text-muted-foreground">Completed</Label>
                    <Switch checked={completed} onCheckedChange={setCompleted} />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 sm:p-5 bg-background/95 border-t border-border space-y-2.5">
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
      </SheetContent>
    </Sheet>
  );
};

export default EditTaskDialog;