// Shared "task details" Sheet — holds everything that isn't the title or
// the rich description (dates, times, status, color, tags, extra goals).
// Opens from a floating button in the Add / Edit / Detail dialogs so the
// editor stays focused on writing while metadata is one tap away.
//
// Fully controlled: parent owns every field. Pass either edit setters
// (for Add/Edit) or omit them + set `readOnly` (for Detail).

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { MobileTimePicker } from "@/components/ui/mobile-time-picker";
import { AlertTriangle, CalendarRange, CheckCircle2, Circle, Clock, Repeat, Tag as TagIcon, X } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import TaskTagInput from "./TaskTagInput";
import { TASK_COLORS } from "./types";
import { MultiGoalPicker } from "@/components/goal/GoalPicker";
import { formatTaskTimeRange } from "./taskDateTime";
import RecurrenceSelector from "./RecurrenceSelector";
import { RecurrenceConfig, recurrenceLabel } from "@/utils/recurrenceUtils";

interface TaskMetaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  startDate: Date;
  endDate: Date;
  dailyStart: string;
  dailyEnd: string;
  isAnytime: boolean;
  completed: boolean;
  color: string | null;
  tags: string[];
  existingTags?: string[];
  timeError?: string | null;

  // Edit setters — omit (or pass undefined) when `readOnly` is true.
  setStartDate?: (d: Date) => void;
  setEndDate?: (d: Date) => void;
  setDailyStart?: (v: string) => void;
  setDailyEnd?: (v: string) => void;
  setIsAnytime?: (v: boolean) => void;
  setCompleted?: (v: boolean) => void;
  setColor?: (v: string | null) => void;
  setTags?: (v: string[]) => void;
  setTimeError?: (v: string | null) => void;

  // Optional — Add dialog only.
  extraGoalIds?: string[];
  setExtraGoalIds?: (v: string[]) => void;
  primaryGoalId?: string;
  recurrence?: RecurrenceConfig;
  setRecurrence?: (v: RecurrenceConfig) => void;

  readOnly?: boolean;
}

const toMins = (t: string) => {
  const [h = "0", m = "0"] = t.split(":");
  return parseInt(h) * 60 + parseInt(m);
};
const fromMins = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

