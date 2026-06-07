import React from "react";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  RecurrenceConfig,
  RecurrenceFrequency,
  DAY_LABELS,
  MAX_OCCURRENCES,
  generateOccurrenceDates,
} from "@/utils/recurrenceUtils";

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
  { value: "days_of_week", label: "Days of week" },
];

interface RecurrenceSelectorProps {
  value: RecurrenceConfig;
  onChange: (v: RecurrenceConfig) => void;
  startDate: Date;
  endDate?: Date;
}

const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  value,
  onChange,
  startDate,
  endDate,
}) => {
  const occurrenceCount =
    value.frequency === "none"
      ? 0
      : generateOccurrenceDates(startDate, value, MAX_OCCURRENCES, endDate).length;

  const handleFrequencyChange = (freq: RecurrenceFrequency) => {
    if (freq === "days_of_week") {
      onChange({ frequency: freq, daysOfWeek: value.daysOfWeek ?? [startDate.getDay()] });
    } else {
      onChange({ frequency: freq, daysOfWeek: value.daysOfWeek });
    }
  };

  const toggleDay = (day: number) => {
    const current = value.daysOfWeek ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    onChange({ ...value, daysOfWeek: next });
  };

  return (
    <div className="space-y-3">
      {/* Frequency pill selector */}
      <div className="flex flex-wrap gap-1.5">
        {FREQUENCY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleFrequencyChange(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              value.frequency === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Day-of-week picker */}
      {value.frequency === "days_of_week" && (
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, dayIdx) => {
            const active = (value.daysOfWeek ?? []).includes(dayIdx);
            return (
              <button
                key={dayIdx}
                type="button"
                onClick={() => toggleDay(dayIdx)}
                className={cn(
                  "h-8 w-8 rounded-full text-xs font-semibold border transition-all shrink-0",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Preview count */}
      {value.frequency !== "none" && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Repeat className="h-3 w-3 shrink-0" />
          {occurrenceCount} task{occurrenceCount !== 1 ? "s" : ""} will be created
          {occurrenceCount === MAX_OCCURRENCES
            ? " (max 50)"
            : endDate
            ? ` (until ${format(endDate, "MMM d, yyyy")})`
            : ""}
        </p>
      )}
    </div>
  );
};

export default RecurrenceSelector;
