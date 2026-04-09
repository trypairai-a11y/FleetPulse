/**
 * Timezone-aware date utilities for Kuwait fleet management.
 * Default timezone: Asia/Kuwait (UTC+3)
 *
 * All "start of day" / "end of day" calculations should use these helpers
 * when dealing with booking windows, attendance boundaries, and leave requests.
 */

/**
 * Get the start of the day in the given timezone as a UTC Date object.
 * e.g. for Asia/Kuwait, "2024-01-15 00:00:00 +03:00" -> UTC Date
 */
export function startOfDayInTz(date: Date, timezone: string = "Asia/Kuwait"): Date {
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"
  // Parse as local midnight in the target timezone
  return new Date(new Date(dateStr + "T00:00:00").toLocaleString("en-US", { timeZone: "UTC" }) + " UTC"
    .replace(" UTC", ""));
}

/**
 * A simpler approach: given a YYYY-MM-DD string and timezone, return the UTC Date for midnight.
 */
export function dateStringToUtcMidnight(dateStr: string, timezone: string = "Asia/Kuwait"): Date {
  // Create a date at noon UTC to avoid DST issues, then shift to timezone midnight
  const d = new Date(`${dateStr}T12:00:00Z`);
  const localMidnight = new Date(d.toLocaleDateString("en-CA", { timeZone: timezone }) + "T00:00:00");
  // Convert the "local" midnight back to UTC
  const offset = getTimezoneOffsetHours(timezone, d);
  return new Date(localMidnight.getTime() - offset * 3600000);
}

/**
 * Get current time in the given timezone as a Date with local time properties.
 */
export function nowInTz(timezone: string = "Asia/Kuwait"): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

/**
 * Get the day of week (0=Sun..6=Sat) for a Date in the given timezone.
 */
export function getDayOfWeekInTz(date: Date, timezone: string = "Asia/Kuwait"): number {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayStr = date.toLocaleDateString("en-US", { timeZone: timezone, weekday: "short" });
  return days.indexOf(dayStr);
}

/**
 * Get the hour of day (0-23) for a Date in the given timezone.
 */
export function getHourInTz(date: Date, timezone: string = "Asia/Kuwait"): number {
  return parseInt(date.toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", hour12: false }));
}

/**
 * Approximate UTC offset in hours for a timezone at a given date.
 * Used for date boundary calculations.
 */
function getTimezoneOffsetHours(timezone: string, at: Date = new Date()): number {
  const utcStr = at.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = at.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (tzDate.getTime() - utcDate.getTime()) / 3600000;
}

/**
 * Check if a booking window is currently open in the given timezone.
 * @param windowDay - Day name like "TUESDAY"
 * @param startHour - Hour (0-23) in local time
 * @param endHour - Hour (0-23) in local time
 * @param timezone - IANA timezone string
 */
export function isBookingWindowOpen(
  windowDay: string,
  startHour: number,
  endHour: number,
  timezone: string = "Asia/Kuwait"
): boolean {
  const now = new Date();
  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const currentDayOfWeek = getDayOfWeekInTz(now, timezone);
  const currentDay = dayNames[currentDayOfWeek];
  if (currentDay !== windowDay.toUpperCase()) return false;

  const currentHour = getHourInTz(now, timezone);
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Kuwait weekend days (Thu=4, Fri=5, Sat=6) — for leave request validation.
 */
export const KUWAIT_WEEKEND_DAYS = new Set([4, 5, 6]);

/**
 * Check if a date falls on a Kuwait weekend.
 */
export function isKuwaitWeekend(date: Date, timezone: string = "Asia/Kuwait"): boolean {
  return KUWAIT_WEEKEND_DAYS.has(getDayOfWeekInTz(date, timezone));
}
