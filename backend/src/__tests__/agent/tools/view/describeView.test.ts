/**
 * @wave 1 (Wave 0 RED — flips GREEN in Wave 1 Task 3)
 *
 * describeView tool: Zod discriminated-union schema covering 9 viewTypes.
 * Wave 1 ships `backend/src/agent/tools/view/describeView.ts` exporting
 * a ToolDefinition whose inputValidator is a Zod discriminatedUnion on
 * `viewType`. Each branch validates the spec for that view variant.
 *
 * Acceptable RED state today: `Cannot find module '../../../../agent/tools/view/describeView'`.
 *
 * REQ-chat-generated-dashboards.
 */

// RED — Wave 1 will create this module. Until then `require` throws,
// causing all tests below to fail with module-not-found.
describe("describeView Zod schema (Wave 0 RED)", () => {
  let validator: { safeParse: (input: unknown) => { success: boolean } } | null = null;

  beforeAll(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("../../../../agent/tools/view/describeView");
      validator = mod.describeViewTool?.inputValidator ?? mod.describeViewInputSchema ?? null;
    } catch {
      validator = null;
    }
  });

  test("module is exported (Wave 1 Task 3 creates this file)", () => {
    expect(validator).not.toBeNull();
  });

  test("accepts kpi_strip with tiles[]", () => {
    expect(validator!.safeParse({
      viewType: "kpi_strip",
      spec: { tiles: [{ label: "Revenue", value: "KD 1,247" }] },
    }).success).toBe(true);
  });

  test("accepts table with columns+rows", () => {
    expect(validator!.safeParse({
      viewType: "table",
      spec: { columns: ["Driver"], rows: [{ Driver: "Mohamed" }] },
    }).success).toBe(true);
  });

  test("accepts time_series with series[]", () => {
    expect(validator!.safeParse({
      viewType: "time_series",
      spec: { series: [{ name: "score", points: [{ x: "2026-04-12", y: 92 }] }] },
    }).success).toBe(true);
  });

  test("accepts bar_chart with bars[]", () => {
    expect(validator!.safeParse({
      viewType: "bar_chart",
      spec: { bars: [{ label: "Hawally", value: 1247 }] },
    }).success).toBe(true);
  });

  test("accepts mini_map with markers[]", () => {
    expect(validator!.safeParse({
      viewType: "mini_map",
      spec: { markers: [{ lat: 29.33, lng: 47.99, label: "Mohamed" }] },
    }).success).toBe(true);
  });

  test("accepts comparison_cards with cards[]", () => {
    expect(validator!.safeParse({
      viewType: "comparison_cards",
      spec: { cards: [{ title: "Talabat", value: "KD 800" }, { title: "Keeta", value: "KD 600" }] },
    }).success).toBe(true);
  });

  test("accepts callout with severity+message", () => {
    expect(validator!.safeParse({
      viewType: "callout",
      spec: { severity: "info", message: "Out of scope for v1" },
    }).success).toBe(true);
  });

  test("accepts action_card with title+ctaLabel", () => {
    expect(validator!.safeParse({
      viewType: "action_card",
      spec: { title: "Warn drivers", ctaLabel: "Approve", pendingActionId: "pa-1" },
    }).success).toBe(true);
  });

  test("accepts draft_message with body+recipient", () => {
    expect(validator!.safeParse({
      viewType: "draft_message",
      spec: { recipient: "Mohamed", body: "Please clock in on time." },
    }).success).toBe(true);
  });

  test("rejects unknown viewType", () => {
    expect(validator!.safeParse({ viewType: "wormhole", spec: {} }).success).toBe(false);
  });

  test("rejects malformed kpi_strip (tiles missing)", () => {
    expect(validator!.safeParse({ viewType: "kpi_strip", spec: {} }).success).toBe(false);
  });
});
