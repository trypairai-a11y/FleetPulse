import { prisma } from "../config";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RestaurantRecommendation {
  name: string;
  avgOrders: number;
  distance?: string;
  lat?: number;
  lng?: number;
}

interface IdleDriverResponse {
  recommendation: string;
  restaurant: RestaurantRecommendation & { distance: string };
  confidence: number;
  reasoning: string;
  alternatives: RestaurantRecommendation[];
}

interface ZoneCapacityItem {
  zone: string;
  activeDrivers: number;
  expectedDemand: number;
  status: "understaffed" | "optimal" | "overstaffed";
  recommendation: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Service ────────────────────────────────────────────────────────────────

export class AiRealtimeInsights {
  /**
   * Given an idle driver's current GPS position, recommend the best restaurant
   * to position near based on historical demand patterns from DemandHeatmap.
   */
  static async getIdleDriverRecommendation(
    tenantId: string,
    driverId: string,
    lat: number,
    lng: number,
    platform: string
  ): Promise<IdleDriverResponse> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const hourSlot = now.getHours();

    // Get the driver's zone
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { zone: true, name: true },
    });

    // Fetch heatmap data for current time slot — try driver's zone first, then all zones
    const heatmapEntries = await prisma.demandHeatmap.findMany({
      where: {
        tenantId,
        platform,
        dayOfWeek,
        hourSlot: { in: [hourSlot, (hourSlot + 1) % 24] }, // current + next hour
      },
      orderBy: { avgOrders: "desc" },
    });

    if (heatmapEntries.length === 0) {
      // Fallback: use any available data for this platform
      const fallback = await prisma.demandHeatmap.findMany({
        where: { tenantId, platform, dayOfWeek },
        orderBy: { avgOrders: "desc" },
        take: 5,
      });

      if (fallback.length === 0) {
        return {
          recommendation: "No historical demand data available yet. Stay in your current area and monitor for orders.",
          restaurant: { name: "Current position", avgOrders: 0, distance: "0 km" },
          confidence: 0,
          reasoning: "Insufficient historical data to make a recommendation. The system needs more order history to identify patterns.",
          alternatives: [],
        };
      }

      // Use fallback data
      const topEntry = fallback[0];
      const restaurants = (topEntry.topRestaurants as unknown as RestaurantRecommendation[]) ?? [];
      const topRestaurant = restaurants[0] ?? { name: topEntry.zone, avgOrders: topEntry.avgOrders };

      return {
        recommendation: `Head to ${topEntry.zone} — historically high demand area for ${platform}`,
        restaurant: { ...topRestaurant, distance: "N/A" },
        confidence: topEntry.confidence * 0.5, // Lower confidence for fallback
        reasoning: `Based on limited data: ${topEntry.zone} averages ${topEntry.avgOrders.toFixed(1)} orders on ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek]}s.`,
        alternatives: restaurants.slice(1, 4),
      };
    }

    // Collect all restaurants from relevant heatmap cells, scored by demand and proximity
    const allRestaurants: Array<{
      name: string;
      avgOrders: number;
      zone: string;
      confidence: number;
      lat?: number;
      lng?: number;
    }> = [];

    for (const entry of heatmapEntries) {
      const restaurants = (entry.topRestaurants as unknown as Array<{ name: string; avgOrders: number; lat?: number; lng?: number }>) ?? [];
      for (const r of restaurants) {
        allRestaurants.push({
          ...r,
          zone: entry.zone,
          confidence: entry.confidence,
        });
      }
    }

    if (allRestaurants.length === 0) {
      // No specific restaurants, recommend by zone
      const bestZone = heatmapEntries[0];
      return {
        recommendation: `Head to ${bestZone.zone} — highest demand right now (${bestZone.avgOrders.toFixed(1)} avg orders)`,
        restaurant: { name: bestZone.zone, avgOrders: bestZone.avgOrders, distance: "N/A" },
        confidence: bestZone.confidence,
        reasoning: `${bestZone.zone} has the highest order volume for ${platform} at this time. ${bestZone.confidence > 0.7 ? "High confidence based on 3+ weeks of data." : "Moderate confidence — more data will improve accuracy."}`,
        alternatives: heatmapEntries.slice(1, 4).map((e) => ({
          name: e.zone,
          avgOrders: e.avgOrders,
        })),
      };
    }

    // Score restaurants: demand * confidence, penalize by distance if GPS available
    const scored = allRestaurants.map((r) => {
      let distanceKm: number | undefined;
      if (r.lat && r.lng && lat && lng) {
        distanceKm = haversineKm(lat, lng, r.lat, r.lng);
      }
      // Score: higher orders and confidence = better; further distance = worse
      const demandScore = r.avgOrders * r.confidence;
      const distancePenalty = distanceKm != null ? Math.max(0.3, 1 - distanceKm / 10) : 0.7;
      return {
        ...r,
        distanceKm,
        finalScore: demandScore * distancePenalty,
      };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    const best = scored[0];
    const distanceStr = best.distanceKm != null ? `${best.distanceKm.toFixed(1)} km` : "N/A";

    const timeWindow = `${hourSlot}:00-${(hourSlot + 1) % 24}:00`;

    return {
      recommendation: `Head to ${best.name}${best.zone ? ` in ${best.zone}` : ""} (${distanceStr} away) — highest order probability right now`,
      restaurant: {
        name: best.name,
        avgOrders: best.avgOrders,
        distance: distanceStr,
        lat: best.lat,
        lng: best.lng,
      },
      confidence: Math.min(1, best.confidence),
      reasoning: `Based on 4 weeks of data: ${best.name} averages ${best.avgOrders.toFixed(1)} orders between ${timeWindow} on ${["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][dayOfWeek]}.${best.distanceKm != null ? ` You're ${distanceStr} away.` : ""}`,
      alternatives: scored.slice(1, 4).map((r) => ({
        name: r.name,
        avgOrders: r.avgOrders,
        distance: r.distanceKm != null ? `${r.distanceKm.toFixed(1)} km` : undefined,
        lat: r.lat,
        lng: r.lng,
      })),
    };
  }

  /**
   * Get real-time zone capacity status — how many drivers are needed vs available.
   */
  static async getZoneCapacity(tenantId: string, platform: string): Promise<ZoneCapacityItem[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourSlot = now.getHours();

    // Current active drivers by zone
    const activeSessions = await prisma.courierOnlineSession.groupBy({
      by: ["area"],
      where: {
        tenantId,
        isOnline: true,
        area: { not: null },
      },
      _count: true,
    });

    const activeByZone = new Map<string, number>();
    for (const s of activeSessions) {
      if (s.area) activeByZone.set(s.area, s._count);
    }

    // Expected demand from heatmap
    const heatmapEntries = await prisma.demandHeatmap.findMany({
      where: {
        tenantId,
        platform,
        dayOfWeek,
        hourSlot,
      },
    });

    const zones = new Set<string>();
    for (const entry of heatmapEntries) zones.add(entry.zone);
    for (const zone of activeByZone.keys()) zones.add(zone);

    const result: ZoneCapacityItem[] = [];

    for (const zone of zones) {
      const activeDrivers = activeByZone.get(zone) ?? 0;
      const heatmap = heatmapEntries.find((h) => h.zone === zone);
      const expectedDemand = heatmap?.avgOrders ?? 0;

      // Optimal: ~3-5 orders per driver per hour
      const optimalDrivers = Math.ceil(expectedDemand / 4);
      let status: "understaffed" | "optimal" | "overstaffed";
      let recommendation: string;

      if (activeDrivers < optimalDrivers * 0.7) {
        status = "understaffed";
        const needed = optimalDrivers - activeDrivers;
        recommendation = `Need ${needed} more driver${needed > 1 ? "s" : ""} to meet expected demand of ${expectedDemand.toFixed(0)} orders.`;
      } else if (activeDrivers > optimalDrivers * 1.3) {
        status = "overstaffed";
        const excess = activeDrivers - optimalDrivers;
        recommendation = `${excess} excess driver${excess > 1 ? "s" : ""} — consider redeploying to understaffed zones.`;
      } else {
        status = "optimal";
        recommendation = "Driver coverage matches expected demand.";
      }

      result.push({ zone, activeDrivers, expectedDemand, status, recommendation });
    }

    // Sort: understaffed first, then overstaffed, then optimal
    const statusOrder = { understaffed: 0, overstaffed: 1, optimal: 2 };
    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return result;
  }
}
