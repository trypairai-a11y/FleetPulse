import { prisma } from "../config";

export class DriverRestrictedError extends Error {
  statusCode = 403;
  constructor(public driverId: string, public reason?: string) {
    super(`Driver ${driverId} is restricted${reason ? `: ${reason}` : ""}`);
  }
}

export async function assertDriverNotRestricted(
  tenantId: string,
  driverId: string
): Promise<void> {
  if (!driverId) return;

  const driver = await prisma.driver.findFirst({
    where: { id: driverId, tenantId },
    select: { id: true, status: true },
  });
  if (!driver) return;

  if (
    driver.status === "RESTRICTED" ||
    driver.status === "RESTRICTED_PERMANENTLY" ||
    driver.status === "SUSPENDED" ||
    driver.status === "TERMINATED" ||
    driver.status === "TERMINATION"
  ) {
    throw new DriverRestrictedError(driverId, `status=${driver.status}`);
  }

  const now = new Date();
  const active = await prisma.driverRestriction.findFirst({
    where: {
      tenantId,
      driverId,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    select: { id: true, reason: true, type: true },
  });
  if (active) {
    throw new DriverRestrictedError(driverId, active.reason || active.type);
  }
}
