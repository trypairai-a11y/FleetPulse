// Phase 2 Wave 2 — collectEvidence.
//
// Per-anomaly evidence gathering for the Decisions Surface. The card UI's
// "Show evidence (N)" disclosure surfaces these so the operator can see
// the real shifts / orders / cash records / GPS samples grounding the
// agent's proposal — not just the agent's reasoning sentence.
//
// All Prisma reads MUST carry tenantId. Each evidence row is shaped to
// match UI-SPEC §4.5's Evidence interface so the front-end <EvidenceList />
// component can render them without further normalisation:
//
//   { type, label, entityType, entityId, href? }
//
// We cap each result to 5 rows so the disclosure stays readable; cap is
// implementation-defined per the plan (Task 1 wording: "up to 5 linked
// entities").
//
// REQ-decisions-proposal-inbox.

import { prisma } from "../../config";
import type { PendingAgentActionLike } from "./cardProjector";

export interface Evidence {
  type: "shift" | "violation" | "cashRecord" | "order" | "gps" | "note";
  label: string;
  entityType: string;
  entityId: string;
  href?: string;
}

// ─── Anomaly-specific collectors ────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

async function collectLateClockInShifts(
  tenantId: string,
  driverId: string,
): Promise<Evidence[]> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS);
  // Phase 2 schema: AttendanceRecord carries the "late" signal via
  // status === "LATE" + lateMinutes; Shift's varianceMinutes is a
  // diagnostic but not a clean late filter. Use AttendanceRecord and
  // join up to the parent shift only if needed.
  const records = await prisma.attendanceRecord.findMany({
    where: {
      tenantId,
      driverId,
      status: "LATE",
      date: { gte: since },
    },
    orderBy: { date: "desc" },
    take: 3,
    select: {
      id: true,
      date: true,
      lateMinutes: true,
      shiftId: true,
    },
  });
  return records.map((r) => ({
    type: "shift" as const,
    label: `${r.date.toISOString().slice(0, 10)} late by ${r.lateMinutes}m`,
    entityType: "AttendanceRecord",
    entityId: r.id,
    href: r.shiftId ? `/shifts/${r.shiftId}` : undefined,
  }));
}

async function collectRecentRejectedOrders(
  tenantId: string,
  driverId: string,
): Promise<Evidence[]> {
  const since = new Date(Date.now() - TWO_HOURS_MS);
  // OrderLog doesn't have a 1:1 status field at this schema rev; use the
  // rawData JSON or paymentSource / orderNumber to surface the order.
  // We surface up to 5 most-recent orders in the window as evidence — the
  // operator's eye-check is what flags rejections. Phase 8 will add a
  // first-class status enum so we can filter strictly.
  const orders = await prisma.orderLog.findMany({
    where: {
      tenantId,
      driverId,
      date: { gte: since },
    },
    orderBy: { date: "desc" },
    take: 5,
    select: {
      id: true,
      date: true,
      orderNumber: true,
      orderCount: true,
    },
  });
  return orders.map((o) => ({
    type: "order" as const,
    label:
      `${o.date.toISOString().slice(11, 16)} order ` +
      (o.orderNumber ?? `#${o.id.slice(0, 6)}`) +
      ` (${o.orderCount} units)`,
    entityType: "OrderLog",
    entityId: o.id,
    href: undefined,
  }));
}

async function collectGpsStaleEvidence(
  tenantId: string,
  driverId: string,
): Promise<Evidence[]> {
  const session = await prisma.courierOnlineSession.findFirst({
    where: { tenantId, driverId, isOnline: true },
    orderBy: { startTime: "desc" },
    select: {
      id: true,
      lastGpsAt: true,
      startTime: true,
    },
  });
  if (!session) return [];
  const ref = session.lastGpsAt ?? session.startTime;
  const minutesAgo = Math.max(
    0,
    Math.round((Date.now() - new Date(ref).getTime()) / 60_000),
  );
  return [
    {
      type: "gps" as const,
      label: session.lastGpsAt
        ? `Last GPS ${minutesAgo} min ago`
        : `Online since ${session.startTime.toISOString()} — no GPS yet`,
      entityType: "CourierOnlineSession",
      entityId: session.id,
    },
  ];
}

async function collectCashEvidence(
  tenantId: string,
  driverId: string,
): Promise<Evidence[]> {
  const record = await prisma.cashRecord.findFirst({
    where: {
      tenantId,
      driverId,
      pendingDues: { gt: 0 },
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      pendingDues: true,
      status: true,
    },
  });
  if (!record) return [];
  return [
    {
      type: "cashRecord" as const,
      label: `${record.date.toISOString().slice(0, 10)} pending ${record.pendingDues.toString()} KD (${record.status})`,
      entityType: "CashRecord",
      entityId: record.id,
      href: undefined,
    },
  ];
}

function flagForReviewPlaceholder(
  pa: PendingAgentActionLike,
): Evidence[] {
  if (!pa.subjectType || !pa.subjectId) return [];
  // Map subjectType → Evidence.type token. UI-SPEC §4.5's Evidence.type is
  // a small union; fall back to "note" for unknown subjects.
  const typeMap: Record<string, Evidence["type"]> = {
    Shift: "shift",
    CashRecord: "cashRecord",
    Order: "order",
    Violation: "violation",
    Driver: "note",
  };
  const type = typeMap[pa.subjectType] ?? "note";
  return [
    {
      type,
      label: (pa.reasoning ?? "").slice(0, 60),
      entityType: pa.subjectType,
      entityId: pa.subjectId,
    },
  ];
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function collectEvidence(
  pa: PendingAgentActionLike,
): Promise<Evidence[]> {
  const tenantId = pa.tenantId;
  const input = (pa.input ?? {}) as { intent?: string; driverId?: string };
  const driverId =
    input.driverId ?? (pa.subjectType === "Driver" ? pa.subjectId : null);

  // No driver context — fall back to the subject placeholder for review
  // tools, otherwise empty.
  if (!driverId) {
    if (pa.toolName === "flagForReview") return flagForReviewPlaceholder(pa);
    return [];
  }

  switch (pa.toolName) {
    case "draftCourierMessage": {
      switch (input.intent) {
        case "WARN_LATE_CLOCKIN":
          return collectLateClockInShifts(tenantId, driverId);
        case "WARN_ORDER_REJECTIONS":
          return collectRecentRejectedOrders(tenantId, driverId);
        case "WARN_GPS_STALE":
          return collectGpsStaleEvidence(tenantId, driverId);
        case "CASH_REMINDER":
          return collectCashEvidence(tenantId, driverId);
        case "COACHING_PERFORMANCE":
          // Coaching can ground itself in the past 7 days of late shifts
          // as a default; Phase 9 will add performance-snapshot evidence.
          return collectLateClockInShifts(tenantId, driverId);
        case "PROMOTE_TOP_PERFORMER":
        case "GENERIC":
        default:
          return [];
      }
    }
    case "proposeCashReminder":
      return collectCashEvidence(tenantId, driverId);
    case "flagForReview":
      return flagForReviewPlaceholder(pa);
    default:
      // Legacy triage tools (proposeAppealDecision, proposeCoachingMessage,
      // snoozeAlert) and Phase-8 hints (applyPenalty, suspendDriver) carry
      // no first-class evidence path in Phase 2.
      return [];
  }
}
