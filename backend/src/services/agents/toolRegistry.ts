// Re-export shim — Phase 1 relocation (DEC-promote-agent-to-spine).
// Real implementation moved to backend/src/agent/registry.ts.
export * from "../../agent/registry";
export { toolRegistry, defineTool } from "../../agent/registry";
export type { ToolDefinition, ToolContext, ToolSideEffect, InvokeResult } from "../../agent/registry";
