
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { MobileTimePicker } from "@/components/ui/mobile-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarClock, Clock, Calendar, X, Check, AlertCircle, Loader2, ChevronDown, ChevronUp, ArrowDown } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AutoResizingDescription } from "./AutoResizingDescription";

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

const AddTaskDialog = ({ isOpen, onClose, onAddTask, defaultDate = new Date() }: AddTaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate); // kept internal for anchoring but hidden in UI
  const [taskTime, setTaskTime] = useState(format(new Date(), "HH:mm"));
  const [isPriority, setIsPriority] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date>(defaultDate);
  const [endDate, setEndDate] = useState<Date>(defaultDate);
  const [dailyStart, setDailyStart] = useState<string>(taskTime);
  const [dailyEnd, setDailyEnd] = useState<string>(format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"));
  const [completed, setCompleted] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
        const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          const isContentScrollable = content.scrollHeight > scrollArea.clientHeight;
          setIsScrollable(isContentScrollable);
        }
      }
    };

    if (isOpen) {
      // Check after dialog opens and content renders
      const timer = setTimeout(checkScrollable, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, title, taskDescription, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      setIsSubmitting(true);
      try {
        const rawDesc = taskDescription.trim();
        const description = rawDesc ? (isPriority ? `🔴 ${rawDesc}` : rawDesc) : '';
        // Determine range automatically: multi-date if start and end differ
        const isMulti = startDate.toDateString() !== endDate.toDateString();
        const range = {
          title: title || undefined,
          start_date: startDate,
          end_date: endDate,
          daily_start_time: isMulti ? dailyStart : taskTime,
          daily_end_time: isMulti ? dailyEnd : taskTime,
          completed,
        };
        await onAddTask(description, selectedDate, taskTime, range);
        resetForm();
        onClose();
      } catch (error) {
        console.error("Failed to add task:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setTitle("");
    setTaskDescription("");
    setIsPriority(false);
    setCompleted(false);
    setStartDate(defaultDate);
    setEndDate(defaultDate);
    setDailyStart(taskTime);
    setDailyEnd(format(new Date(Date.now() + 60 * 60 * 1000), "HH:mm"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-[380px] sm:max-w-[380px] md:max-w-[500px] lg:max-w-2xl p-0 overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-white/25 text-gray-900 dark:text-white rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl flex flex-col">
        <div className="flex flex-col h-full max-h-[80vh]">
          {/* Fixed header */}
          <div className="flex-shrink-0 z-20 bg-inherit">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-xl bg-white/80 dark:bg-white/20 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/90 dark:hover:bg-white/30 transition-all duration-200 shadow-lg z-10"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>
            <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-200/60 dark:border-white/25">
              <DialogTitle className="flex items-center gap-3 sm:gap-4 text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                <div className="p-1.5 sm:p-2 bg-blue-100/80 dark:bg-blue-900/50 backdrop-blur-sm rounded-lg sm:rounded-xl">
                  <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700 dark:text-blue-300" />
                </div>
                Add New Task
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Scrollable content area with enhanced UX */}
          <div className="flex-1 overflow-y-auto">
            <div ref={scrollAreaRef} className="px-4" style={{ minHeight: 'calc(100% + 8rem)', paddingBottom: 'min(0.1rem, max(20vh, 6rem))' }}>
              <div ref={contentRef} className="py-4 space-y-4">
                <form id="add-task-form" onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4 md:space-y-6">
                  <div className="space-y-3 sm:space-y-5">
                    {/* Title */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="task-title" className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-300 flex items-center gap-1.5 sm:gap-2">
                        Title
                        <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" />
                      </Label>
                      <Input
                        id="task-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Short title (e.g., Meeting, Read Book)"
                        autoFocus
                        className="dark:bg-slate-800/50 border-slate-700 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-all h-8 sm:h-10 text-sm"
                      />
                    </div>
                    {/* Description */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="task-description" className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-300 flex items-center gap-1.5 sm:gap-2">
                        Task Description
                        <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" />
                      </Label>
                      <AutoResizingDescription
                        id="task-description"
                        value={taskDescription}
                        onChange={(v) => setTaskDescription(v)}
                        placeholder="What needs to be done?"
                        className="dark:bg-slate-800/50 border-slate-700 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    {/* Date and Time Pickers */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-800 dark:text-gray-300 flex items-center gap-2"><Calendar className="h-3 w-3" /> Start Date<div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" /></Label>
                          <MobileDatePicker date={startDate} minDate={undefined} maxDate={endDate} setDate={(d) => { if (!d) return; const next = d; setStartDate(next); if (next > endDate) setEndDate(next); setSelectedDate(next); }} className="w-full dark:bg-slate-800/50 border-slate-700 dark:text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-800 dark:text-gray-300 flex items-center gap-2"><Calendar className="h-3 w-3" /> End Date<div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" /></Label>
                          <MobileDatePicker date={endDate} minDate={startDate} maxDate={undefined} setDate={(d) => { if (!d) return; setEndDate(d < startDate ? startDate : d); }} className="w-full dark:bg-slate-800/50 border-slate-700 dark:text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-800 dark:text-gray-300 flex items-center gap-2"><Clock className="h-3 w-3" /> Daily Start<div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" /></Label>
                          <MobileTimePicker
                            value={dailyStart}
                            onChange={(value) => { setDailyStart(value || taskTime); setTaskTime(value || taskTime); }}
                            onBlur={(e) => { if (!e.currentTarget.value) { setDailyStart(taskTime); } }}
                            className="dark:bg-slate-800/50 border-slate-700 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-800 dark:text-gray-300 flex items-center gap-2"><Clock className="h-3 w-3" /> Daily End<div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" /></Label>
                          <MobileTimePicker
                            value={dailyEnd}
                            onChange={(value) => setDailyEnd(value || dailyStart)}
                            onBlur={(e) => !e.currentTarget.value && setDailyEnd(dailyStart)}
                            className="dark:bg-slate-800/50 border-slate-700 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-800 dark:text-gray-400">
                        {startDate && endDate && startDate.toDateString() !== endDate.toDateString() ? `Spans ${Math.max(0, differenceInCalendarDays(endDate, startDate)) + 1} days` : 'Single day task'}
                      </div>
                    </div>
                  </div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-row items-center justify-between gap-2 flex-wrap py-1 sm:py-2 w-full">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button type="button" onClick={() => setIsPriority(!isPriority)} className={cn("p-1.5 sm:p-2 rounded-md sm:rounded-lg border transition-all", isPriority ? "bg-red-500/20 border-red-500/50 text-red-400" : "dark:bg-slate-800/50 border-slate-700 text-gray-800 dark:text-gray-400 hover:border-blue-500/50") }>
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                      <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-400">{isPriority ? "Priority Task" : "Mark as Priority"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Label className="text-xs sm:text-sm text-gray-800 dark:text-gray-300">Completed</Label>
                      <Switch checked={completed} onCheckedChange={setCompleted} />
                    </div>
                  </motion.div>
                </form>
              </div>
            </div>
          </div>
          {/* Fixed button area at bottom */}
          <div className="flex-shrink-0 sticky bottom-0 z-20 p-4 border-t border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button type="submit" form="add-task-form" disabled={!title.trim() || isSubmitting} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white h-9 sm:h-10 md:h-11 text-sm">
                {isSubmitting ? (<><Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-1.5 sm:mr-2" />Adding Task...</>) : (<><Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />Add Task</>)}
              </Button>
              <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }} className="w-full transition-all duration-200 h-9 sm:h-10 md:h-11 text-sm">Cancel</Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
