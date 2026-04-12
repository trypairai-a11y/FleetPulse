import { prisma } from "../config";
import { Platform } from "../generated/prisma";
import { DriverSummary, PlatformAdapter } from "./PlatformAdapter";

export const talabatAdapter: PlatformAdapter = {
  platform: "TALABAT" as Platform,

  async getDriverSummary(tenantId, _opts): Promise<DriverSummary> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [activeDrivers, weekSessions, todayAgg] = await Promise.all([
      prisma.talabatSession.findMany({
        where: { tenantId, date: { gte: sevenDaysAgo } },
        select: { driverId: true },
        distinct: ["driverId"],
      }),
      prisma.talabatSession.count({
        where: { tenantId, date: { gte: sevenDaysAgo } },
      }),
      prisma.talabatSession.aggregate({
        where: { tenantId, date: { gte: startOfToday, lte: endOfToday } },
        _sum: { deliveries: true },
      }),
    ]);

    const activeDriverCount = activeDrivers.length;
    const avgSessionsPerWeekPerDriver =
      activeDriverCount > 0 ? Math.round((weekSessions / activeDriverCount) * 10) / 10 : 0;
    const avgDeliveriesPerDay =
      activeDriverCount > 0
        ? Math.round(((todayAgg._sum.deliveries || 0) / activeDriverCount) * 10) / 10
        : 0;

    return {
      activeDrivers: activeDriverCount,
      avgDeliveriesPerDay,
      extra: { avgSessionsPerWeekPerDriver },
    };
  },
};
