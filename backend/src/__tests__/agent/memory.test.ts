// Wave 0 RED test — turns GREEN in Wave 2 when backend/src/agent/memory.ts
// ships with upsertAgentMemory() + latestMemoryByKey(). Do not skip.
//
// Behavior contract:
// AgentMemory is APPEND-ONLY. Two upserts to the same key produce two
// rows; latestMemoryByKey() returns the most recent (orderBy createdAt
// desc). REQ-data-agent-memory.

import {
  upsertAgentMemory,
  latestMemoryByKey,
} from "../../agent/memory";
import { prisma } from "../mocks/config";

describe("AgentMemory — REQ-data-agent-memory (append-only)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.agentMemory.create as jest.Mock).mockResolvedValue({
      id: "mem-1",
    });
  });

  test("two upserts to same key produce TWO prisma.agentMemory.create calls (append-only — never update)", async () => {
    await upsertAgentMemory({
      tenantId: "t1",
      key: "preferred-greeting",
      value: { lang: "en" },
    });
    await upsertAgentMemory({
      tenantId: "t1",
      key: "preferred-greeting",
      value: { lang: "ar" },
    });
    expect(prisma.agentMemory.create).toHaveBeenCalledTimes(2);
    // Belt and suspenders: the writer must never call update() —
    // training-corpus semantics demand an audit trail of every change.
    expect((prisma.agentMemory as any).update).toBeUndefined();
  });

  test("latestMemoryByKey calls findFirst with orderBy: { createdAt: 'desc' }", async () => {
    (prisma.agentMemory.findFirst as jest.Mock).mockResolvedValue({
      id: "mem-1",
      tenantId: "t1",
      key: "preferred-greeting",
      value: { lang: "ar" },
      createdAt: new Date(),
    });
    await latestMemoryByKey("t1", "preferred-greeting");
    expect(prisma.agentMemory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  test("latestMemoryByKey scopes by tenantId AND key", async () => {
    (prisma.agentMemory.findFirst as jest.Mock).mockResolvedValue(null);
    await latestMemoryByKey("t1", "preferred-greeting");
    expect(prisma.agentMemory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "t1",
          key: "preferred-greeting",
        }),
      }),
    );
  });

  test("latestMemoryByKey returns null when no row found", async () => {
    (prisma.agentMemory.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await latestMemoryByKey("t1", "unknown-key");
    expect(result).toBeNull();
  });
});
