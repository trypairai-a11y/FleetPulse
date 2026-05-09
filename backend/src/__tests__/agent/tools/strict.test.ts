// Wave 0 RED test — turns GREEN in Wave 1 (registry relocation to
// backend/src/agent/registry.ts) AND Wave 3 (the 11 read tools register
// themselves with additionalProperties:false + ≥200-char descriptions).
// Do not skip.
//
// Behavior contract:
// Every Phase 1 read tool must register with Anthropic strict mode
// requirements honoured: inputSchema.type === "object",
// inputSchema.additionalProperties === false, description.length >= 200.
// Iterates the registry — single test, fails the moment any tool drops
// strict-mode hygiene.
// REQ-agent-read-tools.

import { toolRegistry } from "../../../agent/registry";

describe("Tool registry — Phase 1 strict-mode hygiene", () => {
  test("every registered tool exposes additionalProperties:false and ≥200-char description (REQ-agent-read-tools)", () => {
    const tools = toolRegistry.list("chat", "ADMIN");

    // Phase 1 ships exactly 11 read tools. Wave 1 may register more
    // (legacy triage/reconciliation/narrator tools also load); allow a
    // floor of 11.
    expect(tools.length).toBeGreaterThanOrEqual(11);

    for (const t of tools) {
      const schema = t.inputSchema as {
        type: string;
        additionalProperties?: boolean;
      };
      expect(schema.type).toBe("object");
      expect(schema.additionalProperties).toBe(false);
      expect(t.description.length).toBeGreaterThanOrEqual(200);
    }
  });
});
