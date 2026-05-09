import { registerAgent } from "./runtime";
import { registerTriageTools } from "./tools/_legacy/triage";
import { registerReconciliationTools } from "./tools/_legacy/reconciliation";
import { registerNarratorTools } from "./tools/_legacy/narrator";
import { registerAllReadTools } from "./tools/read";

/**
 * Register the three v2 agents. Each agent is a prompt + trigger set +
 * actor role; tools are registered separately per agent in `./tools/_legacy/*.ts`
 * (the `_legacy` slot houses the four tool modules ported in Phase 1
 * Wave 1; Wave 3 will add fresh purpose-built read tools alongside).
 *
 * Import order matters slightly: register agents BEFORE starting the
 * scheduler so `listAgents()` sees them.
 */

registerAgent({
  id: "triage",
  description:
    "Ranks pending decisions (appeals, violations, cash gaps, stale alerts) by business impact and produces the Command Centre attention queue.",
  triggers: ["violation", "appeal_submitted", "cash_record_upserted", "cron"],
  actorRole: "OPS_MANAGER",
  model: "claude-sonnet-4-6",
  maxTokens: 4096,
  maxIterations: 8,
  promptFile: "triage.md",
});

registerAgent({
  id: "reconciliation",
  description:
    "Explains CashRecord gaps between sales and collection; flags fraud patterns.",
  triggers: ["cash_record_upserted", "cron"],
  actorRole: "ACCOUNTANT",
  model: "claude-sonnet-4-6",
  maxTokens: 3072,
  maxIterations: 6,
  promptFile: "reconciliation.md",
});

registerAgent({
  id: "narrator",
  description:
    "Produces hourly ops briefings from clustered alerts and violations.",
  triggers: ["cron"],
  actorRole: "OPS_MANAGER",
  model: "claude-sonnet-4-6",
  maxTokens: 2048,
  maxIterations: 4,
  promptFile: "narrator.md",
});

registerAgent({
  id: "chat",
  description:
    "Conversational Ask Darb surface. Reactive to user messages in the Cmd+K palette.",
  triggers: [], // reactive only — never triggered by events or cron
  actorRole: "OPS_MANAGER",
  model: "claude-sonnet-4-6",
  maxTokens: 4096,
  maxIterations: 5,
  promptFile: "chat.md",
});

// Register tools for each agent.
registerTriageTools();
registerReconciliationTools();
registerNarratorTools();

// Phase 1 Wave 3 — register the 11 PRD read tools (REQ-agent-read-tools).
// The `tools/read/` index module side-effect-imports every tool file, each of
// which self-registers; calling registerAllReadTools is a no-op shim today
// but kept as the explicit registration surface for future waves.
registerAllReadTools();

// Re-export the common entry points.
export { runAgent, registerAgent, getAgent, listAgents } from "./runtime";
export { toolRegistry } from "./registry";
export type { AgentDefinition, AgentId, RunAgentInput, RunAgentResult } from "./runtime";
export type { ToolDefinition, ToolContext, ToolSideEffect, InvokeResult } from "./registry";

// ─── Phase 1 Wave 2 — Data primitives ─────────────────────────────────────
// REQ-data-agent-action: writeAgentAction (CON-audit-row-shape ledger writer)
// REQ-data-agent-memory: upsertAgentMemory + latestMemoryByKey + listMemoriesByPrefix
// REQ-data-pinned-view:  createPinnedView + listPinsForUser + removePinnedView
// REQ-data-metric-event: recordMetricEvent
// REQ-data-performance-snapshot: writePerformanceSnapshot + listSnapshotsForDriver
export { writeAgentAction } from "./ledger";
export type { AuditRow } from "./ledger";
export {
  upsertAgentMemory,
  latestMemoryByKey,
  listMemoriesByPrefix,
} from "./memory";
export type { MemoryEntry, MemoryRecord, MemorySource } from "./memory";
export {
  createPinnedView,
  listPinsForUser,
  removePinnedView,
} from "./pinnedView";
export type {
  PinnedViewSpec,
  PinnedViewRecord,
  PinnedViewType,
} from "./pinnedView";
export { recordMetricEvent } from "./metricEvent";
export type { MetricEventInput } from "./metricEvent";
export {
  writePerformanceSnapshot,
  listSnapshotsForDriver,
} from "./performanceSnapshot";
export type {
  PerformanceSnapshotInput,
  ScoreTrend,
} from "./performanceSnapshot";
