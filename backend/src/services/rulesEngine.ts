import { prisma } from "../config";

/**
 * Detect drivers with cash pending dues > 50 KWD for more than 3 days.
 * Creates Alert records for new violations.
 */
export async function detectCashOverdue(tenantId: string) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const overdueLedgers = await prisma.pendingDuesLedger.findMany({
    where: {
      tenantId,
      status: "OPEN",
      closingBalance: { gt: 50 },
    },
    include: { driver: { select: { id: true, name: true } } },
  });

  let created = 0;
  for (const ledger of overdueLedgers) {
    // Check if last collection was > 3 days ago
    const lastCollection = await prisma.cashRecord.findFirst({
      where: {
        tenantId,
        driverId: ledger.driverId,
        status: "SETTLED",
      },
      orderBy: { date: "desc" },
    });

    const isOverdue = !lastCollection || lastCollection.date < threeDaysAgo;
    if (!isOverdue) continue;

    // Check if alert already exists for this driver (avoid duplicates)
    const existing = await prisma.alert.findFirst({
      where: {
        tenantId,
        driverId: ledger.driverId,
        type: "cash_overdue",
        status: "ACTIVE",
      },
    });
    if (existing) continue;

    await prisma.alert.create({
      data: {
        tenantId,
        type: "cash_overdue",
        severity: "HIGH",
        title: "Cash Deposit Overdue",
        message: `${ledger.driver.name} has KWD ${Number(ledger.closingBalance).toFixed(3)} pending dues with no deposit in 3+ days`,
        driverId: ledger.driverId,
        data: { pendingDues: Number(ledger.closingBalance), ledgerId: ledger.id },
      },
    });
    created++;
  }

  return { checked: overdueLedgers.length, alertsCreated: created };
}

/**
 * Detect Talabat shifts scheduled for today that have no matching session.
 * Creates ComplianceEvents for drivers who missed their shift.
 */
export async function detectIncompleteShifts(tenantId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Find Talabat shifts that were scheduled but have no session
  const bookedShifts = await prisma.shift.findMany({
    where: {
      tenantId,
      platform: "TALABAT",
      date: { gte: startOfDay, lt: endOfDay },
      scheduledStart: { lt: now }, // Only check shifts that should have started
      status: { in: ["BOOKED", "MISSED"] },
    },
    include: {
      driver: { select: { id: true, name: true } },
      talabatSessions: { select: { id: true } },
    },
  });

  let created = 0;
  for (const shift of bookedShifts) {
    if (shift.talabatSessions.length > 0) continue; // Has sessions, skip

    // Check if event already exists
    const existing = await prisma.talabatComplianceEvent.findFirst({
      where: {
        tenantId,
        driverId: shift.driverId,
        type: "SHIFT_NOT_BOOKED",
        createdAt: { gte: startOfDay },
      },
    });
    if (existing) continue;

    await prisma.talabatComplianceEvent.create({
      data: {
        tenantId,
        driverId: shift.driverId,
        type: "SHIFT_NOT_BOOKED",
        severity: "HIGH",
        description: `${shift.driver.name} did not start their scheduled ${shift.zone || ""} session`,
        metadata: { shiftId: shift.id, scheduledStart: shift.scheduledStart },
      },
    });
    created++;
  }

  return { checked: bookedShifts.length, eventsCreated: created };
}

/**
 * Talabat shift booking reminder — Tuesday 8-11 AM window.
 * Check which Talabat drivers have no booked shifts for the coming week.
 */
export async function detectShiftBookingReminder(tenantId: string) {
  const now = new Date();
  const nextWeekStart = new Date(now);
  nextWeekStart.setDate(now.getDate() + (7 - now.getDay()) % 7 + 1); // Next Sunday
  nextWeekStart.setHours(0, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  // Get all active Talabat drivers
  const talabatDrivers = await prisma.driver.findMany({
    where: { tenantId, platform: "TALABAT", status: "ACTIVE" },
    select: { id: true, name: true },
  });

  // Find drivers who have booked shifts for next week
  const driversWithShifts = await prisma.shift.findMany({
    where: {
      tenantId,
      platform: "TALABAT",
      date: { gte: nextWeekStart, lt: nextWeekEnd },
      status: { in: ["BOOKED", "IN_PROGRESS", "COMPLETED"] },
    },
    select: { driverId: true },
    distinct: ["driverId"],
  });

  const bookedDriverIds = new Set(driversWithShifts.map(s => s.driverId));
  const unbookedDrivers = talabatDrivers.filter(d => !bookedDriverIds.has(d.id));

  let created = 0;
  for (const driver of unbookedDrivers) {
    const existing = await prisma.alert.findFirst({
      where: {
        tenantId,
        driverId: driver.id,
        type: "shift_not_booked",
        status: "ACTIVE",
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) continue;

    await prisma.alert.create({
      data: {
        tenantId,
        type: "shift_not_booked",
        severity: "HIGH",
        title: "Shift Not Booked",
        message: `${driver.name} has not booked any shifts for next week`,
        driverId: driver.id,
      },
    });
    created++;
  }

  return { totalDrivers: talabatDrivers.length, unbooked: unbookedDrivers.length, alertsCreated: created };
}

/**
 * Run all rule checks for a tenant.
 */
export async function runAllRules(tenantId: string) {
  const [cashResult, shiftResult, bookingResult] = await Promise.all([
    detectCashOverdue(tenantId),
    detectIncompleteShifts(tenantId),
    detectShiftBookingReminder(tenantId),
  ]);

  return {
    cashOverdue: cashResult,
    incompleteShifts: shiftResult,
    bookingReminder: bookingResult,
    timestamp: new Date().toISOString(),
  };
}
