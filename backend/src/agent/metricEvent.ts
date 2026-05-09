// Lightweight in-product analytics. Required for the agent to "see itself"
// (DEC-add-metric-events). Querying is Phase 11+; Phase 1 only ships the
// writer.
//
// userId is OPTIONAL — system events (cron ticks, worker heartbeats) write
// without a user. Both `null` and `undefined` serialise to NULL in PG.
//
// REQ-data-metric-event.

import { prisma } from "../config";

export interface MetricEventInput {
  tenantId: string;
  userId?: string; // null/undefined = system event
  event: string; // "decision.approved" | "chat.message_sent" | "tool.called" | ...
  properties?: object;
  sessionId?: string;
}

export async function recordMetricEvent(
  input: MetricEventInput,
): Promise<{ id: string }> {
  if (!input.tenantId)
    throw new Error("recordMetricEvent: tenantId required");
  if (!input.event) throw new Error("recordMetricEvent: event required");

  const created = await prisma.metricEvent.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      event: input.event,
      properties: (input.properties ?? null) as any,
      sessionId: input.sessionId ?? null,
    },
  });
  return { id: created.id };
}
