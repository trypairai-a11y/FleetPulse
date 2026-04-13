import { prisma } from "../config";
import { createViolationNotifications, getViolationSeverity } from "./notificationService";
import { logger } from "../config/logger";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const GPS_STALE_THRESHOLD_MS = 15 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

async function checkGpsUploads(tenantId: string): Promise<number> {
  const fifteenMinAgo = new Date(Date.now() - GPS_STALE_THRESHOLD_MS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find online Keeta drivers with stale GPS
  const staleDevices = await prisma.device.findMany({
    where: {
      driver: { tenantId, platform: "KEETA", status: "ACTIVE" },
      isOnline: true,
      lastSeen: { lt: fifteenMinAgo },
    },
    select: {
      id: true,
      lastSeen: true,
      driver: { select: { id: true, name: true, platformDriverId: true } },
    },
  });

  if (staleDevices.length === 0) return 0;

  let created = 0;
  for (const device of staleDevices) {
    if (!device.driver) continue;

    // Dedup: check if GPS notification exists today for this driver
    const existing = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "GPS_NOT_UPLOADING",
        sourceId: device.driver.id,
        createdAt: { gte: today },
      },
    });
    if (existing) continue;

    const driverName = device.driver.name;
    const platformId = device.driver.platformDriverId || device.driver.id;

    await createViolationNotifications({
      tenantId,
      eventType: "GPS_NOT_UPLOADING",
      severity: getViolationSeverity("GPS_NOT_UPLOADING"),
      title: "Not uploading GPS notification",
      message: `The system detects that your rider ${platformId} ${driverName} has not uploaded the GPS location for a long time. Please check.`,
      sourceId: device.driver.id,
      metadata: {
        category: "IMPORTANT",
        titleAr: "إشعار عدم تحميل GPS",
        bodyAr: `يكتشف النظام أن السائق ${platformId} ${driverName} لم يقم بتحميل موقع GPS لفترة طويلة. يرجى التحقق.`,
        driverName,
        deviceId: device.id,
        lastSeen: device.lastSeen?.toISOString(),
      },
    }).catch((e) => logger.error({ err: e }, "GPS monitor notification failed"));

    created++;
  }

  return created;
}

async function runGpsPass() {
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const t of tenants) {
      try {
        const count = await checkGpsUploads(t.id);
        if (count > 0) {
          console.log(`[gpsMonitor] tenant=${t.id} created ${count} GPS alerts`);
        }
      } catch (err: any) {
        console.error(`[gpsMonitor] tenant=${t.id} failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error(`[gpsMonitor] outer failure: ${err.message}`);
  }
}

/**
 * Start the GPS monitor scheduler (every 5 minutes).
 * First run delayed 90s after boot so migrations/seed finish first.
 */
export function startGpsMonitorScheduler() {
  if (timer) return;
  if (process.env.DISABLE_GPS_MONITOR === "1") return;

  setTimeout(runGpsPass, 90_000);
  timer = setInterval(runGpsPass, FIVE_MINUTES_MS);
  console.log("[gpsMonitor] started (5m interval)");
}

export function stopGpsMonitorScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
