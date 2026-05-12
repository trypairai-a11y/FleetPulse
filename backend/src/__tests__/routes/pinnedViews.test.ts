/**
 * @wave 1 (Wave 0 RED — flips GREEN in Wave 1 Task 5 — pinnedViews route)
 *
 * Pinned view CRUD scoped per-user. Wave 1 extends PinnedViewType from 5
 * to 9 variants (adds bar_chart, action_card, draft_message, callout,
 * time_series). Existing pinnedView.ts service already exists from Phase
 * 1; Wave 1 adds the HTTP route and viewType extension.
 *
 *   POST   /api/pinned-views
 *   GET    /api/pinned-views
 *   DELETE /api/pinned-views/:id
 *
 * Acceptable RED state today: `Cannot find module '../../routes/pinnedViews'`
 * or `prisma.pinnedView` field set is missing the new viewTypes.
 *
 * REQ-data-pinned-view.
 */

describe("Pinned views routes (Wave 0 RED)", () => {
  it.todo("POST persists a kpi_strip pinned view scoped to {tenantId, userId}");
  it.todo("POST persists a bar_chart pinned view (Wave 1 viewType extension)");
  it.todo("POST persists an action_card pinned view (Wave 1 viewType extension)");
  it.todo("POST persists a draft_message pinned view (Wave 1 viewType extension)");
  it.todo("POST persists a callout pinned view (Wave 1 viewType extension)");
  it.todo("POST persists a time_series pinned view (Wave 1 viewType extension)");
  it.todo("POST persists refreshFrequency (manual | hourly | daily)");
  it.todo("GET lists only current user's pinned views (cross-user leak rejected)");
  it.todo("DELETE removes only own pinned view (cross-user delete returns 404)");
  it.todo("soft cap at 24 pinned views per user: 25th POST returns 200 with warning header");

  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
