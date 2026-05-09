import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Wraps AttendanceRecord with date range and optional driverId filter. Aggregates
 * by driver: present, late, absent counts, and average lateMinutes. Suitable for
 * 'who was late this week' or 'attendance for driver X' chat answers.
 */
export const attendanceForPeriod = defineTool({
  name: "attendanceForPeriod",
  description:
    "Aggregate attendance for a date range. Returns one row per driver with counts of present, late, absent, and the average late-minutes value across LATE-status records. Use for 'who was late this week', 'attendance summary for driver X', or as input to coaching/scoring. Optional driverId filter scopes to a single courier. Tenant-scoped, max 365 days, default lookback 30 days when dateFrom/dateTo not provided.",
  inputSchema: {
    type: "object" as const,
    properties: {
      dateFrom: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      dateTo: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      driverId: { type: "string", description: "Optional: scope to one driver." },
    },
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    driverId: z.string().optional(),
  }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const dateTo = input.dateTo ? new Date(input.dateTo) : new Date();
    const dateFrom = input.dateFrom
      ? new Date(input.dateFrom)
      : new Date(dateTo.getTime() - 30 * 86_400_000);
    // Clamp range to 365 days max.
    const oneYearAgo = new Date(dateTo.getTime() - 365 * 86_400_000);
    const effectiveFrom = dateFrom < oneYearAgo ? oneYearAgo : dateFrom;

    const rows = await prisma.attendanceRecord.findMany({
      where: {
        tenantId: ctx.tenantId,
        date: { gte: effectiveFrom, lte: dateTo },
        ...(input.driverId ? { driverId: input.driverId } : {}),
      },
      select: {
        driverId: true,
        status: true,
        lateMinutes: true,
      },
      take: 5000,
    });

    type Acc = {
      driverId: string;
      present: number;
      late: number;
      absent: number;
      lateMinutesTotal: number;
    };
    const byDriver = new Map<string, Acc>();
    for (const r of rows) {
      const acc =
        byDriver.get(r.driverId) ?? {
          driverId: r.driverId,
          present: 0,
          late: 0,
          absent: 0,
          lateMinutesTotal: 0,
        };
      const status = String(r.status).toUpperCase();
      if (status === "PRESENT") acc.present++;
      else if (status === "LATE") {
        acc.late++;
        acc.lateMinutesTotal += r.lateMinutes ?? 0;
      } else if (status === "ABSENT") acc.absent++;
      byDriver.set(r.driverId, acc);
    }

    // Hydrate driver names.
    const driverIds = [...byDriver.keys()];
    const drivers = await prisma.driver.findMany({
      where: { tenantId: ctx.tenantId, id: { in: driverIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(drivers.map((d) => [d.id, d.name]));

    return [...byDriver.values()].map((a) => ({
      driverId: a.driverId,
      driverName: nameById.get(a.driverId) ?? "(unknown)",
      present: a.present,
      late: a.late,
      absent: a.absent,
      lateMinutesAvg: a.late > 0 ? +(a.lateMinutesTotal / a.late).toFixed(1) : 0,
    }));
  },
});

export function registerAttendanceForPeriodTool() {
  toolRegistry.register(attendanceForPeriod);
}

registerAttendanceForPeriodTool();
