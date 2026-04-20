import { prisma } from "../config";
import { logger } from "../config/logger";

/**
 * Demand heatmap builder. Extracted from aiInsightsEngine.ts so the heatmap
 * survives when the (stale) insights batch engine is retired in Phase 5.
 *
 * Builds DemandHeatmap rows aggregated by (tenant, platform, zone, dayOfWeek,
 * hour) using OrderLog history over the last 28 days. Used by
 * aiRealtimeInsights for live courier positioning recommendations.
 */

export async function buildDemandHeatmap(tenantId: string): Promise<number> {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const heatmapData = await prisma.$queryRaw<
    Array<{
      zone: string;
      platform: string;
      day_of_week: number;
      hour: number;
      avg_orders: number;
      total_days: number;
      restaurant_name: string | null;
      restaurant_orders: number;
    }>
  >`
    SELECT
      d.zone,
      d.platform::text as platform,
      EXTRACT(DOW FROM ol.date)::int AS day_of_week,
      EXTRACT(HOUR FROM ol.date)::int AS hour,
      AVG(ol."orderCount")::float AS avg_orders,
      COUNT(DISTINCT ol.date::date)::int AS total_days,
      ol."restaurantName" AS restaurant_name,
      SUM(ol."orderCount")::int AS restaurant_orders
    FROM "OrderLog" ol
    JOIN "Driver" d ON d.id = ol."driverId"
    WHERE ol."tenantId" = ${tenantId}
      AND ol.date >= ${fourWeeksAgo}
      AND d.zone IS NOT NULL
    GROUP BY d.zone, d.platform, EXTRACT(DOW FROM ol.date), EXTRACT(HOUR FROM ol.date), ol."restaurantName"
    ORDER BY avg_orders DESC
  `;

  const cells = new Map<string, {
    zone: string;
    platform: string;
    dayOfWeek: number;
    hourSlot: number;
    totalOrders: number;
    totalDays: number;
    restaurants: Map<string, number>;
  }>();

  for (const row of heatmapData) {
    if (!row.zone) continue;
    const key = `${row.zone}|${row.platform}|${row.day_of_week}|${row.hour}`;
    if (!cells.has(key)) {
      cells.set(key, {
        zone: row.zone,
        platform: row.platform,
        dayOfWeek: row.day_of_week,
        hourSlot: row.hour,
        totalOrders: 0,
        totalDays: row.total_days,
        restaurants: new Map(),
      });
    }
    const cell = cells.get(key)!;
    cell.totalOrders += row.avg_orders;
    if (row.restaurant_name) {
      cell.restaurants.set(
        row.restaurant_name,
        (cell.restaurants.get(row.restaurant_name) ?? 0) + (row.restaurant_orders ?? 0)
      );
    }
  }

  for (const [, cell] of cells) {
    const topRestaurants = [...cell.restaurants.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, orders]) => ({ name, avgOrders: orders / Math.max(1, cell.totalDays) }));

    const confidence = Math.min(1, cell.totalDays / 20);

    await prisma.demandHeatmap.upsert({
      where: {
        tenantId_platform_zone_dayOfWeek_hourSlot: {
          tenantId,
          platform: cell.platform,
          zone: cell.zone,
          dayOfWeek: cell.dayOfWeek,
          hourSlot: cell.hourSlot,
        },
      },
      update: { avgOrders: cell.totalOrders, topRestaurants: topRestaurants as any, confidence },
      create: {
        tenantId,
        platform: cell.platform,
        zone: cell.zone,
        dayOfWeek: cell.dayOfWeek,
        hourSlot: cell.hourSlot,
        avgOrders: cell.totalOrders,
        topRestaurants: topRestaurants as any,
        confidence,
      },
    });
  }

  return cells.size;
}

/**
 * Scheduled job: runs at 04:00 Kuwait daily for each active tenant.
 */
export function startDemandHeatmapScheduler() {
  async function tick() {
    try {
      const tenants = await prisma.tenant.findMany({ select: { id: true } });
      for (const { id } of tenants) {
        try {
          const cells = await buildDemandHeatmap(id);
          logger.info({ tenantId: id, cells }, "demandHeatmapJob: built");
        } catch (err) {
          logger.error({ err, tenantId: id }, "demandHeatmapJob: per-tenant failure");
        }
      }
    } catch (err) {
      logger.error({ err }, "demandHeatmapJob: tick failure");
    }
  }

  // Run once at startup, then every 24h. A cron at 04:00 Kuwait would be ideal
  // but keeping this simple in the absence of a cron lib; interval matches
  // legacy insightsScheduler cadence.
  setTimeout(() => void tick(), 30_000);
  setInterval(() => void tick(), 24 * 60 * 60 * 1000);
}
