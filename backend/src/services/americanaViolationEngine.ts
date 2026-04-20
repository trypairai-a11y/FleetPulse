import { prisma } from "../config";
import { logger } from "../config/logger";
import { ViolationType } from "../generated/prisma";
import { AmericanaDailyRow } from "./americanaDailyParser";

// A6 · Americana internal-violations engine. Runs after each approved daily
// ingestion. Translates HQ feed signals into violation records.
//
// Thresholds live under Tenant.settings.americana:
//   lateArrivalGraceMin (default 15)

interface AmericanaTenantSettings {
  lateArrivalGraceMin?: number;
}

async function loadTenantSettings(tenantId: string): Promise<AmericanaTenantSettings> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
  const s = (tenant?.settings as any)?.americana;
  return {
    lateArrivalGraceMin: typeof s?.lateArrivalGraceMin === "number" ? s.lateArrivalGraceMin : 15,
  };
}

function buildViolationTime(row: AmericanaDailyRow): Date {
  return new Date(row.year, row.month, row.day, 9, 0, 0);
}

/**
 * Scan the approved rows of an ingestion and create violation records for
 * any LATE / NO_SHOW signals. Idempotent: uses (tenantId, driverId, type,
 * violationTime) as a de-dupe key — if a record already exists for that day
 * + type + driver we skip it.
 */
export async function scanIngestionForViolations(ingestionId: string): Promise<number> {
  const ingestion = await prisma.americanaDailyIngestion.findUnique({ where: { id: ingestionId } });
  if (!ingestion) return 0;
  const rows = (ingestion.parsedRows as unknown as AmericanaDailyRow[]) || [];
  if (rows.length === 0) return 0;

  const tenantId = ingestion.tenantId;
  const settings = await loadTenantSettings(tenantId);

  let created = 0;
  for (const row of rows) {
    if (!row.attendanceStatus) continue;
    if (row.attendanceStatus !== "LATE" && row.attendanceStatus !== "NO_SHOW") continue;

    const driver = await prisma.driver.findFirst({
      where: {
        tenantId,
        OR: [{ platformDriverId: row.empId }, { name: { equals: row.driverName, mode: "insensitive" } }],
      },
      select: { id: true },
    });
    if (!driver) continue;

    const type: ViolationType =
      row.attendanceStatus === "LATE" ? "AMERICANA_LATE_ARRIVAL" : "AMERICANA_NO_SHOW";
    const violationTime = buildViolationTime(row);

    const existing = await prisma.violation.findFirst({
      where: {
        tenantId,
        driverId: driver.id,
        violationType: type,
        violationTime,
      },
      select: { id: true },
    });
    if (existing) continue;

    const details = type === "AMERICANA_LATE_ARRIVAL"
      ? `Driver arrived late at ${row.storeName || "store"}${row.checkInAt ? ` (check-in ${row.checkInAt})` : ""}. Grace: ${settings.lateArrivalGraceMin} min.`
      : `Driver did not show up for the shift at ${row.storeName || "store"}.`;

    await prisma.violation.create({
      data: {
        tenantId,
        driverId: driver.id,
        platform: "AMERICANA",
        violationType: type,
        violationTime,
        details,
        metadata: {
          empId: row.empId,
          storeName: row.storeName,
          chain: row.chain,
          checkInAt: row.checkInAt,
          ingestionId,
        } as any,
      },
    });
    created++;
  }

  logger.info({ tenantId, ingestionId, created }, "[americanaViolationEngine] scan done");
  return created;
}

/**
 * Supervisor override. Flips violation status to OVERTURNED and records a
 * reason. The existing Violation model supports this; this helper exists so
 * the route stays thin.
 */
export async function overrideViolation(params: {
  tenantId: string;
  violationId: string;
  reason: string;
  userId: string;
}) {
  const { tenantId, violationId, reason, userId } = params;
  const violation = await prisma.violation.findFirst({
    where: { id: violationId, tenantId },
  });
  if (!violation) throw new Error("Violation not found");
  return prisma.violation.update({
    where: { id: violationId },
    data: {
      violationStatus: "OVERTURNED",
      overrideReason: reason,
      overriddenBy: userId,
      overriddenAt: new Date(),
    },
  });
}
