import { prisma } from "../config";
import { Platform } from "../generated/prisma";
import { DriverSummary, PlatformAdapter } from "./PlatformAdapter";

export const deliverooAdapter: PlatformAdapter = {
  platform: "DELIVEROO" as Platform,

  async getDriverSummary(tenantId, opts): Promise<DriverSummary> {
    const where: any = { tenantId, platform: "DELIVEROO" };
    if (opts?.companyId) where.companyId = opts.companyId;

    const [total, active, inactive, suspended] = await Promise.all([
      prisma.driver.count({ where }),
      prisma.driver.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "INACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "SUSPENDED" } }),
    ]);

    return {
      totalDrivers: total,
      activeDrivers: active,
      inactiveDrivers: inactive,
      suspendedDrivers: suspended,
    };
  },
};
