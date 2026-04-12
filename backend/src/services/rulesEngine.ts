import { prisma } from "../config";
import { AlertSeverity, ViolationEventType } from "../generated/prisma";
import { createViolationNotifications, getViolationSeverity } from "./notificationService";
import { publishEvent } from "./eventBus";

/**
 * Helper: upsert an alert idempotently using (tenantId, driverId, type, date).
 * Returns { alert, created } where created=false means a duplicate was skipped.
 */
async function upsertAlert(params: {
  tenantId: string;
  driverId?: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  data?: any;
  dateKey?: Date; // date used for deduplication window (defaults to today)
}) {
  const { tenantId, driverId, type, severity, title, message, data, dateKey } = params;
  const windowStart = dateKey ? new Date(dateKey) : new Date();
  windowStart.setHours(0, 0, 0, 0);

  const existing = await prisma.alert.findFirst({
    where: {
      tenantId,
      ...(driverId ? { driverId } : {}),
      type,
      status: "ACTIVE",
      createdAt: { gte: windowStart },
    },
  });
  if (existing) return { alert: existing, created: false };

  const alert = await prisma.alert.create({
    data: { tenantId, type, severity: severity as AlertSeverity, title, message, driverId, data },
  });

  publishEvent({
    type: "alert",
    tenantId,
    payload: { alertId: alert.id, alertType: type, severity, title, message, driverId },
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  return { alert, created: true };
}

/**
 * Helper: upsert a TalabatViolationEvent idempotently using (tenantId, driverId, type, date).
 */
async function upsertViolationEvent(params: {
  tenantId: string;
  driverId: string;
  type: string;
  description: string;
  metadata?: any;
  sessionId?: string;
  dateKey?: Date;
}) {
  const { tenantId, driverId, type, description, metadata, sessionId, dateKey } = params;
  const windowStart = dateKey ? new Date(dateKey) : new Date();
  windowStart.setHours(0, 0, 0, 0);

  const existing = await prisma.talabatViolationEvent.findFirst({
    where: { tenantId, driverId, type: type as ViolationEventType, createdAt: { gte: windowStart } },
  });
  if (existing) return { event: existing, created: false };

  const event = await prisma.talabatViolationEvent.create({
    data: { tenantId, driverId, type: type as ViolationEventType, description, metadata, ...(sessionId ? { sessionId } : {}) },
  });

  // Mirror to Alert table for unified feed (Task 13: bridge violations to alerts)
  await prisma.alert.create({
    data: {
      tenantId,
      driverId,
      type: `VIOLATION_${type}`,
      severity: getViolationSeverity(type) as AlertSeverity,
      title: type.replace(/_/g, " "),
      message: description,
      data: { violationEventId: event.id, ...(metadata || {}) },
    },
  });

  publishEvent({
    type: "violation",
    tenantId,
    payload: { eventId: event.id, violationType: type, driverId, description },
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  return { event, created: true };
}

/**
 * Load platform settings for all platforms that have rules configured.
 * Falls back to defaults if no settings exist.
 */
async function getSettingsForTenant(tenantId: string) {
  const allSettings = await prisma.platformSettings.findMany({ where: { tenantId } });
  const settingsMap = new Map(allSettings.map((s) => [s.platform as string, s]));
  return settingsMap;
}

function getCashRules(settings: any) {
  const cashRules = (settings?.cashRules as any) || {};
  return {
    maxCashHoldKD: cashRules.maxCashHoldKD ?? 50,
    overdueDays: cashRules.overdueDays ?? 3,
  };
}

function getShiftRules(settings: any) {
  const shiftRules = (settings?.shiftRules as any) || {};
  return {
    maxLateMinutes: shiftRules.maxLateMinutes ?? 1,
    maxCashHoldKD: shiftRules.maxCashHoldKD ?? 50,
  };
}

function getDocumentRules(settings: any) {
  const docRules = (settings?.documentRules as any) || {};
  return {
    autoSuspendOnExpiry: docRules.autoSuspendOnExpiry ?? true,
    blockShiftBookingOnExpiry: docRules.blockShiftBookingOnExpiry ?? true,
    requiredDocuments: (docRules.requiredDocuments as any[]) ?? [
      { key: "healthCert", label: "Health Certificate", required: true, expiryWarningDays: 30 },
      { key: "workPermit", label: "Work Permit", required: true, expiryWarningDays: 60 },
      { key: "foodHandlingCert", label: "Food Handling Certificate", required: true, expiryWarningDays: 30 },
      { key: "vehicleReg", label: "Vehicle Registration", required: true, expiryWarningDays: 30 },
      { key: "vehicleInsurance", label: "Vehicle Insurance", required: true, expiryWarningDays: 45 },
      { key: "drivingLicense", label: "Driving License", required: true, expiryWarningDays: 60 },
      { key: "civilId", label: "Civil ID", required: true, expiryWarningDays: 90 },
    ],
  };
}

/**
 * Detect drivers with cash pending dues exceeding maxCashHoldKD for more than overdueDays.
 * Reads thresholds from PlatformSettings instead of hardcoding.
 */
export async function detectCashOverdue(tenantId: string) {
  const settingsMap = await getSettingsForTenant(tenantId);

  // Get unique platforms to check
  const platforms = ["TALABAT", "KEETA", "DELIVEROO", "AMERICANA"];
  let created = 0;
  let checked = 0;

  for (const platform of platforms) {
    const platformSettings = settingsMap.get(platform);
    const { maxCashHoldKD, overdueDays } = getCashRules(platformSettings);
    const cutoffDate = new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000);

    const overdueLedgers = await prisma.pendingDuesLedger.findMany({
      where: {
        tenantId,
        status: "OPEN",
        closingBalance: { gt: maxCashHoldKD },
        driver: { platform: platform as any },
      },
      include: { driver: { select: { id: true, name: true } } },
    });
    checked += overdueLedgers.length;

    for (const ledger of overdueLedgers) {
      const lastCollection = await prisma.cashRecord.findFirst({
        where: { tenantId, driverId: ledger.driverId, status: "SETTLED" },
        orderBy: { date: "desc" },
      });

      const isOverdue = !lastCollection || lastCollection.date < cutoffDate;
      if (!isOverdue) continue;

      const alertMsg = `${ledger.driver.name} has KD ${Number(ledger.closingBalance).toFixed(3)} pending dues with no deposit in ${overdueDays}+ days`;
      const { alert, created: wasCreated } = await upsertAlert({
        tenantId,
        driverId: ledger.driverId,
        type: "cash_overdue",
        severity: "HIGH",
        title: "Cash Deposit Overdue",
        message: alertMsg,
        data: { pendingDues: Number(ledger.closingBalance), ledgerId: ledger.id },
      });

      if (wasCreated) {
        await createViolationNotifications({
          tenantId,
          eventType: "cash_overdue",
          severity: "HIGH",
          title: "Cash Deposit Overdue",
          message: alertMsg,
          sourceId: alert.id,
          metadata: { driverName: ledger.driver.name },
        });
        created++;
      }
    }
  }

  return { checked, alertsCreated: created };
}

/**
 * Detect Talabat shifts scheduled for today that have no matching session.
 */
export async function detectIncompleteShifts(tenantId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const bookedShifts = await prisma.shift.findMany({
    where: {
      tenantId,
      platform: "TALABAT",
      date: { gte: startOfDay, lt: endOfDay },
      scheduledStart: { lt: now },
      status: { in: ["BOOKED", "MISSED"] },
    },
    include: {
      driver: { select: { id: true, name: true } },
      talabatSessions: { select: { id: true } },
    },
  });

  let created = 0;
  for (const shift of bookedShifts) {
    if (shift.talabatSessions.length > 0) continue;

    const shiftDesc = `${shift.driver.name} did not start their scheduled ${shift.zone || ""} session`;
    const { event, created: wasCreated } = await upsertViolationEvent({
      tenantId,
      driverId: shift.driverId,
      type: "SHIFT_NOT_BOOKED",
      description: shiftDesc,
      metadata: { shiftId: shift.id, scheduledStart: shift.scheduledStart },
    });

    if (wasCreated) {
      await createViolationNotifications({
        tenantId,
        eventType: "SHIFT_NOT_BOOKED",
        severity: getViolationSeverity("SHIFT_NOT_BOOKED"),
        title: "Shift Not Booked",
        message: shiftDesc,
        sourceId: event.id,
        metadata: { driverName: shift.driver.name },
      });
      created++;
    }
  }

  return { checked: bookedShifts.length, eventsCreated: created };
}

/**
 * Talabat shift booking reminder - check which drivers have no shifts for the coming week.
 */
export async function detectShiftBookingReminder(tenantId: string) {
  const now = new Date();
  const nextWeekStart = new Date(now);
  nextWeekStart.setDate(now.getDate() + (7 - now.getDay()) % 7 + 1);
  nextWeekStart.setHours(0, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const talabatDrivers = await prisma.driver.findMany({
    where: { tenantId, platform: "TALABAT", status: "ACTIVE" },
    select: { id: true, name: true },
  });

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
  const weekWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  for (const driver of unbookedDrivers) {
    const bookingMsg = `${driver.name} has not booked any shifts for next week`;
    const { alert, created: wasCreated } = await upsertAlert({
      tenantId,
      driverId: driver.id,
      type: "shift_not_booked",
      severity: "HIGH",
      title: "Shift Not Booked",
      message: bookingMsg,
      dateKey: weekWindowStart,
    });
    if (wasCreated) {
      await createViolationNotifications({
        tenantId,
        eventType: "shift_not_booked",
        severity: "HIGH",
        title: "Shift Not Booked",
        message: bookingMsg,
        sourceId: alert.id,
        metadata: { driverName: driver.name },
      });
      created++;
    }
  }

  return { totalDrivers: talabatDrivers.length, unbooked: unbookedDrivers.length, alertsCreated: created };
}

/**
 * Detect sessions where cashCollected exceeds the platform's configured maxCashHoldKD.
 * Reads threshold from PlatformSettings.
 */
export async function detectCashThresholdExceeded(tenantId: string) {
  const settingsMap = await getSettingsForTenant(tenantId);
  const talabatSettings = settingsMap.get("TALABAT");
  const { maxCashHoldKD } = getCashRules(talabatSettings);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sessions = await prisma.talabatSession.findMany({
    where: {
      tenantId,
      date: { gte: startOfDay },
      cashCollected: { gt: maxCashHoldKD },
    },
    include: { driver: { select: { id: true, name: true } } },
  });

  let created = 0;
  for (const session of sessions) {
    const cashDesc = `Cash collected reached KD ${Number(session.cashCollected).toFixed(3)} - exceeds ${maxCashHoldKD} KD threshold`;
    const { event, created: wasCreated } = await upsertViolationEvent({
      tenantId,
      driverId: session.driverId,
      sessionId: session.id,
      type: "CASH_THRESHOLD_EXCEEDED",
      description: cashDesc,
      metadata: { cashCollected: Number(session.cashCollected), threshold: maxCashHoldKD },
    });

    if (wasCreated) {
      await createViolationNotifications({
        tenantId,
        eventType: "CASH_THRESHOLD_EXCEEDED",
        severity: "CRITICAL",
        title: "Cash Threshold Exceeded",
        message: `${session.driver.name}: ${cashDesc}`,
        sourceId: event.id,
        metadata: { driverName: session.driver.name, cashCollected: Number(session.cashCollected) },
      });
      created++;
    }
  }

  return { checked: sessions.length, eventsCreated: created };
}

/**
 * Detect late clock-ins using the per-platform maxLateMinutes threshold.
 */
export async function detectLateClockIns(tenantId: string) {
  const settingsMap = await getSettingsForTenant(tenantId);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const shifts = await prisma.shift.findMany({
    where: {
      tenantId,
      date: { gte: startOfDay, lt: endOfDay },
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
      actualStart: { not: null },
    },
    include: { driver: { select: { id: true, name: true, platform: true } } },
  });

  let flagged = 0;
  for (const shift of shifts) {
    if (!shift.actualStart || !shift.scheduledStart) continue;

    const platformSettings = settingsMap.get(shift.driver.platform as string);
    const { maxLateMinutes } = getShiftRules(platformSettings);

    const lateMs = shift.actualStart.getTime() - shift.scheduledStart.getTime();
    const lateMinutes = Math.floor(lateMs / 60000);
    if (lateMinutes < maxLateMinutes) continue;

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        tenantId,
        driverId: shift.driverId,
        date: { gte: startOfDay, lt: endOfDay },
      },
    });
    if (existing) continue;

    await prisma.attendanceRecord.create({
      data: {
        tenantId,
        driverId: shift.driverId,
        shiftId: shift.id,
        date: startOfDay,
        status: "LATE",
        lateMinutes,
        source: "SYSTEM",
      },
    });
    flagged++;
  }

  return { checked: shifts.length, flagged };
}

/**
 * Detect drivers with expired documents and suspend them if autoSuspendOnExpiry is enabled.
 * Also creates alerts for drivers with documents expiring within the warning window.
 */
export async function detectExpiredDocuments(tenantId: string) {
  const settingsMap = await getSettingsForTenant(tenantId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const drivers = await prisma.driver.findMany({
    where: { tenantId, status: { in: ["ACTIVE", "INACTIVE"] } },
    select: {
      id: true, name: true, platform: true,
      healthCertExpiry: true, workPermitExpiry: true, foodHandlingCertExpiry: true,
      vehicleRegExpiry: true, vehicleInsuranceExpiry: true, drivingLicenseExpiry: true,
      civilIdExpiry: true,
    },
  });

  const docFields: Array<{ key: keyof typeof drivers[0]; label: string }> = [
    { key: "healthCertExpiry", label: "Health Certificate" },
    { key: "workPermitExpiry", label: "Work Permit" },
    { key: "foodHandlingCertExpiry", label: "Food Handling Certificate" },
    { key: "vehicleRegExpiry", label: "Vehicle Registration" },
    { key: "vehicleInsuranceExpiry", label: "Vehicle Insurance" },
    { key: "drivingLicenseExpiry", label: "Driving License" },
    { key: "civilIdExpiry", label: "Civil ID" },
  ];

  let expiredCount = 0;
  let expiringCount = 0;
  let suspendedCount = 0;

  for (const driver of drivers) {
    const platformSettings = settingsMap.get(driver.platform as string);
    const docRules = getDocumentRules(platformSettings);

    for (const doc of docFields) {
      const expiry = driver[doc.key] as Date | null;
      if (!expiry) continue;

      const expiryDate = new Date(expiry);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / 86400000);

      // Find the configured warning days for this document
      const docRule = docRules.requiredDocuments.find((r: any) => {
        const keyMap: Record<string, string> = {
          healthCertExpiry: "healthCert",
          workPermitExpiry: "workPermit",
          foodHandlingCertExpiry: "foodHandlingCert",
          vehicleRegExpiry: "vehicleReg",
          vehicleInsuranceExpiry: "vehicleInsurance",
          drivingLicenseExpiry: "drivingLicense",
          civilIdExpiry: "civilId",
        };
        return r.key === keyMap[doc.key as string];
      });
      const warningDays = docRule?.expiryWarningDays ?? 30;

      if (daysUntilExpiry < 0) {
        // Document is expired
        expiredCount++;
        const { created: wasCreated } = await upsertAlert({
          tenantId,
          driverId: driver.id,
          type: `doc_expired_${doc.key}`,
          severity: "HIGH",
          title: `${doc.label} Expired`,
          message: `${driver.name}'s ${doc.label} expired ${Math.abs(daysUntilExpiry)} day(s) ago`,
          data: { docType: doc.key, expiryDate: expiryDate.toISOString(), daysOverdue: Math.abs(daysUntilExpiry) },
        });

        if (wasCreated) {
          await createViolationNotifications({
            tenantId,
            eventType: "doc_expired",
            severity: "HIGH",
            title: `${doc.label} Expired`,
            message: `${driver.name}'s ${doc.label} expired ${Math.abs(daysUntilExpiry)} day(s) ago`,
            metadata: { driverName: driver.name, docType: doc.key },
          });
        }

        // Auto-suspend if configured
        if (docRules.autoSuspendOnExpiry) {
          await prisma.driver.update({
            where: { id: driver.id },
            data: { status: "SUSPENDED" },
          });
          suspendedCount++;

          await upsertAlert({
            tenantId,
            driverId: driver.id,
            type: "driver_suspended_doc_expired",
            severity: "CRITICAL",
            title: "Driver Auto-Suspended",
            message: `${driver.name} was automatically suspended due to expired ${doc.label}`,
            data: { docType: doc.key, expiryDate: expiryDate.toISOString() },
          });
        }
      } else if (daysUntilExpiry <= warningDays) {
        // Document expiring soon
        expiringCount++;
        const { created: wasCreated } = await upsertAlert({
          tenantId,
          driverId: driver.id,
          type: `doc_expiring_${doc.key}`,
          severity: daysUntilExpiry <= 7 ? "HIGH" : "MEDIUM",
          title: `${doc.label} Expiring Soon`,
          message: `${driver.name}'s ${doc.label} expires in ${daysUntilExpiry} day(s)`,
          data: { docType: doc.key, expiryDate: expiryDate.toISOString(), daysUntilExpiry },
        });

        if (wasCreated) {
          await createViolationNotifications({
            tenantId,
            eventType: "doc_expiring",
            severity: daysUntilExpiry <= 7 ? "HIGH" : "MEDIUM",
            title: `${doc.label} Expiring Soon`,
            message: `${driver.name}'s ${doc.label} expires in ${daysUntilExpiry} day(s)`,
            metadata: { driverName: driver.name, docType: doc.key, daysUntilExpiry },
          });
        }
      }
    }
  }

  return { driversChecked: drivers.length, expiredCount, expiringCount, suspendedCount };
}

/**
 * Run all rule checks for a tenant.
 */
export async function runAllRules(tenantId: string) {
  const [cashResult, shiftResult, bookingResult, cashThresholdResult, lateResult, docResult] = await Promise.all([
    detectCashOverdue(tenantId),
    detectIncompleteShifts(tenantId),
    detectShiftBookingReminder(tenantId),
    detectCashThresholdExceeded(tenantId),
    detectLateClockIns(tenantId),
    detectExpiredDocuments(tenantId),
  ]);

  return {
    cashOverdue: cashResult,
    incompleteShifts: shiftResult,
    bookingReminder: bookingResult,
    cashThresholdExceeded: cashThresholdResult,
    lateClockIns: lateResult,
    expiredDocuments: docResult,
    timestamp: new Date().toISOString(),
  };
}
