import { format, isSameDay } from "date-fns";

export const DEFAULT_TASK_START_TIME = "09:00";
export const DEFAULT_TASK_END_TIME = "10:00";
export const MULTI_DAY_END_OF_DAY_TIME = "23:59";

export const normalizeTimeValue = (timeValue?: string | null, fallback = DEFAULT_TASK_START_TIME) => {
  if (!timeValue) return fallback;

  const [rawHours = "0", rawMinutes = "0"] = timeValue.split(":");
  const hours = Number.parseInt(rawHours, 10);
  const minutes = Number.parseInt(rawMinutes, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;

  const safeHours = Math.max(0, Math.min(hours, 23));
  const safeMinutes = Math.max(0, Math.min(minutes, 59));
  return `${String(safeHours).padStart(2, "0")}:${String(safeMinutes).padStart(2, "0")}`;
};

export const formatTimeForDisplay = (timeValue?: string | null) => {
  if (!timeValue) return "Select time";

  const normalized = normalizeTimeValue(timeValue, "00:00");
  const [hours, minutes] = normalized.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return format(date, "hh:mm a");
};

export const getTimeMinutes = (timeValue?: string | null) => {
  const normalized = normalizeTimeValue(timeValue, "00:00");
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
};

export const isMultiDayTask = (startDate: Date, endDate: Date) => !isSameDay(startDate, endDate);

export const ensureValidTimeRange = ({
  startDate,
  endDate,
  startTime,
  endTime,
}: {
  startDate: Date;
  endDate: Date;
  startTime?: string | null;
  endTime?: string | null;
}) => {
  const normalizedStart = normalizeTimeValue(startTime, DEFAULT_TASK_START_TIME);
  const normalizedEnd = normalizeTimeValue(endTime, DEFAULT_TASK_END_TIME);

  if (isMultiDayTask(startDate, endDate)) {
    return { startTime: normalizedStart, endTime: normalizedEnd };
  }

  if (getTimeMinutes(normalizedStart) > getTimeMinutes(normalizedEnd)) {
    return { startTime: normalizedStart, endTime: normalizedStart };
  }

  return { startTime: normalizedStart, endTime: normalizedEnd };
};

export const getDurationMinutes = ({
  startDate,
  endDate,
  startTime,
  endTime,
  isAnytime,
}: {
  startDate: Date;
  endDate: Date;
  startTime?: string | null;
  endTime?: string | null;
  isAnytime?: boolean | null;
}) => {
  if (isAnytime) return null;

  const normalizedStart = normalizeTimeValue(startTime, DEFAULT_TASK_START_TIME);
  const normalizedEnd = normalizeTimeValue(endTime, DEFAULT_TASK_END_TIME);

  const [startHours, startMinutes] = normalizedStart.split(":").map(Number);
  const [endHours, endMinutes] = normalizedEnd.split(":").map(Number);

  const start = new Date(startDate);
  start.setHours(startHours, startMinutes, 0, 0);

  const end = new Date(endDate);
  end.setHours(endHours, endMinutes, 0, 0);

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
};
