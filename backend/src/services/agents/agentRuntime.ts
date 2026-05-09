// Re-export shim — Phase 1 relocation (DEC-promote-agent-to-spine).
// Real implementation moved to backend/src/agent/runtime.ts.
export * from "../../agent/runtime";
export { runAgent, registerAgent, getAgent, listAgents } from "../../agent/runtime";
export type { AgentDefinition, AgentId, RunAgentInput, RunAgentResult } from "../../agent/runtime";
