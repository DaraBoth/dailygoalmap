import React, { useState, useEffect, useRef } from "react";
import moment from "moment";
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
  X,
  Check,
  AlertCircle,
  Loader2,
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

  const [isPriority, setIsPriority] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date>(defaultDate);
  const [endDate, setEndDate] = useState<Date>(defaultDate);

  // daily start/end: default to now / +1 hour (HH:mm)
  const now = moment();
  const defaultDailyStart = now.format("HH:mm");
  const defaultDailyEnd = now.add(1, "hour").format("HH:mm");

  const [dailyStart, setDailyStart] = useState<string>(defaultDailyStart);
  const [dailyEnd, setDailyEnd] = useState<string>(defaultDailyEnd);

  const [completed, setCompleted] = useState<boolean>(false);
  const [isScrollable, setIsScrollable] = useState(false);

  // Refs for scroll detection
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  const clampTimes = (s: string, e: string) => {
    // Ensure format HH:mm
    const start = moment(s, "HH:mm");
    const end = moment(e, "HH:mm");
    if (end.isBefore(start)) {
      // If end is before start, set end = start (the rule)
      return { s: start.format("HH:mm"), e: start.format("HH:mm") };
    }
    return { s: start.format("HH:mm"), e: end.format("HH:mm") };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const rawDesc = taskDescription.trim();
      const description = rawDesc ? (isPriority ? `🔴 ${rawDesc}` : rawDesc) : "";

      const { s: finalStart, e: finalEnd } = clampTimes(dailyStart, dailyEnd);

      const range = {
        title: title || undefined,
        start_date: startDate,
        end_date: endDate,
        daily_start_time: finalStart,
        daily_end_time: finalEnd,
        completed,
      };

      // remove taskTime — pass `finalStart` for the time arg.
      await onAddTask(description, selectedDate, finalStart, range);

      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    const nowReset = moment();
    setTitle("");
    setTaskDescription("");
    setIsPriority(false);
    setCompleted(false);
    setStartDate(defaultDate);
    setEndDate(defaultDate);
    setDailyStart(nowReset.format("HH:mm"));
    setDailyEnd(nowReset.add(1, "hour").format("HH:mm"));
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
                          const next = d;
                          setStartDate(next);
                          if (moment(next).isAfter(endDate)) setEndDate(next);
                          setSelectedDate(next);
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
                          setEndDate(moment(d).isBefore(startDate) ? startDate : d);
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Start Time</Label>
                      <MobileTimePicker
                        value={dailyStart}
                        onChange={(value) => {
                          const newStart = value || dailyStart;
                          if (moment(newStart, "HH:mm").isAfter(moment(dailyEnd, "HH:mm"))) {
                            setDailyStart(moment(newStart, "HH:mm").format("HH:mm"));
                            setDailyEnd(moment(newStart, "HH:mm").format("HH:mm"));
                          } else {
                            setDailyStart(moment(newStart, "HH:mm").format("HH:mm"));
                          }
                        }}
                        onBlur={(e) => !e.currentTarget.value && setDailyStart(defaultDailyStart)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">End Time</Label>
                      <MobileTimePicker
                        value={dailyEnd}
                        onChange={(value) => {
                          const newEnd = value || dailyEnd;
                          if (moment(newEnd, "HH:mm").isBefore(moment(dailyStart, "HH:mm"))) {
                            setDailyStart(moment(newEnd, "HH:mm").format("HH:mm"));
                            setDailyEnd(moment(newEnd, "HH:mm").format("HH:mm"));
                          } else {
                            setDailyEnd(moment(newEnd, "HH:mm").format("HH:mm"));
                          }
                        }}
                        onBlur={(e) => !e.currentTarget.value && setDailyEnd(dailyStart)}
                      />
                    </div>
                  </div>

                  {/* Priority & Completed */}
                  <div className="flex items-center justify-between pt-2">
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
                disabled={!title.trim() || isSubmitting}
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
