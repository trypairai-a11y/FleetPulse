import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Returns a compact profile for one driver. Aggregates Driver + latest AiScore
 * + recent shifts + cash outstanding + recent violations in a single tool call
 * for Decisions card composition.
 */
export const courierProfile = defineTool({
  name: "courierProfile",
  description:
    "Return a compact profile for one driver: identity (name/phone/platform/vehicleType/status), latest AiScore (composite + 5 sub-scores + trend), 5 most recent shifts, total cash outstanding (KD), and 5 most recent violations. Use this when the agent needs context about a specific driver — Decisions card composition, 'tell me about driver X', or pre-action sanity check. Tenant-scoped; takes only a driverId.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string", description: "Driver.id (uuid)." },
    },
    required: ["driverId"],
    additionalProperties: false,
  },
  inputValidator: z.object({ driverId: z.string().min(1) }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const driver = await prisma.driver.findFirst({
      where: { tenantId: ctx.tenantId, id: input.driverId },
      select: {
        id: true,
        name: true,
        phone: true,
        platform: true,
        status: true,
        vehicleType: true,
      },
    });
    if (!driver) return { error: "driver_not_found" };

    const [latestScore, recentShifts, cashAgg, recentViolations] = await Promise.all([
      prisma.aiScore.findFirst({
        where: { tenantId: ctx.tenantId, driverId: input.driverId },
        orderBy: { date: "desc" },
        select: {
          compositeScore: true,
          attendanceScore: true,
          deliveryScore: true,
          financialScore: true,
          equipmentScore: true,
          platformScore: true,
          trend: true,
        },
      }),
      prisma.shift.findMany({
        where: { tenantId: ctx.tenantId, driverId: input.driverId },
        orderBy: { date: "desc" },
        take: 5,
        select: { id: true, date: true, status: true, deliveryArea: true },
      }),
      prisma.cashRecord.aggregate({
        where: {
          tenantId: ctx.tenantId,
          driverId: input.driverId,
          status: { in: ["PENDING", "PARTIALLY_PAID"] },
        },
        _sum: { pendingDues: true },
      }),
      prisma.violation.findMany({
        where: { tenantId: ctx.tenantId, driverId: input.driverId },
        orderBy: { violationTime: "desc" },
        take: 5,
        select: {
          id: true,
          violationType: true,
          violationStatus: true,
          violationTime: true,
        },
      }),
    ]);

    return {
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        platform: driver.platform,
        status: driver.status,
        vehicleType: driver.vehicleType,
      },
      score: latestScore
        ? {
            compositeScore: latestScore.compositeScore,
            trend: latestScore.trend,
            subScores: {
              attendance: latestScore.attendanceScore,
              delivery: latestScore.deliveryScore,
              financial: latestScore.financialScore,
              equipment: latestScore.equipmentScore,
              platform: latestScore.platformScore,
            },
          }
        : null,
      recentShifts: recentShifts.map((s) => ({
        shiftId: s.id,
        date: s.date.toISOString().slice(0, 10),
        status: s.status,
        area: s.deliveryArea ?? null,
      })),
      cashOutstanding: {
        totalKd: Number(cashAgg._sum.pendingDues ?? 0).toFixed(3),
      },
      recentViolations: recentViolations.map((v) => ({
        id: v.id,
        type: v.violationType,
        status: v.violationStatus,
        time: v.violationTime.toISOString(),
      })),
    };
  },
});

export function registerCourierProfileTool() {
  toolRegistry.register(courierProfile);
}

registerCourierProfileTool();
