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
import { Label } from "@/components/ui/label";
import {
  Clock,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import TaskTagInput from "./TaskTagInput";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import { MultiGoalPicker } from "@/components/goal/GoalPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarRange, ChevronDown, Settings2, Tag as TagIcon, Target } from "lucide-react";
import { format } from "date-fns";

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
      tags?: string[];
    }
  ) => void;
  defaultDate?: Date;
  existingTags?: string[];
  formId?: string;
  primaryGoalId?: string;
}

const SummaryChip: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border border-border bg-background/80 text-foreground/80">
    <span className="text-muted-foreground">{icon}</span>
    {label}
  </span>
);

function summarizeDate(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return format(start, "MMM d, yyyy");
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

const AddTaskDialog = ({
  isOpen,
  onClose,
  onAddTask,
  defaultDate = new Date(),
  existingTags = [],
  formId = "add-task-form",
  primaryGoalId,
}: AddTaskDialogProps) => {
  const { toast } = useToast();
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
  const [tags, setTags] = useState<string[]>([]);
  const [extraGoalIds, setExtraGoalIds] = useState<string[]>([]);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);

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

  // Auto-resize the title textarea so it behaves like a Notion title field.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, isOpen]);

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
        title: title.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        daily_start_time: isAnytime ? undefined : finalStart,
        daily_end_time: isAnytime ? undefined : finalEnd,
        is_anytime: isAnytime,
        duration_minutes: durationMinutes,
        completed,
        tags,
      };

      await onAddTask(description, selectedDate, isAnytime ? undefined : finalStart, range);

      // If user picked extra goals, insert a copy of the task into each of them.
      if (extraGoalIds.length > 0) {
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData?.user) throw new Error("Not signed in");
          const userId = userData.user.id;

          const startISO = startDate.toISOString();
          const endISO = endDate.toISOString();
          const cleanedTags = tags.map((t) => String(t || "").trim()).filter(Boolean);
          const rows = extraGoalIds.map((gid) => ({
            id: crypto.randomUUID(),
            goal_id: gid,
            user_id: userId,
            title: title.trim(),
            description: description,
            completed,
            start_date: startISO,
            end_date: endISO,
            daily_start_time: isAnytime ? null : `${finalStart}:00`,
            daily_end_time: isAnytime ? null : `${finalEnd}:00`,
            is_anytime: isAnytime,
            duration_minutes: durationMinutes,
            tags: cleanedTags.length > 0 ? cleanedTags : null,
          }));

          const { error: copyError } = await supabase.from("tasks").insert(rows);
          if (copyError) throw copyError;

          toast({
            title: "Copied to other goals",
            description: `Task also added to ${rows.length} other goal${rows.length === 1 ? "" : "s"}.`,
          });
        } catch (copyError: any) {
          console.error("Failed to copy task to extra goals:", copyError);
          toast({
            title: "Couldn't copy to extra goals",
            description: copyError?.message || "Primary task was created, but copying to other goals failed.",
            variant: "destructive",
          });
        }
      }

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
    setTags([]);
    setExtraGoalIds([]);
  };

  const isMobile = useIsMobile();

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
          {/* Compact accessible header (visually hidden style on desktop, retained for a11y) */}
          <SheetHeader className="sr-only">
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>

          {/* Editor body */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className={cn(
              "mx-auto w-full",
              isMobile ? "px-4 pt-6 pb-8" : "px-10 lg:px-14 pt-10 pb-10 max-w-3xl"
            )}>
              <form
                id={formId}
                onSubmit={handleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                    e.preventDefault();
                  }
                }}
                className="space-y-5"
              >
                {/* Notion-style title */}
                <textarea
                  ref={titleRef}
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled"
                  autoFocus={!isMobile}
                  rows={1}
                  className={cn(
                    "w-full resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 text-foreground font-bold leading-tight tracking-tight",
                    isMobile ? "text-2xl" : "text-3xl lg:text-4xl"
                  )}
                />

                {/* Description — the main content area */}
                <MarkdownEditor
                  value={taskDescription}
                  onChange={setTaskDescription}
                  placeholder="Add a description, paste images, write a checklist, drop in code…"
                  minHeight={isMobile ? "260px" : "440px"}
                />

                {/* Properties summary + collapsible details */}
                <Collapsible open={propertiesOpen} onOpenChange={setPropertiesOpen} className="border-t border-border/40 pt-4">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 text-left rounded-md px-2 py-2 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                          <Settings2 className="h-3.5 w-3.5" />
                          Properties
                        </span>
                        <SummaryChip icon={<CalendarRange className="h-3 w-3" />} label={summarizeDate(startDate, endDate)} />
                        <SummaryChip icon={<Clock className="h-3 w-3" />} label={isAnytime ? "Anytime" : `${dailyStart}–${dailyEnd}`} />
                        {tags.length > 0 && (
                          <SummaryChip icon={<TagIcon className="h-3 w-3" />} label={`${tags.length} tag${tags.length === 1 ? "" : "s"}`} />
                        )}
                        {extraGoalIds.length > 0 && (
                          <SummaryChip icon={<Target className="h-3 w-3" />} label={`+${extraGoalIds.length} goal${extraGoalIds.length === 1 ? "" : "s"}`} />
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                          propertiesOpen && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden">
                    <div className="pt-4 space-y-3">
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
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                Start Time
                              </Label>
                              <MobileTimePicker value={dailyStart} onChange={handleStartTimeChange} />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                End Time
                              </Label>
                              <MobileTimePicker value={dailyEnd} onChange={handleEndTimeChange} />
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between bg-muted/40 border border-border px-3 py-2.5 rounded-lg">
                          <Label className="text-sm font-medium text-muted-foreground">Anytime</Label>
                          <Switch checked={isAnytime} onCheckedChange={(v) => { setIsAnytime(v); setTimeError(null); }} />
                        </div>

                        <div className="flex items-center justify-between bg-muted/40 border border-border px-3 py-2.5 rounded-lg">
                          <Label className="text-sm font-medium text-muted-foreground">Completed</Label>
                          <Switch checked={completed} onCheckedChange={setCompleted} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tags</Label>
                        <TaskTagInput value={tags} onChange={setTags} suggestions={existingTags} />
                      </div>

                      {primaryGoalId ? (
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Also add to
                          </Label>
                          <MultiGoalPicker
                            selectedIds={extraGoalIds}
                            onChange={setExtraGoalIds}
                            excludeIds={[primaryGoalId]}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Creates an identical copy of this task in each selected goal.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </form>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex-shrink-0 z-20 p-4 sm:p-5 bg-slate-100/90 dark:bg-slate-900/85 border-t border-border/60">
            <div className="mx-auto flex gap-3 max-w-3xl">
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
                form={formId}
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
