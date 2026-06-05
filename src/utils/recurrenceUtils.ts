import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly" | "days_of_week";

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

const MAX_OCCURRENCES = 50;

/**
 * Generate up to MAX_OCCURRENCES occurrence dates for a given recurrence config.
 * The first date in the result is always the anchor startDate itself (or the
 * first matching day on/after startDate for days_of_week).
 */
export function generateOccurrenceDates(
  startDate: Date,
  config: RecurrenceConfig,
  maxCount = MAX_OCCURRENCES
): Date[] {
  if (config.frequency === "none") return [startDate];

  const dates: Date[] = [];

  if (config.frequency === "daily") {
    for (let i = 0; i < maxCount; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  }

  if (config.frequency === "weekly") {
    for (let i = 0; i < maxCount; i++) {
      dates.push(addWeeks(startDate, i));
    }
    return dates;
  }

  if (config.frequency === "monthly") {
    for (let i = 0; i < maxCount; i++) {
      dates.push(addMonths(startDate, i));
    }
    return dates;
  }

  if (config.frequency === "yearly") {
    for (let i = 0; i < maxCount; i++) {
      dates.push(addYears(startDate, i));
    }
    return dates;
  }

  if (config.frequency === "days_of_week") {
    const targetDays = config.daysOfWeek ?? [];
    if (targetDays.length === 0) return [startDate];

    let cursor = new Date(startDate);
    // Walk forward day by day, collecting matching days
    while (dates.length < maxCount) {
      if (targetDays.includes(cursor.getDay())) {
        dates.push(new Date(cursor));
      }
      cursor = addDays(cursor, 1);
      // Safety: don't loop forever (2 years max)
      if (cursor.getFullYear() > startDate.getFullYear() + 2) break;
    }
    return dates.slice(0, maxCount);
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
