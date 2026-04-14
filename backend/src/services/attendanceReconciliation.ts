import { prisma } from "../config";

/**
 * Upsert platform clock-in/out for a driver on a given date, recompute
 * variance against the Darb-app clock, and set LATE/PRESENT status from
 * the platform time (platform is the system of record for attendance).
 *
 * Called from:
 *   - POST /api/attendance/platform-clock (HTTP entry)
 *   - Talabat session create/update (internal)
 *   - Keeta CourierOnlineSession close (internal, when Feature 1 wires writes)
 *   - Deliveroo / Americana XLSX importers
 */
export async function reconcilePlatformClock(params: {
  tenantId: string;
  driverId: string;
  date: Date | string;
  platformClockIn?: Date | string | null;
  platformClockOut?: Date | string | null;
  scheduledStart?: Date | string | null;
}) {
  const { tenantId, driverId } = params;
  const d = new Date(params.date);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const pIn = params.platformClockIn ? new Date(params.platformClockIn) : null;
  const pOut = params.platformClockOut ? new Date(params.platformClockOut) : null;
  const sched = params.scheduledStart ? new Date(params.scheduledStart) : null;

  const lateMinutes =
    pIn && sched
      ? Math.max(0, Math.floor((pIn.getTime() - sched.getTime()) / 60000))
      : 0;
  const isLate = lateMinutes >= 1;

  const existing = await prisma.attendanceRecord.findUnique({
    where: { tenantId_driverId_date: { tenantId, driverId, date: dayStart } },
  });
  const variance =
    existing?.darbClockIn && pIn
      ? Math.abs(Math.floor((new Date(existing.darbClockIn).getTime() - pIn.getTime()) / 60000))
      : null;

  return prisma.attendanceRecord.upsert({
    where: { tenantId_driverId_date: { tenantId, driverId, date: dayStart } },
    create: {
      tenantId,
      driverId,
      date: dayStart,
      status: pIn ? (isLate ? "LATE" : "PRESENT") : "ABSENT",
      lateMinutes: isLate ? lateMinutes : 0,
      source: "PLATFORM_SYNC",
      platformClockIn: pIn,
      platformClockOut: pOut,
    },
    update: {
      platformClockIn: pIn,
      platformClockOut: pOut,
      varianceMinutes: variance,
      ...(pIn ? { status: isLate ? "LATE" : "PRESENT", lateMinutes: isLate ? lateMinutes : 0 } : {}),
    },
  });
}
