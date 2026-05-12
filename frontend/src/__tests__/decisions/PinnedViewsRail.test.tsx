/**
 * @wave 4 (Wave 0 RED — flips GREEN in Wave 4 Task 2)
 *
 * PinnedViewsRail — collapsed-by-default horizontal rail of saved chat
 * views shown above the decisions inbox. Empty state hides the rail
 * entirely (no real estate wasted when nothing is pinned).
 *
 * Acceptable RED state today: the component does not yet exist.
 *
 * REQ-data-pinned-view, REQ-chat-generated-dashboards.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let PinnedViewsRail: React.ComponentType<any> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PinnedViewsRail = require("@/components/decisions/PinnedViewsRail").PinnedViewsRail;
} catch {
  PinnedViewsRail = null;
}

const sixViews = Array.from({ length: 6 }, (_, i) => ({
  id: `pv-${i + 1}`,
  viewType: i % 2 === 0 ? "kpi_strip" : "table",
  title: `Pinned ${i + 1}`,
  spec: {},
}));

describe("PinnedViewsRail (Wave 0 RED — flips GREEN in Wave 4)", () => {
  it("component is exported from @/components/decisions/PinnedViewsRail", () => {
    expect(PinnedViewsRail).not.toBeNull();
  });

  it("empty state hides the rail entirely", () => {
    const { container } = render(<PinnedViewsRail! views={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders up to 6 tile titles in a row", () => {
    render(<PinnedViewsRail! views={sixViews} />);
    sixViews.forEach((v) =>
      expect(screen.getByText(v.title)).toBeTruthy(),
    );
  });

  it("'View all' appears when there are >6 pinned views", () => {
    const seven = [...sixViews, { id: "pv-7", viewType: "callout", title: "Seventh", spec: {} }];
    render(<PinnedViewsRail! views={seven} />);
    expect(screen.getByRole("button", { name: /view all/i })).toBeTruthy();
  });

  it("unpin confirm fires onUnpin(id)", () => {
    const onUnpin = vi.fn();
    render(<PinnedViewsRail! views={sixViews} onUnpin={onUnpin} />);
    const unpinBtn = screen.getAllByRole("button", { name: /unpin/i })[0];
    fireEvent.click(unpinBtn);
    expect(onUnpin).toHaveBeenCalledWith("pv-1");
  });
});
