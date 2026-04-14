import { prisma } from "../config";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DriverDateRange {
  targetStart: Date;
  targetEnd: Date;
}

interface EnrichedDriver {
  dailyOrders: number;
  totalSales: number | null;
  cashCollected: number | null;
  cashDeposited: number | null;
  uti: number;
  workingHours: number | null;
  talabatStatus?: string;
}

// ─── Date Resolution ────────────────────────────────────────────────────────

/**
 * Resolve the target date range for driver performance data.
 * Uses explicit date if provided, otherwise today if data exists,
 * or falls back to the most recent date with data.
 */
export async function resolveDriverDateRange(
  tenantId: string,
  dateParam?: string
): Promise<DriverDateRange> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  if (dateParam) {
    const targetStart = new Date(dateParam);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 1);
    return { targetStart, targetEnd };
  }

  const todayCount = await prisma.orderLog.count({
    where: { tenantId, date: { gte: todayStart, lt: tomorrowStart } },
  });

  if (todayCount > 0) {
    return { targetStart: todayStart, targetEnd: tomorrowStart };
  }

  const latest = await prisma.orderLog.findFirst({
    where: { tenantId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (latest) {
    const targetStart = new Date(latest.date);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 1);
    return { targetStart, targetEnd };
  }

  return { targetStart: todayStart, targetEnd: tomorrowStart };
}

// ─── Driver Enrichment ──────────────────────────────────────────────────────

/**
 * Batch-load performance stats for a list of driver IDs in a given date range.
 * Returns a map of driverId -> enrichment data.
 *
 * This replaces the N+1 pattern of including nested relations per driver,
 * using 4 batched queries instead of 4*N nested includes.
 */
export async function batchLoadDriverStats(
  tenantId: string,
  driverIds: string[],
  dateRange: DriverDateRange
): Promise<Map<string, EnrichedDriver>> {
  if (driverIds.length === 0) return new Map();

  const { targetStart, targetEnd } = dateRange;
  const dateFilter = { gte: targetStart, lt: targetEnd };
  const driverFilter = { in: driverIds };

  // 4 parallel queries instead of 4 nested includes per driver
  const [orderLogs, shifts, talabatSessions, cashRecords] = await Promise.all([
    prisma.orderLog.findMany({
      where: { tenantId, driverId: driverFilter, date: dateFilter },
      select: { driverId: true, orderCount: true, totalAmount: true, cashCollected: true, tips: true },
    }),
    prisma.shift.findMany({
      where: { tenantId, driverId: driverFilter, date: dateFilter },
      select: { driverId: true, actualHoursMinutes: true },
    }),
    prisma.talabatSession.findMany({
      where: { tenantId, driverId: driverFilter, date: dateFilter },
      select: { driverId: true, actualHours: true, plannedHours: true, cashCollected: true, deliveries: true, status: true },
    }),
    prisma.cashRecord.findMany({
      where: { tenantId, driverId: driverFilter, date: dateFilter },
      select: { driverId: true, collectionAmount: true },
    }),
  ]);

  // Group by driverId
  const ordersByDriver = groupBy(orderLogs, (o) => o.driverId);
  const shiftsByDriver = groupBy(shifts, (s) => s.driverId);
  const sessionsByDriver = groupBy(talabatSessions, (s) => s.driverId);
  const cashByDriver = groupBy(cashRecords, (c) => c.driverId);

  const result = new Map<string, EnrichedDriver>();

  for (const driverId of driverIds) {
    const driverOrders = ordersByDriver.get(driverId) || [];
    const driverShifts = shiftsByDriver.get(driverId) || [];
    const driverSessions = sessionsByDriver.get(driverId) || [];
    const driverCash = cashByDriver.get(driverId) || [];

    const orderLogOrders = driverOrders.reduce((sum, o) => sum + o.orderCount, 0);
    const sessionOrders = driverSessions.reduce((sum, s) => sum + (s.deliveries || 0), 0);
    const dailyOrders = orderLogOrders + sessionOrders;

    const totalSales = driverOrders.reduce((sum, o) => {
      if (o.totalAmount) return sum + Number(o.totalAmount);
      const cash = o.cashCollected ? Number(o.cashCollected) : 0;
      const tips = o.tips ? Number(o.tips) : 0;
      return sum + cash + tips;
    }, 0);

    const orderCash = driverOrders.reduce(
      (sum, o) => sum + (o.cashCollected ? Number(o.cashCollected) : 0), 0
    );
    const sessionCash = driverSessions.reduce(
      (sum, s) => sum + Number(s.cashCollected), 0
    );
    const cashCollected = orderCash + sessionCash;

    const shiftHours = driverShifts.reduce(
      (sum, s) => sum + (s.actualHoursMinutes ? s.actualHoursMinutes / 60 : 0), 0
    );
    const sessionHours = driverSessions.reduce(
      (sum, s) => sum + (s.actualHours ? Number(s.actualHours) : 0), 0
    );
    const workingHours = shiftHours + sessionHours;

    const uti = workingHours > 0 ? Math.round((dailyOrders / workingHours) * 100) / 100 : 0;

    const cashDeposited = driverCash.reduce(
      (sum, r) => sum + (r.collectionAmount ? Number(r.collectionAmount) : 0), 0
    );

    // Talabat status resolution
    let talabatStatus: string | undefined;
    if (driverSessions.length > 0) {
      if (driverSessions.some((s: any) => s.status === "ACTIVE")) talabatStatus = "ONLINE";
      else talabatStatus = "OFFLINE";
    }

    result.set(driverId, {
      dailyOrders,
      totalSales: totalSales || null,
      cashCollected: cashCollected || null,
      cashDeposited: cashDeposited || null,
      uti,
      workingHours: workingHours || null,
      talabatStatus,
    });
  }

  return result;
}

/**
 * Resolve talabat-specific status for a driver.
 * RESTRICTED/PERMANENTLY_RESTRICTED take priority,
 * then ONLINE if active session, otherwise OFFLINE.
 */
export function resolveTalabatStatus(
  driverStatus: string,
  platform: string,
  sessionStatus?: string
): string | undefined {
  if (platform !== "TALABAT") return undefined;
  if (driverStatus === "RESTRICTED_PERMANENTLY") return "PERMANENTLY_RESTRICTED";
  if (driverStatus === "RESTRICTED") return "RESTRICTED";
  return sessionStatus || "OFFLINE";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) group.push(item);
    else map.set(key, [item]);
  }
  return map;
}
