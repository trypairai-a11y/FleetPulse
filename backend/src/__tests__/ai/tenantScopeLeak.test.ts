/**
 * @wave 2 (Wave 0 RED — flips GREEN in Wave 2 Task 5)
 *
 * Cross-tenant leak regression test. T-04-W0-02 mitigation.
 *
 * Seeds tenant A with normal data and tenant B with a sentinel string
 * "SENTINEL_LEAK_FROM_B" embedded in every B-tenant row (driver name,
 * platform settings, etc.). Runs the chat agent under tenant A across
 * every gold-set fixture. Asserts that NO response text and NO
 * view spec field contains the sentinel substring.
 *
 * If this test ever flips RED in a later wave, a tool implementation is
 * forgetting `where: { tenantId }` somewhere. The lint:tenant ESLint
 * rule is the first line of defence; this is the second.
 *
 * REQ-agent-natural-language-qa.
 */

const SENTINEL = "SENTINEL_LEAK_FROM_B";

describe("Tenant scope leak (Wave 0 RED)", () => {
  test("SENTINEL constant defined and unique enough to grep for", () => {
    expect(SENTINEL).toMatch(/SENTINEL_LEAK_FROM_B/);
    expect(SENTINEL.length).toBeGreaterThan(8);
  });

  it.todo("seeds tenant A + tenant B (sentinel) in beforeAll");
  it.todo("runs gold-set query 'Why did revenue drop yesterday in Hawally?' under tenant A");
  it.todo("response text does NOT contain SENTINEL_LEAK_FROM_B");
  it.todo("response views[] JSON.stringify does NOT contain SENTINEL_LEAK_FROM_B");
  it.todo("AgentRunLog rows for this run reference ONLY tenant A");
  it.todo("repeats for every gold-set fixture — none leak the sentinel");
  it.todo("regression sweep: ChatMessage rows persisted are scoped to tenant A");
  it.todo("regression sweep: PinnedView rows created during run are scoped to tenant A");

  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
