import { prisma } from "../config";
import { isKuwaitWeekend, getDayOfWeekInTz } from "../utils/timezone";

interface LeaveValidationResult {
  valid: boolean;
  error?: string;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Validate a PERSONAL day-off request against business rules:
 * 1. Must be submitted at least 7 days in advance
 * 2. Cannot fall on Kuwait weekends (Thu/Fri/Sat)
 * 3. Max 2 personal day-offs per calendar month
 */
export async function validatePersonalLeave(
  tenantId: string,
  driverId: string,
  startDate: string,
  endDate: string
): Promise<LeaveValidationResult> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Rule 1: Must be submitted at least 7 days before the first off day
  const daysUntilStart = Math.floor((start.getTime() - now.getTime()) / 86400000);
  if (daysUntilStart < 7) {
    return { valid: false, error: "Day-off requests must be submitted at least 1 week in advance." };
  }

  // Rule 2: Cannot apply for off on weekends (Thu/Fri/Sat in Kuwait timezone)
  const invalidDays: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isKuwaitWeekend(d)) {
      invalidDays.push(WEEKDAY_NAMES[getDayOfWeekInTz(d)]);
    }
  }
  if (invalidDays.length > 0) {
    return {
      valid: false,
      error: `Day-off cannot be on weekends (Thu/Fri/Sat). Invalid days: ${invalidDays.join(", ")}.`,
    };
  }

  // Rule 3: Max 2 personal day-offs per calendar month
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
  const usedLeaves = await prisma.leaveRequest.count({
    where: {
      tenantId,
      driverId,
      type: "PERSONAL",
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { gte: monthStart, lte: monthEnd },
    },
  });
  if (usedLeaves >= 2) {
    return { valid: false, error: "Monthly day-off quota reached (max 2 per month)." };
  }

  return { valid: true };
}

/**
 * Create EXCUSED attendance records for an approved leave request's date range.
 */
export async function createLeaveAttendanceRecords(
  tenantId: string,
  driverId: string,
  startDate: Date,
  endDate: Date
) {
  const records = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    records.push({
      tenantId,
      driverId,
      date: new Date(d),
      status: "EXCUSED" as const,
      source: "leave_request",
    });
  }
  if (records.length > 0) {
    await prisma.attendanceRecord.createMany({ data: records });
  }
}

/**
 * Remove EXCUSED attendance records when a leave request is rejected.
 */
export async function removeLeaveAttendanceRecords(
  tenantId: string,
  driverId: string,
  startDate: Date,
  endDate: Date
) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  await prisma.attendanceRecord.deleteMany({
    where: {
      tenantId,
      driverId,
      status: "EXCUSED",
      source: "leave_request",
      date: { gte: start, lte: end },
    },
  });
}
