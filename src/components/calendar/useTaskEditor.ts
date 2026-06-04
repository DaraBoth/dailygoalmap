// Shared editor state for a single Task — used by TaskDetailsPanel and
// TaskDetailsSidebar so they can inline-edit instead of opening a separate
// EditTaskDialog. Owns every editable field, the time-range validation, a
// reset effect that re-hydrates state when the task prop changes, and a
// `buildRange()` helper that produces the payload shape the existing
// onUpdateTask callbacks already expect.

import { useCallback, useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import type { Task } from "./types";

const toMins = (t: string) => {
  const [h = "0", m = "0"] = t.split(":");
  return parseInt(h) * 60 + parseInt(m);
};
const fromMins = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export interface TaskUpdateRange {
  title?: string;
  start_date?: Date | null;
  end_date?: Date | null;
  daily_start_time?: string | null;
  daily_end_time?: string | null;
  is_anytime?: boolean;
  duration_minutes?: number | null;
  completed?: boolean;
  tags?: string[];
  color?: string | null;
}

export interface UseTaskEditorReturn {
  // values
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  dailyStart: string;
  dailyEnd: string;
  isAnytime: boolean;
  completed: boolean;
  color: string | null;
  tags: string[];
  timeError: string | null;
  // setters
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setStartDate: (v: Date) => void;
  setEndDate: (v: Date) => void;
  setDailyStart: (v: string) => void;
  setDailyEnd: (v: string) => void;
  setIsAnytime: (v: boolean) => void;
  setCompleted: (v: boolean) => void;
  setColor: (v: string | null) => void;
  setTags: (v: string[]) => void;
  setTimeError: (v: string | null) => void;
  // helpers
  handleStartTimeChange: (v: string) => void;
  handleEndTimeChange: (v: string) => void;
  buildRange: () => TaskUpdateRange;
  buildCombinedDateTime: () => Date;
  resetFromTask: () => void;
}

export function useTaskEditor(task: Task | null): UseTaskEditorReturn {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dailyStart, setDailyStart] = useState<string>("09:00");
  const [dailyEnd, setDailyEnd] = useState<string>("10:00");
  const [isAnytime, setIsAnytime] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [color, setColor] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [timeError, setTimeError] = useState<string | null>(null);

  const resetFromTask = useCallback(() => {
    if (!task) return;
    const desc = task.description?.replace(/🔴\s*/, "") ?? "";
    setTitle(task.title ?? "");
    setDescription(desc);
    if (task.start_date) setStartDate(new Date(task.start_date));
    if (task.end_date) setEndDate(new Date(task.end_date));

    const hasTime = !!task.daily_start_time;
    const anytime = !hasTime || !!task.is_anytime;
    setIsAnytime(anytime);
    setDailyStart(hasTime ? task.daily_start_time!.slice(0, 5) : "09:00");
    setDailyEnd(task.daily_end_time ? task.daily_end_time.slice(0, 5) : "10:00");

    setCompleted(!!task.completed);
    setTags(
      Array.isArray(task.tags)
        ? task.tags.filter((t): t is string => typeof t === "string")
        : []
    );
    setColor(task.color ?? null);
    setTimeError(null);
  }, [task]);

  // Re-hydrate every time the task prop changes (different task selected,
  // or a fresh fetched version of the same task came in).
  useEffect(() => {
    resetFromTask();
  }, [resetFromTask]);

  const isSameDayTask = startDate.toDateString() === endDate.toDateString();

  const handleStartTimeChange = useCallback(
    (value: string) => {
      const v = value || "09:00";
      setDailyStart(v);
      setTimeError(null);
      if (isSameDayTask && toMins(v) >= toMins(dailyEnd)) {
        setDailyEnd(fromMins(Math.min(toMins(v) + 60, 23 * 60 + 59)));
      }
    },
    [dailyEnd, isSameDayTask]
  );

  const handleEndTimeChange = useCallback(
    (value: string) => {
      const v = value || dailyEnd;
      if (isSameDayTask && toMins(v) < toMins(dailyStart)) {
        setTimeError("End time cannot be before start time on the same day.");
        return;
      }
      setTimeError(null);
      setDailyEnd(v);
    },
    [dailyEnd, dailyStart, isSameDayTask]
  );

  const buildRange = useCallback((): TaskUpdateRange => {
    const finalStart = dailyStart || "09:00";
    const finalEnd = dailyEnd || finalStart;
    const durationMinutes = isAnytime
      ? null
      : Math.max(
          0,
          toMins(finalEnd) +
            differenceInCalendarDays(endDate, startDate) * 1440 -
            toMins(finalStart)
        );
    return {
      title,
      start_date: startDate,
      end_date: endDate,
      daily_start_time: isAnytime ? null : finalStart,
      daily_end_time: isAnytime ? null : finalEnd,
      is_anytime: isAnytime,
      duration_minutes: durationMinutes,
      completed,
      tags,
      color,
    };
  }, [title, startDate, endDate, dailyStart, dailyEnd, isAnytime, completed, tags, color]);

  const buildCombinedDateTime = useCallback((): Date => {
    const dt = new Date(startDate);
    const [h, m] = (dailyStart || "09:00").split(":");
    dt.setHours(parseInt(h), parseInt(m));
    return dt;
  }, [startDate, dailyStart]);

  return {
    title, description, startDate, endDate, dailyStart, dailyEnd,
    isAnytime, completed, color, tags, timeError,
    setTitle, setDescription, setStartDate, setEndDate, setDailyStart,
    setDailyEnd, setIsAnytime, setCompleted, setColor, setTags, setTimeError,
    handleStartTimeChange, handleEndTimeChange,
    buildRange, buildCombinedDateTime, resetFromTask,
  };
}
