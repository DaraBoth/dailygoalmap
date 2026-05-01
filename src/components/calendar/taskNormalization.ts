import { Task } from "./types";

type TaskRow = Partial<Task> & {
  date?: string | null;
  id: string;
  user_id?: string | null;
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateValue = (value?: string | null, fallback?: string | null): string => {
  const source = value || fallback;
  if (!source) return new Date().toISOString();

  // Preserve day-only values as local noon to avoid timezone day-shift on parsing.
  if (DATE_ONLY_RE.test(source)) {
    return `${source}T12:00:00`;
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();

  // Keep original value to avoid changing persisted timezone semantics.
  return source;
};

export const normalizeTaskRecord = (row: TaskRow): Task => {
  const fallbackDate = row.date || row.created_at || row.updated_at || new Date().toISOString();
  const startDate = normalizeDateValue(row.start_date, fallbackDate);
  const endDate = normalizeDateValue(row.end_date, row.start_date || fallbackDate);

  return {
    id: row.id,
    description: row.description || row.title || "Task",
    completed: !!row.completed,
    user_id: row.user_id || "",
    updated_by: row.updated_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    title: row.title || row.description || "Task",
    start_date: startDate,
    end_date: endDate,
    daily_start_time: row.daily_start_time || null,
    daily_end_time: row.daily_end_time || null,
    is_anytime: row.is_anytime ?? null,
    duration_minutes: row.duration_minutes ?? null,
    tags: row.tags || [],
  };
};

export const normalizeTaskList = (rows: TaskRow[] | null | undefined): Task[] => {
  if (!rows || rows.length === 0) return [];
  return rows.map(normalizeTaskRecord);
};
