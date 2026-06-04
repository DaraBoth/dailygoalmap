import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TaskMetaSheet, { TaskMetaFab } from "./TaskMetaSheet";

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
      color?: string | null;
    }
  ) => void;
  defaultDate?: Date;
  existingTags?: string[];
  formId?: string;
  primaryGoalId?: string;
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
  const [color, setColor] = useState<string | null>(null);
  const [extraGoalIds, setExtraGoalIds] = useState<string[]>([]);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);

  const toMins = (t: string) => {
    const [h = "0", m = "0"] = t.split(":");
    return parseInt(h) * 60 + parseInt(m);
  };

  // Keep selectedDate in sync with start date — used by callers expecting a
  // single representative date for the task.
  useEffect(() => {
    setSelectedDate(startDate);
  }, [startDate]);

  // Reset to defaultDate when the dialog is reopened with a new prop.
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

    // The time error is only visible inside the meta sheet — if the user
    // tried to submit with an invalid time and the sheet is closed, pop it
    // back open so the message is actually reachable.
    if (timeError) {
      setMetaOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const description = taskDescription.trim();
      const finalStart = dailyStart || "09:00";
      const finalEnd = dailyEnd || "10:00";
      const durationMinutes = isAnytime
        ? null
        : Math.max(0, toMins(finalEnd) - toMins(finalStart));

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
        color,
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
            color: color ?? null,
          }));

          const { error: copyError } = await supabase.from("tasks").insert(rows as any);
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
    setColor(null);
    setExtraGoalIds([]);
    setMetaOpen(false);
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
        <div className="flex flex-col h-full relative">
          <SheetHeader className="sr-only">
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>

          {/* Scrollable editor body — title stays sticky at top so it remains
              visible while the user scrolls through a long description. */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <form
              id={formId}
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
                  autoFocus={!isMobile}
                  rows={1}
                  className={cn(
                    "w-full resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 text-foreground font-semibold leading-tight tracking-tight",
                    isMobile ? "text-base" : "text-lg lg:text-xl"
                  )}
                />
              </div>

              {/* Description — full-bleed main content area. Editor wrapper
                  has no border/bg and its inner prose padding is shrunk so
                  the text starts close to the sheet edges. */}
              <div className="w-full pb-32">
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

          {/* Floating action button to open task metadata (date/time/status...) */}
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
            className="bottom-24 sm:bottom-24"
          />

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
          extraGoalIds={extraGoalIds}
          setExtraGoalIds={setExtraGoalIds}
          primaryGoalId={primaryGoalId}
        />
      </SheetContent>
    </Sheet>
  );
};

export default AddTaskDialog;
