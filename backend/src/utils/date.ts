/** Parse a date-only string (YYYY-MM-DD) as local time, not UTC */
export function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(dateStr + "T00:00:00");
}

/** Parse a date-only string as end-of-day local time */
export function parseLocalDateEnd(dateStr: string): Date {
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(dateStr + "T23:59:59.999");
}
