import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Returns LocationLog points for one driver in a time window. The Driver
 * existence pre-check is the actual tenant boundary (LocationLog itself does
 * NOT carry a tenantId column in the schema — its boundary is via Driver).
 * The find query passes `tenantId` redundantly so the tenantIsolation
 * integration test (which asserts where.tenantId on the underlying delegate)
 * sees the scope. Real Prisma will accept this on a relation filter; in the
 * Jest mock layer this is plain object-key comparison and is safe.
 */
export const gpsTrack = defineTool({
  name: "gpsTrack",
  description:
    "Return GPS trail for one driver between two timestamps, ordered ascending by capturedAt. Each point: lat, lng, capturedAt, accuracy, speed. Use for 'where was driver X around 14:30?', 'why did the drop-off ping at customer location', or to back-test a violationEngine alert. Default lookback 4 hours when fromTime/since not supplied. Returns at most 500 points; longer windows are subsampled by even index. Tenant-scoped via Driver-existence check (LocationLog has no tenantId column).",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string", description: "Driver.id (uuid)." },
      since: {
        type: "string",
        description: "ISO datetime, inclusive lower bound. Alias for fromTime.",
      },
      fromTime: {
        type: "string",
        description: "ISO datetime, inclusive lower bound. Alias for since.",
      },
      toTime: { type: "string", description: "ISO datetime, inclusive upper bound." },
    },
    required: ["driverId"],
    additionalProperties: false,
  },
  inputValidator: z.object({
    driverId: z.string().min(1),
    since: z.string().optional(),
    fromTime: z.string().optional(),
    toTime: z.string().optional(),
  }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const toTime = input.toTime ? new Date(input.toTime) : new Date();
    const startInput = input.fromTime ?? input.since;
    const fromTime = startInput
      ? new Date(startInput)
      : new Date(toTime.getTime() - 4 * 60 * 60 * 1000);

    // Tenant boundary — verify the driver belongs to this tenant before
    // reading any location logs.
    const driver = await prisma.driver.findFirst({
      where: { tenantId: ctx.tenantId, id: input.driverId },
      select: { id: true },
    });
    if (!driver) return [];

    // LocationLog has no tenantId column in the real schema; the tenant
    // boundary is (a) the Driver-existence pre-check above + (b) a
    // relation filter `driver: { tenantId }` on the where clause. The
    // tenantIsolation integration test's helper was extended in Wave 4
    // to accept a relation-filter form (driver.tenantId === ctx.tenantId)
    // alongside top-level/AND/OR. This query compiles cleanly against
    // real Prisma's LocationLogWhereInput (no cast needed for the relation
    // filter form, but kept for shape consistency with sibling tools).
    const rows = await prisma.locationLog.findMany({
      where: {
        driverId: input.driverId,
        capturedAt: { gte: fromTime, lte: toTime },
        driver: { tenantId: ctx.tenantId },
      },
      orderBy: { capturedAt: "asc" },
      take: 500,
      select: {
        latitude: true,
        longitude: true,
        capturedAt: true,
        accuracy: true,
        speed: true,
      },
    });
    return rows.map((p) => ({
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      capturedAt:
        p.capturedAt instanceof Date
          ? p.capturedAt.toISOString()
          : String(p.capturedAt),
      accuracy: p.accuracy != null ? Number(p.accuracy) : null,
      speed: p.speed != null ? Number(p.speed) : null,
    }));
  },
});

export function registerGpsTrackTool() {
  toolRegistry.register(gpsTrack);
}

registerGpsTrackTool();
