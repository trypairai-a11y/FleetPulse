import cron from "node-cron";
import { prisma } from "../config";
import { logger } from "../config/logger";

/**
 * F10 — daily shift-compliance check. Runs at 06:00 Asia/Kuwait per tenant config.
 * For each tenant with keeta shifts today, flag drivers scheduled <underShiftHours
 * and create a MEDIUM Notification (OPS_TODO category) with bilingual text.
 */
export async function evaluateShiftCompliance(date: Date = new Date()): Promise<number> {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);

  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  let created = 0;
  for (const { id: tenantId } of tenants) {
    const config = await prisma.shiftComplianceConfig.findUnique({ where: { tenantId } });
    const underHours = config?.underShiftHours ?? 10;

    const shifts = await prisma.shift.findMany({
      where: { tenantId, platform: "KEETA", date: { gte: start, lte: end } },
      select: { driverId: true, scheduledStart: true, scheduledEnd: true, plannedHoursMinutes: true, driver: { select: { name: true, platformDriverId: true } } },
    });
    if (shifts.length === 0) continue;

    const hoursByDriver = new Map<string, { hours: number; name: string; pid: string | null }>();
    for (const s of shifts) {
      const h = (s.plannedHoursMinutes ?? Math.round((s.scheduledEnd.getTime() - s.scheduledStart.getTime()) / 60000)) / 60;
      const existing = hoursByDriver.get(s.driverId);
      if (existing) existing.hours += h;
      else hoursByDriver.set(s.driverId, { hours: h, name: s.driver.name, pid: s.driver.platformDriverId });
    }

    for (const [driverId, info] of hoursByDriver.entries()) {
      if (info.hours >= underHours) continue;
      await prisma.notification.create({
        data: {
          tenantId,
          title: "Under-shift compliance alert",
          titleAr: "تنبيه التزام أقل من الحد الأدنى للورديات",
          message: `${info.name} (${info.pid ?? "—"}) has scheduled only ${info.hours.toFixed(1)}h today, below ${underHours}h threshold.`,
          bodyAr: `السائق ${info.name} مجدول ${info.hours.toFixed(1)} ساعة فقط اليوم، وهذا أقل من الحد ${underHours} ساعة.`,
          type: "SHIFT_COMPLIANCE",
          severity: "MEDIUM",
          category: "OPS_TODO",
          sourceId: driverId,
          metadata: { driverId, hoursScheduled: info.hours, threshold: underHours, date: start.toISOString() },
        },
      });
      created += 1;
    }
  }
  logger.info({ created, date: start.toISOString() }, "shiftComplianceWorker: evaluation complete");
  return created;
}

let running = false;
export function startShiftComplianceScheduler() {
  if (running) return;
  // Cron fixed at 06:00 daily (Asia/Kuwait). Per-tenant cron override TBD.
  cron.schedule("0 6 * * *", () => {
    evaluateShiftCompliance().catch((e) => logger.error({ err: e }, "shiftComplianceWorker failed"));
  }, { timezone: "Asia/Kuwait" });
  running = true;
  logger.info("shiftComplianceScheduler started (06:00 Asia/Kuwait)");
}
