import { format, isValid, parseISO } from "date-fns";

export const formatTaskDate = (dateValue?: string | Date | null) => {
  if (!dateValue) return "-";

  const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
  return isValid(date) ? format(date, "MMM d, yyyy") : "-";
};

export const formatTaskDateRange = (startDateValue?: string | null, endDateValue?: string | null) => {
  if (!startDateValue) return "-";

  const startDate = parseISO(startDateValue);
  const endDate = endDateValue ? parseISO(endDateValue) : startDate;

  if (!isValid(startDate)) return "-";
  if (!isValid(endDate) || startDateValue.slice(0, 10) === endDateValue?.slice(0, 10)) {
    return format(startDate, "MMM d, yyyy");
  }

  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
};

export const formatTaskTime = (timeValue?: string | null) => {
  if (!timeValue) return "-";

  const [hours = 0, minutes = 0] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return isValid(date) ? format(date, "h:mm a") : "-";
};

export const formatTaskTimeRange = (
  startTime?: string | null,
  endTime?: string | null,
  isAnytime?: boolean | null,
) => {
  if (isAnytime) return "Anytime";
  if (!startTime) return "-";

  const formattedStart = formatTaskTime(startTime);
  const formattedEnd = endTime ? formatTaskTime(endTime) : null;

  return formattedEnd ? `${formattedStart} - ${formattedEnd}` : formattedStart;
};

// Alias for use in form/input display contexts
export const formatTimeForDisplay = formatTaskTime;