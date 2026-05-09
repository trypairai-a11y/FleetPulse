// Per-tenant key/value memory. APPEND-ONLY by design (RESEARCH §4): every
// observation creates a row; the "current value" is `findFirst orderBy
// createdAt desc`. This gives free history for the audit-log-as-training-corpus
// property and matches the runtime guard in `prismaExtensions.ts`.
//
// REQ-data-agent-memory.

import { prisma } from "../config";

export type MemorySource =
  | "agent_observation"
  | "user_correction"
  | "explicit_set";

export interface MemoryEntry {
  tenantId: string;
  key: string; // namespace+key, e.g., "owner.preferences.warning_day"
  value: unknown; // arbitrary JSON-serializable
  confidence?: number; // 0..1
  source?: MemorySource;
  agentRunId?: string;
}

export interface MemoryRecord {
  id: string;
  tenantId: string;
  key: string;
  value: unknown;
  confidence: number;
  source: string | null;
  agentRunId: string | null;
  createdAt: Date;
}

// NOTE: name "upsert" matches the Phase 1 public API but the implementation is
// APPEND-ONLY (per RESEARCH §4 design decision). Two calls with the same
// (tenantId, key) produce TWO rows; latestMemoryByKey resolves "current value".
export async function upsertAgentMemory(
  entry: MemoryEntry,
): Promise<{ id: string }> {
  if (!entry.tenantId)
    throw new Error("upsertAgentMemory: tenantId required");
  if (!entry.key) throw new Error("upsertAgentMemory: key required");

  const created = await prisma.agentMemory.create({
    data: {
      tenantId: entry.tenantId,
      key: entry.key,
      value: entry.value as any,
      confidence: entry.confidence ?? 0.5,
      source: entry.source ?? null,
      agentRunId: entry.agentRunId ?? null,
    },
  });
  return { id: created.id };
}

export async function latestMemoryByKey(
  tenantId: string,
  key: string,
): Promise<MemoryRecord | null> {
  if (!tenantId) throw new Error("latestMemoryByKey: tenantId required");
  if (!key) throw new Error("latestMemoryByKey: key required");

  const row = await prisma.agentMemory.findFirst({
    where: { tenantId, key },
    orderBy: { createdAt: "desc" },
  });
  return row ? (row as unknown as MemoryRecord) : null;
}

export async function listMemoriesByPrefix(
  tenantId: string,
  keyPrefix: string,
  limit = 50,
): Promise<MemoryRecord[]> {
  if (!tenantId)
    throw new Error("listMemoriesByPrefix: tenantId required");

  const rows = await prisma.agentMemory.findMany({
    where: { tenantId, key: { startsWith: keyPrefix } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
  return rows as unknown as MemoryRecord[];
}
