/**
 * @wave 2 (Wave 0 RED — flips GREEN in Wave 2 Task 5 — chat agent eval)
 *
 * Gold-set chat agent evaluation. Loops over 13 fixtures in
 * `__fixtures__/goldSet.json` and asserts that the chat agent:
 *   1. Invokes the expected tools (AgentRunLog inspection).
 *   2. Emits the expected viewTypes (result.views[].viewType).
 *   3. Stays inside the test tenant (no cross-tenant rows touched).
 *   4. Handles the Arabic prompt (gs-11-arabic-prompt) without crashing.
 *   5. Refuses the out-of-scope command (gs-12-out-of-scope) with a callout.
 *   6. Returns an empty-state callout (gs-13-no-data) instead of an error.
 *
 * Fixtures are the orchestrator §5 floor of 13; later waves may grow this
 * set but must not shrink it.
 *
 * REQ-agent-natural-language-qa, REQ-chat-generated-dashboards.
 */

import fixtures from "../agent/__fixtures__/goldSet.json";

interface GoldFixture {
  id: string;
  userMessage: string;
  expectsToolCalls: string[];
  expectsViewTypes: string[];
  language: "en" | "ar";
  expectsActionProposal?: boolean;
  expectsPinnable?: boolean;
  expectsOutOfScope?: boolean;
  expectsEmpty?: boolean;
}

describe("Gold-set chat eval (Wave 0 RED)", () => {
  test("fixture file loads at least 13 entries", () => {
    expect(Array.isArray(fixtures)).toBe(true);
    expect((fixtures as GoldFixture[]).length).toBeGreaterThanOrEqual(13);
  });

  test("every fixture has a stable id", () => {
    const ids = (fixtures as GoldFixture[]).map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("at least one fixture is in Arabic (gs-11-arabic-prompt)", () => {
    expect(
      (fixtures as GoldFixture[]).some((f) => f.language === "ar"),
    ).toBe(true);
  });

  test("at least one fixture exercises an action proposal (gs-07-warn-drivers)", () => {
    expect(
      (fixtures as GoldFixture[]).some((f) => f.expectsActionProposal === true),
    ).toBe(true);
  });

  test("at least one fixture is out-of-scope (gs-12-out-of-scope) — agent must refuse safely", () => {
    expect(
      (fixtures as GoldFixture[]).some((f) => f.expectsOutOfScope === true),
    ).toBe(true);
  });

  test("at least one fixture is an empty-data state (gs-13-no-data)", () => {
    expect(
      (fixtures as GoldFixture[]).some((f) => f.expectsEmpty === true),
    ).toBe(true);
  });

  test("collective expectsViewTypes covers all 9 view variants", () => {
    const all = new Set<string>();
    (fixtures as GoldFixture[]).forEach((f) =>
      f.expectsViewTypes.forEach((v) => all.add(v)),
    );
    const required = [
      "kpi_strip",
      "table",
      "time_series",
      "bar_chart",
      "mini_map",
      "comparison_cards",
      "callout",
      "action_card",
      "draft_message",
    ];
    required.forEach((v) => expect(all.has(v)).toBe(true));
  });

  // Wave 2 turns these on once the chat-agent runner exists.
  it.todo("runs every fixture through the chat agent; asserts expected tool calls hit AgentRunLog");
  it.todo("runs every fixture; asserts every expected viewType appears in result.views");
  it.todo("runs every fixture under tenant A; no AgentRunLog row references tenant B");
  it.todo("gs-07-warn-drivers stages exactly one PendingAgentAction (toolName=draftCourierMessage)");
  it.todo("gs-10-pin-revenue emits at least one view with pinnable=true");
  it.todo("gs-11-arabic-prompt does not throw; response includes at least one viewType");
  it.todo("gs-12-out-of-scope emits a callout(info) and ZERO PendingAgentAction rows");
  it.todo("gs-13-no-data emits an empty kpi_strip + callout(info), no error event");
});
