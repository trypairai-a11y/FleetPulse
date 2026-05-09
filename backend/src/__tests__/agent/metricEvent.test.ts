// Wave 0 RED test — turns GREEN in Wave 2 when
// backend/src/agent/metricEvent.ts ships with recordMetricEvent().
// Do not skip.
//
// Behavior contract:
// recordMetricEvent({event, properties}) writes a row with tenantId,
// userId (nullable), event name, properties JSON, sessionId.
// REQ-data-metric-event.

import { recordMetricEvent } from "../../agent/metricEvent";
import { prisma } from "../mocks/config";

describe("MetricEvent — REQ-data-metric-event (in-product analytics)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.metricEvent.create as jest.Mock).mockResolvedValue({
      id: "evt-1",
    });
  });

  test("writes event + tenantId + properties", async () => {
    await recordMetricEvent({
      tenantId: "t1",
      userId: "user-1",
      event: "agent.proposal.approved",
      properties: { toolName: "applyPenalty" },
    });
    expect(prisma.metricEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "t1",
        userId: "user-1",
        event: "agent.proposal.approved",
        properties: { toolName: "applyPenalty" },
      }),
    });
  });

  test("userId is null/undefined when omitted (system events)", async () => {
    await recordMetricEvent({
      tenantId: "t1",
      event: "system.cron.tick",
    });
    const arg = (prisma.metricEvent.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.tenantId).toBe("t1");
    expect(arg.data.event).toBe("system.cron.tick");
    // Either null or undefined is acceptable — both serialise to NULL in PG.
    expect(arg.data.userId == null).toBe(true);
  });

  test("sessionId persisted when provided", async () => {
    await recordMetricEvent({
      tenantId: "t1",
      userId: "user-1",
      event: "chat.message.sent",
      sessionId: "session-xyz",
    });
    expect(prisma.metricEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "session-xyz",
      }),
    });
  });
});
