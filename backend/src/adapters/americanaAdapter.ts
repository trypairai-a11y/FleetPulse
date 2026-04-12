import { prisma } from "../config";
import { Platform } from "../generated/prisma";
import { DriverSummary, PlatformAdapter } from "./PlatformAdapter";

export const americanaAdapter: PlatformAdapter = {
  platform: "AMERICANA" as Platform,

  async getDriverSummary(tenantId, _opts): Promise<DriverSummary> {
    const allDrivers = await prisma.americanaDailyOrders.findMany({
      where: { tenantId },
      select: { driverId: true },
      distinct: ["driverId"],
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setDate(startOfMonth.getDate() - 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    endOfMonth.setDate(endOfMonth.getDate() + 1);

    const [activeDrivers, monthAgg] = await Promise.all([
      prisma.americanaDailyOrders.findMany({
        where: { tenantId, month: { gte: startOfMonth, lt: endOfMonth } },
        select: { driverId: true },
        distinct: ["driverId"],
      }),
      prisma.americanaDailyOrders.aggregate({
        where: { tenantId, month: { gte: startOfMonth, lt: endOfMonth } },
        _sum: { totalOrders: true },
      }),
    ]);

    const activeCount = activeDrivers.length;
    const totalOrdersThisMonth = monthAgg._sum.totalOrders || 0;
    const dayOfMonth = Math.max(1, now.getDate());
    const avgOrdersPerDay =
      activeCount > 0
        ? Math.round((totalOrdersThisMonth / activeCount / dayOfMonth) * 10) / 10
        : 0;

    return {
      totalDrivers: allDrivers.length,
      activeDrivers: activeCount,
      avgDeliveriesPerDay: avgOrdersPerDay,
    };
  },
};
