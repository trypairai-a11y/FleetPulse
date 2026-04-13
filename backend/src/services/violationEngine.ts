import { prisma } from "../config";
import { Platform, ViolationType, ViolationStatus } from "../generated/prisma";
import { createViolationNotifications, getViolationSeverity } from "./notificationService";
import { publishEvent } from "./eventBus";
import { logger } from "../config/logger";

// ─── Haversine helper ────────────────────────────────────────────
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Dedup helper ────────────────────────────────────────────────
async function violationExistsToday(
  tenantId: string,
  driverId: string,
  type: ViolationType,
  dateKey?: Date,
): Promise<boolean> {
  const windowStart = dateKey ? new Date(dateKey) : new Date();
  windowStart.setHours(0, 0, 0, 0);
  const existing = await prisma.violation.findFirst({
    where: { tenantId, driverId, violationType: type, violationTime: { gte: windowStart } },
  });
  return !!existing;
}

// ─── Core: create violation + alert + notification ───────────────
async function createViolationWithAlert(params: {
  tenantId: string;
  driverId: string;
  platform: Platform;
  violationType: ViolationType;
  violationTime: Date;
  details?: string;
  metadata?: any;
  taskId?: string;
}) {
  const { tenantId, driverId, platform, violationType, violationTime, details, metadata, taskId } = params;

  // Dedup: skip if violation of same type exists today for this driver
  if (await violationExistsToday(tenantId, driverId, violationType, violationTime)) {
    return null;
  }

  const violation = await prisma.violation.create({
    data: {
      tenantId,
      driverId,
      platform,
      violationType,
      violationTime,
      details,
      metadata,
      taskId,
    },
  });

  // Mirror to Alert table for the unified alert feed
  await prisma.alert.create({
    data: {
      tenantId,
      driverId,
      type: `VIOLATION_${violationType}`,
      severity: getViolationSeverity(violationType) as any,
      title: violationType.replace(/_/g, " "),
      message: details || violationType,
      data: { violationId: violation.id, ...(metadata || {}) },
    },
  });

  // Fire notifications to relevant users
  await createViolationNotifications({
    tenantId,
    eventType: violationType,
    severity: getViolationSeverity(violationType),
    title: violationType.replace(/_/g, " "),
    message: details || violationType,
    sourceId: violation.id,
    metadata: { violationId: violation.id, driverId },
  }).catch((e) => logger.error({ err: e }, "violation notification failed"));

  publishEvent({
    type: "violation",
    tenantId,
    payload: { violationId: violation.id, violationType, driverId, details },
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  return violation;
}

// ─── Detectors ───────────────────────────────────────────────────

/**
 * Detect late deliveries from KeetaDailyMetrics.
 * overdueOrders > 0 → ORDER_SLIGHTLY_LATE
 * severelyOverdue > 0 → ORDER_VERY_LATE
 */
export async function detectLateDeliveries(tenantId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const metrics = await prisma.keetaDailyMetrics.findMany({
    where: {
      tenantId,
      date: { gte: today },
      OR: [{ overdueOrders: { gt: 0 } }, { severelyOverdue: { gt: 0 } }],
    },
    include: { driver: { select: { id: true, platform: true } } },
  });

  let created = 0;
  for (const m of metrics) {
    if (m.severelyOverdue > 0) {
      const v = await createViolationWithAlert({
        tenantId,
        driverId: m.driverId,
        platform: m.driver.platform,
        violationType: ViolationType.ORDER_VERY_LATE,
        violationTime: m.date,
        details: `${m.severelyOverdue} severely overdue order(s). Avg delivery: ${m.avgDeliveryMinutes} min`,
        metadata: { severelyOverdue: m.severelyOverdue, avgDeliveryMinutes: Number(m.avgDeliveryMinutes) },
      });
      if (v) created++;
    } else if (m.overdueOrders > 0) {
      const v = await createViolationWithAlert({
        tenantId,
        driverId: m.driverId,
        platform: m.driver.platform,
        violationType: ViolationType.ORDER_SLIGHTLY_LATE,
        violationTime: m.date,
        details: `${m.overdueOrders} overdue order(s). Avg delivery: ${m.avgDeliveryMinutes} min`,
        metadata: { overdueOrders: m.overdueOrders, avgDeliveryMinutes: Number(m.avgDeliveryMinutes) },
      });
      if (v) created++;
    }
  }
  return created;
}

/**
 * Detect order rejection timeouts from KeetaDailyMetrics.rejectedAuto > 0.
 */
export async function detectOrderRejectionTimeouts(tenantId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const metrics = await prisma.keetaDailyMetrics.findMany({
    where: { tenantId, date: { gte: today }, rejectedAuto: { gt: 0 } },
    include: { driver: { select: { id: true, platform: true } } },
  });

  let created = 0;
  for (const m of metrics) {
    const v = await createViolationWithAlert({
      tenantId,
      driverId: m.driverId,
      platform: m.driver.platform,
      violationType: ViolationType.ORDER_REJECTION_TIMEOUT,
      violationTime: m.date,
      details: `${m.rejectedAuto} auto-rejected order(s) due to acceptance timeout`,
      metadata: { rejectedAuto: m.rejectedAuto, rejectedByCourier: m.rejectedByCourier },
    });
    if (v) created++;
  }
  return created;
}

/**
 * Detect GPS not uploading for online Keeta drivers.
 * Checks Device.lastSeen > 15 minutes ago.
 */
export async function detectGpsNotUploading(tenantId: string): Promise<number> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  const staleDevices = await prisma.device.findMany({
    where: {
      driver: { tenantId, platform: "KEETA", status: "ACTIVE" },
      isOnline: true,
      lastSeen: { lt: fifteenMinAgo },
    },
    include: { driver: { select: { id: true, name: true, platform: true } } },
  });

  let created = 0;
  for (const d of staleDevices) {
    if (!d.driver) continue;
    const v = await createViolationWithAlert({
      tenantId,
      driverId: d.driver.id,
      platform: d.driver.platform,
      violationType: ViolationType.GPS_NOT_UPLOADING,
      violationTime: new Date(),
      details: `GPS not uploading since ${d.lastSeen?.toISOString()}. Driver: ${d.driver.name}`,
      metadata: { lastSeen: d.lastSeen?.toISOString(), deviceId: d.id },
    });
    if (v) created++;
  }
  return created;
}

/**
 * Detect drop-off in advance — courier GPS far from customer location.
 * Called per-order when delivery is marked complete (not batch).
 */
export async function detectDropOffInAdvance(params: {
  tenantId: string;
  driverId: string;
  platform: Platform;
  orderId: string;
  driverLat: number;
  driverLng: number;
  customerLat: number;
  customerLng: number;
  thresholdMeters?: number;
}): Promise<boolean> {
  const { tenantId, driverId, platform, orderId, driverLat, driverLng, customerLat, customerLng } = params;
  const threshold = params.thresholdMeters ?? 500;

  const distance = haversineMeters(driverLat, driverLng, customerLat, customerLng);
  if (distance <= threshold) return false;

  await createViolationWithAlert({
    tenantId,
    driverId,
    platform,
    violationType: ViolationType.DROP_OFF_IN_ADVANCE,
    violationTime: new Date(),
    details: `Distance between drop-off and customer: ${distance.toFixed(2)} meters`,
    metadata: { distance, driverLat, driverLng, customerLat, customerLng, orderId },
    taskId: orderId,
  });
  return true;
}

/**
 * Orchestrator: run all batch violation checks for a tenant.
 */
export async function runAllViolationChecks(tenantId: string): Promise<number> {
  let total = 0;
  try {
    total += await detectLateDeliveries(tenantId);
  } catch (e: any) {
    logger.error({ err: e, tenantId }, "detectLateDeliveries failed");
  }
  try {
    total += await detectOrderRejectionTimeouts(tenantId);
  } catch (e: any) {
    logger.error({ err: e, tenantId }, "detectOrderRejectionTimeouts failed");
  }
  try {
    total += await detectGpsNotUploading(tenantId);
  } catch (e: any) {
    logger.error({ err: e, tenantId }, "detectGpsNotUploading failed");
  }
  return total;
}
