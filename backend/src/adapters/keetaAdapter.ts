import { prisma } from "../config";
import { Platform } from "../generated/prisma";
import { DriverSummary, PlatformAdapter } from "./PlatformAdapter";

export const keetaAdapter: PlatformAdapter = {
  platform: "KEETA" as Platform,

  async getDriverSummary(tenantId, _opts): Promise<DriverSummary> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [activeDrivers, totalDrivers, recentMetrics, validDayCount] = await Promise.all([
      prisma.keetaDailyMetrics.findMany({
        where: { tenantId, date: { gte: sevenDaysAgo } },
        select: { driverId: true },
        distinct: ["driverId"],
      }),
      prisma.driver.count({ where: { tenantId, platform: "KEETA" } }),
      prisma.keetaDailyMetrics.aggregate({
        where: { tenantId, date: { gte: sevenDaysAgo } },
        _sum: { deliveredTasks: true },
        _count: { id: true },
      }),
      prisma.keetaDailyMetrics.count({
        where: { tenantId, date: { gte: sevenDaysAgo }, validDay: true },
      }),
    ]);

    const activeDriverCount = activeDrivers.length;
    const totalRecords = recentMetrics._count.id || 0;
    const avgDeliveriesPerDay =
      activeDriverCount > 0
        ? Math.round(((recentMetrics._sum.deliveredTasks || 0) / activeDriverCount / 7) * 10) / 10
        : 0;
    const avgValidDayRate =
      totalRecords > 0 ? Math.round((validDayCount / totalRecords) * 1000) / 10 : 0;

    return {
      totalDrivers,
      activeDrivers: activeDriverCount,
      avgDeliveriesPerDay,
      extra: { avgValidDayRate },
    };
  },
};
