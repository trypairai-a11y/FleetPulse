import { prisma } from "../../config";

/**
 * Phase 3 Wave 1 — REQ-driver-file (agent notes / decision audit log).
 *
 * Returns the Driver File's decision-audit-log slice: approved AgentAction
 * rows + pending PendingAgentAction rows that target this driver. Filtered
 * by subjectType="Driver" AND subjectId=driverId AND tenantId.
 *
 * Known limitation (deferred to Phase 8): cash-record-typed actions whose
 * subjectType="CashRecord" but reference this driver via CashRecord.driverId
 * are EXCLUDED. The Driver File v1 surfaces only Driver-typed audit rows;
 * Phase 8 will expand by querying CashRecord and joining via driverId.
 */

const PENDING_WINDOW_DAYS = 30;

export interface DriverAuditLog {
  approved: Array<{
    id: string;
    toolName: string;
    proposer: string;
    approverId: string;
    outcome: string;
    reasoning: string;
    createdAt: Date;
    rolledBackAt: Date | null;
  }>;
  pending: Array<{
    id: string;
    toolName: string;
    confidence: number;
    reasoning: string;
    recommendation: string;
    createdAt: Date;
  }>;
}

export async function loadDriverAuditLog(
  tenantId: string,
  driverId: string,
): Promise<DriverAuditLog> {
  const since = new Date(Date.now() - PENDING_WINDOW_DAYS * 86_400_000);

  const [approved, pending] = await Promise.all([
    prisma.agentAction.findMany({
      where: {
        tenantId,
        subjectType: "Driver",
        subjectId: driverId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        toolName: true,
        proposer: true,
        approverId: true,
        outcome: true,
        reasoning: true,
        createdAt: true,
        rolledBackAt: true,
      },
    }),
    prisma.pendingAgentAction.findMany({
      where: {
        tenantId,
        subjectType: "Driver",
        subjectId: driverId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        toolName: true,
        confidence: true,
        reasoning: true,
        recommendation: true,
        createdAt: true,
      },
    }),
  ]);

  return { approved, pending };
}
