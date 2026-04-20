import { registerAgent } from "./agentRuntime";
import { registerTriageTools } from "./tools/triage";
import { registerReconciliationTools } from "./tools/reconciliation";
import { registerNarratorTools } from "./tools/narrator";

/**
 * Register the three v2 agents. Each agent is a prompt + trigger set +
 * actor role; tools are registered separately per agent in `./tools/*.ts`
 * so this module stays small and easy to audit.
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
  model: "claude-sonnet-4-20250514",
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
  model: "claude-sonnet-4-20250514",
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
  model: "claude-sonnet-4-20250514",
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
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  maxIterations: 5,
  promptFile: "chat.md",
});

// Register tools for each agent.
registerTriageTools();
registerReconciliationTools();
registerNarratorTools();

// Re-export the common entry points.
export { runAgent, registerAgent, getAgent, listAgents } from "./agentRuntime";
export { toolRegistry } from "./toolRegistry";
export type { AgentDefinition, AgentId, RunAgentInput, RunAgentResult } from "./agentRuntime";
export type { ToolDefinition, ToolContext, ToolSideEffect, InvokeResult } from "./toolRegistry";
