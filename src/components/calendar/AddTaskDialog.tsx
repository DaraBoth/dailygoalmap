import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { MobileTimePicker } from "@/components/ui/mobile-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarClock,
  Clock,
  Calendar,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AutoResizingDescription } from "./AutoResizingDescription";
import { useIsMobile } from "@/hooks/use-mobile";

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (
    description: string,
    date: Date,
    time?: string,
    range?: {
      title?: string;
      start_date?: Date;
      end_date?: Date;
      daily_start_time?: string;
      daily_end_time?: string;
      is_anytime?: boolean;
      duration_minutes?: number | null;
      completed?: boolean;
    }
  ) => void;
  defaultDate?: Date;
}

const AddTaskDialog = ({
  isOpen,
  onClose,
  onAddTask,
  defaultDate = new Date(),
}: AddTaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date>(defaultDate);
  const [endDate, setEndDate] = useState<Date>(defaultDate);
  const [dailyStart, setDailyStart] = useState<string>("09:00");
  const [dailyEnd, setDailyEnd] = useState<string>("10:00");
  const [isAnytime, setIsAnytime] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  // Refs for scroll detection
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // helpers
  const toMins = (t: string) => { const [h = "0", m = "0"] = t.split(":"); return parseInt(h) * 60 + parseInt(m); };
  const fromMins = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const isSameDayTask = startDate.toDateString() === endDate.toDateString();

  const handleStartTimeChange = (value: string) => {
    const v = value || "09:00";
    setDailyStart(v);
    setTimeError(null);
    if (isSameDayTask) {
      const startMins = toMins(v);
      const endMins = toMins(dailyEnd);
      if (startMins >= endMins) setDailyEnd(fromMins(Math.min(startMins + 60, 23 * 60 + 59)));
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

  // Update selectedDate when defaultDate changes
  useEffect(() => {
    setSelectedDate(defaultDate);
    setStartDate(defaultDate);
    setEndDate(defaultDate);
  }, [defaultDate]);

  // Check if content is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (contentRef.current && scrollAreaRef.current) {
        const content = contentRef.current;
        const scrollArea = scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLElement | null;
        if (scrollArea) {
          const isContentScrollable = content.scrollHeight > scrollArea.clientHeight;
          setIsScrollable(isContentScrollable);
        }
      }
    };

    if (isOpen) {
      const timer = setTimeout(checkScrollable, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, title, taskDescription, startDate, endDate, dailyStart, dailyEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const description = taskDescription.trim();
      const finalStart = dailyStart || "09:00";
      const finalEnd = dailyEnd || "10:00";
      const durationMinutes = isAnytime ? null : Math.max(0, toMins(finalEnd) - toMins(finalStart));

      const range = {
        title: title || undefined,
        start_date: startDate,
        end_date: endDate,
        daily_start_time: isAnytime ? undefined : finalStart,
        daily_end_time: isAnytime ? undefined : finalEnd,
        is_anytime: isAnytime,
        duration_minutes: durationMinutes,
        completed,
      };

      await onAddTask(description, selectedDate, isAnytime ? undefined : finalStart, range);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setTaskDescription("");
    setCompleted(false);
    setIsAnytime(false);
    setTimeError(null);
    setStartDate(defaultDate);
    setEndDate(defaultDate);
    setDailyStart("09:00");
    setDailyEnd("10:00");
  };

  const isMobile = useIsMobile();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 overflow-hidden bg-background border-border shadow-2xl flex flex-col",
          isMobile ? "h-[90vh] rounded-t-3xl" : "w-full sm:w-[480px] lg:w-[600px]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Fixed header */}
          <SheetHeader className="flex-shrink-0 z-20 bg-muted/30 border-b border-border px-4 sm:px-5 py-4 sm:py-5">
            <SheetTitle className="flex items-center gap-3 text-base sm:text-lg lg:text-xl font-semibold text-foreground">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400" />
              </div>
              Add New Task
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div
              ref={scrollAreaRef}
              className="px-5 py-6"
            >
              <div ref={contentRef} className="space-y-6">
                <form id="add-task-form" onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="task-title" className="text-sm font-medium text-muted-foreground">
                      Title
                    </Label>
                    <Input
                      id="task-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      autoFocus={!isMobile}
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
                      placeholder="Add details..."
                      className="bg-background border-border min-h-[100px] text-base"
                    />
                  </div>

                  {/* Date and Time Pickers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
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

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">End Date</Label>
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
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                            Start Time
                          </Label>
                          <MobileTimePicker
                            value={dailyStart}
                            onChange={handleStartTimeChange}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
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

                  {/* Anytime & Completed */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center justify-between bg-muted/40 border border-border px-3 py-2.5 rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground">Anytime</Label>
                      <Switch checked={isAnytime} onCheckedChange={(v) => { setIsAnytime(v); setTimeError(null); }} />
                    </div>

                    <div className="flex items-center justify-between bg-muted/40 border border-border px-3 py-2.5 rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground">Completed</Label>
                      <Switch checked={completed} onCheckedChange={setCompleted} />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Fixed button area */}
          <div className="flex-shrink-0 z-20 p-5 bg-background/95 border-t border-border mt-auto">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { resetForm(); onClose(); }}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-task-form"
                disabled={!title.trim() || isSubmitting || !!timeError}
                className="flex-[2] h-11"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" />Create Task</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddTaskDialog;
