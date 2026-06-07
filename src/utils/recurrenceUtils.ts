import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly" | "days_of_week";

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export const MAX_OCCURRENCES = 50;

/**
 * Generate occurrence dates for a recurrence config.
 *
 * Stops at whichever comes first:
 *   • maxCount (default 50) — hard safety cap
 *   • endDate  — goal target date or explicit series end; occurrences past
 *                this date are excluded
 *
 * The first date is always startDate itself (or the first matching weekday
 * on/after startDate for days_of_week).
 */
export function generateOccurrenceDates(
  startDate: Date,
  config: RecurrenceConfig,
  maxCount = MAX_OCCURRENCES,
  endDate?: Date
): Date[] {
  if (config.frequency === "none") return [startDate];

  const dates: Date[] = [];

  if (config.frequency === "daily") {
    for (let i = 0; i < maxCount; i++) {
      const d = addDays(startDate, i);
      if (endDate && d > endDate) break;
      dates.push(d);
    }
    return dates;
  }

  if (config.frequency === "weekly") {
    for (let i = 0; i < maxCount; i++) {
      const d = addWeeks(startDate, i);
      if (endDate && d > endDate) break;
      dates.push(d);
    }
    return dates;
  }

  if (config.frequency === "monthly") {
    for (let i = 0; i < maxCount; i++) {
      const d = addMonths(startDate, i);
      if (endDate && d > endDate) break;
      dates.push(d);
    }
    return dates;
  }

  if (config.frequency === "yearly") {
    for (let i = 0; i < maxCount; i++) {
      const d = addYears(startDate, i);
      if (endDate && d > endDate) break;
      dates.push(d);
    }
    return dates;
  }

  if (config.frequency === "days_of_week") {
    const targetDays = config.daysOfWeek ?? [];
    if (targetDays.length === 0) return [startDate];

    let cursor = new Date(startDate);
    // Walk forward day by day collecting matching weekdays.
    // Stop at endDate if provided, otherwise cap at 2 years.
    const safetyEnd = endDate ?? addYears(startDate, 2);
    while (dates.length < maxCount && cursor <= safetyEnd) {
      if (targetDays.includes(cursor.getDay())) {
        dates.push(new Date(cursor));
      }
      cursor = addDays(cursor, 1);
    }
    return dates;
  }

  return [startDate];
}

export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const DAY_FULL_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function recurrenceLabel(config: RecurrenceConfig): string {
  if (config.frequency === "none") return "No repeat";
  if (config.frequency === "daily") return "Every day";
  if (config.frequency === "weekly") return "Every week";
  if (config.frequency === "monthly") return "Every month";
  if (config.frequency === "yearly") return "Every year";
  if (config.frequency === "days_of_week") {
    const days = (config.daysOfWeek ?? []).map((d) => DAY_FULL_LABELS[d]).join(", ");
    return days ? `Every ${days}` : "Select days";
  }
  return "No repeat";
}