const TaskMetaSheet: React.FC<TaskMetaSheetProps> = (props) => {
  const isMobile = useIsMobile();
  const {
    open,
    onOpenChange,
    startDate,
    endDate,
    dailyStart,
    dailyEnd,
    isAnytime,
    completed,
    color,
    tags,
    existingTags = [],
    timeError,
    setStartDate,
    setEndDate,
    setDailyStart,
    setDailyEnd,
    setIsAnytime,
    setCompleted,
    setColor,
    setTags,
    setTimeError,
    extraGoalIds,
    setExtraGoalIds,
    primaryGoalId,
    recurrence,
    setRecurrence,
    readOnly = false,
  } = props;

  const isSameDayTask = startDate.toDateString() === endDate.toDateString();

  const handleStartTimeChange = (value: string) => {
    if (!setDailyStart) return;
    const v = value || "09:00";
    setDailyStart(v);
    setTimeError?.(null);
    if (isSameDayTask && toMins(v) >= toMins(dailyEnd) && setDailyEnd) {
      setDailyEnd(fromMins(Math.min(toMins(v) + 60, 23 * 60 + 59)));
    }
  };

  const handleEndTimeChange = (value: string) => {
    if (!setDailyEnd) return;
    const v = value || dailyEnd;
    if (isSameDayTask && toMins(v) < toMins(dailyStart)) {
      setTimeError?.("End time cannot be before start time on the same day.");
      return;
    }
    setTimeError?.(null);
    setDailyEnd(v);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 overflow-hidden bg-slate-100/95 dark:bg-slate-950/95 border-border/60 shadow-2xl flex flex-col",
          isMobile
            ? "h-[88vh] rounded-t-3xl"
            : "w-full sm:w-[420px] sm:max-w-none"
        )}
      >
        <SheetHeader className="flex-shrink-0 px-5 py-4 border-b border-border/60">
          <SheetTitle className="text-base">Task details</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {readOnly
              ? "Schedule, status, color and tags for this task."
              : "Set schedule, status, color and tags."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Start date" icon={<CalendarRange className="h-3 w-3" />}>
              {readOnly ? (
                <ReadOnlyValue value={format(startDate, "MMM d, yyyy")} />
              ) : (
                <MobileDatePicker
                  date={startDate}
                  minDate={undefined}
                  maxDate={endDate}
                  setDate={(d) => {
                    if (!d || !setStartDate) return;
                    setStartDate(d);
                    if (d > endDate && setEndDate) setEndDate(d);
                    else if (
                      d.toDateString() !== endDate.toDateString() &&
                      toMins(dailyEnd) < toMins(dailyStart) &&
                      setDailyEnd
                    ) {
                      setDailyEnd("23:59");
                    }
                    setTimeError?.(null);
                  }}
                  className="w-full"
                />
              )}
            </FieldGroup>

            <FieldGroup label="End date" icon={<CalendarRange className="h-3 w-3" />}>
              {readOnly ? (
                <ReadOnlyValue value={format(endDate, "MMM d, yyyy")} />
              ) : (
                <MobileDatePicker
                  date={endDate}
                  minDate={startDate}
                  maxDate={undefined}
                  setDate={(d) => {
                    if (!d || !setEndDate) return;
                    const next = d < startDate ? startDate : d;
                    setEndDate(next);
                    if (
                      next.toDateString() !== startDate.toDateString() &&
                      toMins(dailyEnd) < toMins(dailyStart) &&
                      setDailyEnd
                    ) {
                      setDailyEnd("23:59");
                    }
                    setTimeError?.(null);
                  }}
                  className="w-full"
                />
              )}
            </FieldGroup>
          </div>

          {!isSameDayTask && (
            <p className="text-xs text-muted-foreground -mt-2">
              Spans {Math.max(0, differenceInCalendarDays(endDate, startDate)) + 1} days
            </p>
          )}

          {/* Times — hidden when anytime */}
          {!isAnytime && (
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Start time" icon={<Clock className="h-3 w-3" />}>
                  {readOnly ? (
                    <ReadOnlyValue value={dailyStart} />
                  ) : (
                    <MobileTimePicker value={dailyStart} onChange={handleStartTimeChange} />
                  )}
                </FieldGroup>
                <FieldGroup label="End time" icon={<Clock className="h-3 w-3" />}>
                  {readOnly ? (
                    <ReadOnlyValue value={dailyEnd} />
                  ) : (
                    <MobileTimePicker value={dailyEnd} onChange={handleEndTimeChange} />
                  )}
                </FieldGroup>
              </div>
              {timeError && (
                <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {timeError}
                </p>
              )}
            </div>
          )}

          {isAnytime && readOnly && (
            <FieldGroup label="Time" icon={<Clock className="h-3 w-3" />}>
              <ReadOnlyValue
                value={formatTaskTimeRange(undefined, undefined, true)}
              />
            </FieldGroup>
          )}

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <ToggleCard
              label="Anytime"
              checked={isAnytime}
              onChange={(v) => {
                if (!setIsAnytime) return;
                setIsAnytime(v);
                setTimeError?.(null);
              }}
              disabled={readOnly}
            />
            <ToggleCard
              label="Completed"
              checked={completed}
              onChange={(v) => setCompleted?.(v)}
              disabled={readOnly}
              checkedHint={
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              }
              uncheckedHint={<Circle className="h-3.5 w-3.5 text-amber-500" />}
            />
          </div>

          {/* Color */}
          <FieldGroup label="Color">
            <div className="flex flex-wrap gap-2">
              {TASK_COLORS.map((c) => {
                const active = color === c.hex;
                return readOnly ? (
                  <span
                    key={c.id}
                    title={c.label}
                    className={cn(
                      "h-6 w-6 rounded-full border-2",
                      active ? "border-foreground shadow-sm" : "border-transparent"
                    )}
                    style={{
                      backgroundColor: c.hex ?? "transparent",
                      outline: c.hex ? undefined : "2px dashed hsl(var(--muted-foreground)/0.4)",
                    }}
                  />
                ) : (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setColor?.(c.hex)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-all",
                      active
                        ? "border-foreground scale-110 shadow-sm"
                        : "border-transparent hover:border-muted-foreground/50"
                    )}
                    style={{
                      backgroundColor: c.hex ?? "transparent",
                      outline: c.hex ? undefined : "2px dashed hsl(var(--muted-foreground)/0.4)",
                    }}
                  />
                );
              })}
            </div>
          </FieldGroup>

          {/* Tags */}
          <FieldGroup label="Tags" icon={<TagIcon className="h-3 w-3" />}>
            {readOnly ? (
              tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <ReadOnlyValue value="No tags" muted />
              )
            ) : (
              <TaskTagInput
                value={tags}
                onChange={(v) => setTags?.(v)}
                suggestions={existingTags}
              />
            )}
          </FieldGroup>

          {/* Recurrence — Add dialog only */}
          {!readOnly && setRecurrence && recurrence ? (
            <FieldGroup label="Repeat" icon={<Repeat className="h-3 w-3" />}>
              <RecurrenceSelector
                value={recurrence}
                onChange={setRecurrence}
                startDate={startDate}
              />
            </FieldGroup>
          ) : readOnly && recurrence && recurrence.frequency !== "none" ? (
            <FieldGroup label="Repeat" icon={<Repeat className="h-3 w-3" />}>
              <ReadOnlyValue value={recurrenceLabel(recurrence)} />
            </FieldGroup>
          ) : null}

          {/* Extra goals — Add dialog only */}
          {!readOnly && primaryGoalId && setExtraGoalIds ? (
            <FieldGroup label="Also add to">
              <MultiGoalPicker
                selectedIds={extraGoalIds ?? []}
                onChange={setExtraGoalIds}
                excludeIds={[primaryGoalId]}
              />
              <p className="text-[11px] text-muted-foreground">
                Creates an identical copy of this task in each selected goal.
              </p>
            </FieldGroup>
          ) : null}
        </div>

        <div className="flex-shrink-0 p-4 border-t border-border/60">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full h-10"
            variant={readOnly ? "outline" : "default"}
          >
            {readOnly ? (
              <>
                <X className="h-4 w-4 mr-2" /> Close
              </>
            ) : (
              "Done"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const FieldGroup: React.FC<{
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
      {icon}
      {label}
    </Label>
    {children}
  </div>
);

const ReadOnlyValue: React.FC<{ value: string; muted?: boolean }> = ({ value, muted }) => (
  <div
    className={cn(
      "px-3 py-2 rounded-md border border-border bg-muted/30 text-sm",
      muted && "text-muted-foreground italic"
    )}
  >
    {value}
  </div>
);

const ToggleCard: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  checkedHint?: React.ReactNode;
  uncheckedHint?: React.ReactNode;
}> = ({ label, checked, onChange, disabled, checkedHint, uncheckedHint }) => (
  <div className="flex items-center justify-between bg-muted/40 border border-border px-3 py-2.5 rounded-lg">
    <div className="flex items-center gap-1.5">
      {checked ? checkedHint : uncheckedHint}
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

// Render-prop helper for the floating action button that opens this Sheet.
// Sits absolute bottom-right inside a positioned parent — above any sticky
// footer the parent dialog renders. The summary chip shows a compact preview
// of what's currently set so users don't have to open the Sheet to peek.
export const TaskMetaFab: React.FC<{
  onClick: () => void;
  startDate: Date;
  endDate: Date;
  dailyStart: string;
  dailyEnd: string;
  isAnytime: boolean;
  completed: boolean;
  tagCount: number;
  className?: string;
  hasError?: boolean;
  /** Task color (hex) — tints the FAB so it matches its task's accent. */
  color?: string | null;
}> = ({
  onClick,
  startDate,
  endDate,
  dailyStart,
  dailyEnd,
  isAnytime,
  completed,
  tagCount,
  className,
  hasError,
  color,
}) => {
  const dateSummary =
    startDate.toDateString() === endDate.toDateString()
      ? format(startDate, "MMM d")
      : `${format(startDate, "MMM d")} – ${format(endDate, "MMM d")}`;
  const timeSummary = isAnytime ? "Anytime" : `${dailyStart}–${dailyEnd}`;

  // When the task has a color and there's no error, tint the FAB with it
  // (white text on top reads cleanly against the saturated palette).
  // Otherwise fall back to a theme-aware neutral so it doesn't look reversed
  // in light mode (was bg-foreground/text-background = dark pill on light bg).
  const useTaskColor = !hasError && !!color;
  const inlineStyle: React.CSSProperties | undefined = useTaskColor
    ? { backgroundColor: color!, color: "#fff", borderColor: color! }
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      style={inlineStyle}
      className={cn(
        "absolute right-3 sm:right-5 z-20 inline-flex items-center gap-2 rounded-full",
        "shadow-lg",
        "px-3.5 py-2 text-xs font-medium tracking-tight",
        "hover:scale-[1.02] active:scale-100 transition-all",
        "border",
        hasError
          ? "bg-destructive text-destructive-foreground border-destructive shadow-destructive/30"
          : useTaskColor
            ? "shadow-black/20"
            : "bg-card text-foreground border-border shadow-foreground/10",
        className
      )}
      aria-label="Open task details"
    >
      {hasError ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : completed ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Circle className="h-3.5 w-3.5 opacity-70" />
      )}
      <span className="hidden sm:inline">{dateSummary}</span>
      <span className="opacity-50 hidden sm:inline">·</span>
      <span>{timeSummary}</span>
      {tagCount > 0 && (
        <>
          <span className="opacity-50">·</span>
          <span className="inline-flex items-center gap-1">
            <TagIcon className="h-3 w-3" />
            {tagCount}
          </span>
        </>
      )}
    </button>
  );
};

export default TaskMetaSheet;
