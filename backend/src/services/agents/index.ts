// Re-export shim — Phase 1 relocation (DEC-promote-agent-to-spine).
// The agent module now lives at backend/src/agent/. This shim exists for
// one release cycle to keep any missed import compiling. Wave 4 will run
// grep -r "services/agents" and delete this file once all callers are
// confirmed to use ../../agent.
export * from "../../agent";
