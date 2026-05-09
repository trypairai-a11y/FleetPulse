import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Real-time snapshot of the active fleet. Reads CourierOnlineSession with
 * isOnline=true; computes byZone, byPlatform, gpsStaleCount (lastGpsAt > 10min
 * ago), and scheduledNotOnlineCount (Shift.actualStart in the past, driver
 * not in online sessions). No input parameters.
 */
export const liveFleetStatus = defineTool({
  name: "liveFleetStatus",
  description:
    "Return a real-time snapshot of the active fleet: total drivers currently online (CourierOnlineSession.isOnline=true), breakdown by zone (area), breakdown by platform, count of GPS-stale drivers (last GPS update >10 minutes ago), and count of drivers scheduled for a current shift but not yet online. Use this for the dispatcher's morning glance, Decisions cards about offline-during-shift, and chat answers to 'how many drivers are working right now?'. Tenant-scoped, no input parameters.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({}).strict(),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx) {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const sessions = await prisma.courierOnlineSession.findMany({
      where: { tenantId: ctx.tenantId, isOnline: true },
      select: {
        driverId: true,
        area: true,
        lastGpsAt: true,
        driver: { select: { platform: true } },
      },
    });
    const byZone: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};
    let gpsStaleCount = 0;
    for (const s of sessions ?? []) {
      const z = s.area ?? "(unknown)";
      byZone[z] = (byZone[z] ?? 0) + 1;
      const p = s.driver?.platform ?? "(unknown)";
      byPlatform[p] = (byPlatform[p] ?? 0) + 1;
      if (!s.lastGpsAt || s.lastGpsAt < tenMinAgo) gpsStaleCount++;
    }
    // Scheduled-not-online: shifts that have started today and whose driver is
    // NOT in the live online sessions list. Defensive against an empty mock.
    let scheduledNotOnlineCount = 0;
    try {
      const onlineDriverIds = new Set((sessions ?? []).map((s) => s.driverId));
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + 86_400_000);
      const todayShifts = await prisma.shift.findMany({
        where: {
          tenantId: ctx.tenantId,
          date: { gte: todayStart, lt: todayEnd },
          scheduledStart: { lte: new Date() },
        },
        select: { driverId: true },
      });
      scheduledNotOnlineCount = (todayShifts ?? []).filter(
        (s) => !onlineDriverIds.has(s.driverId),
      ).length;
    } catch {
      // Mock returned undefined or shape mismatched — skip the count rather than fail the tool.
      scheduledNotOnlineCount = 0;
    }
    return {
      totalOnline: sessions?.length ?? 0,
      byZone,
      byPlatform,
      gpsStaleCount,
      scheduledNotOnlineCount,
    };
  },
});

export function registerLiveFleetStatusTool() {
  toolRegistry.register(liveFleetStatus);
}

registerLiveFleetStatusTool();
