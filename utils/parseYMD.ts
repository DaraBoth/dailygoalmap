import { format as formatDateFn } from 'date-fns';

/**
 * Parse a YYYY-MM-DD string as a local Date at midnight.
 * Falls back to Date(dateString) if format doesn't match.
 * Returns null if the string is falsy or invalid.
 */
export function parseYMD(dateString?: string | null): Date | null {
  if (!dateString) return null;
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dt = new Date(y, m - 1, d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    }
  }

  // Fallback to generic parse (may be timezone-sensitive)
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

/**
 * Format a Date as yyyy-MM-dd using local date values.
 */
export function formatYMD(date: Date): string {
  return formatDateFn(date, 'yyyy-MM-dd');
}
