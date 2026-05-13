/**
 * @wave 4 (Wave 0 RED → Wave 4 GREEN — flips here)
 *
 * PinnedViewsRail — collapsed-by-default horizontal rail of saved chat
 * views shown above the decisions inbox. Empty state hides the rail
 * entirely (no real estate wasted when nothing is pinned).
 *
 * REQ-data-pinned-view, REQ-chat-generated-dashboards.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PinnedViewsRail } from "@/components/decisions/PinnedViewsRail";
import type { RailViewLite } from "@/components/decisions/PinnedViewTile";

const sixViews: RailViewLite[] = Array.from({ length: 6 }, (_, i) => ({
  id: `pv-${i + 1}`,
  viewType: i % 2 === 0 ? "kpi_strip" : "table",
  title: `Pinned ${i + 1}`,
  spec: {},
}));

describe("PinnedViewsRail (Wave 4 GREEN)", () => {
  it("component is exported from @/components/decisions/PinnedViewsRail", () => {
    expect(PinnedViewsRail).toBeTruthy();
  });

  it("empty state hides the rail entirely", () => {
    const { container } = render(<PinnedViewsRail views={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders up to 6 tile titles in a row", () => {
    render(<PinnedViewsRail views={sixViews} />);
    sixViews.forEach((v) =>
      expect(screen.getByText(v.title)).toBeTruthy(),
    );
  });

  it("'View all' appears when there are >6 pinned views", () => {
    const seven: RailViewLite[] = [
      ...sixViews,
      { id: "pv-7", viewType: "callout", title: "Seventh", spec: {} },
    ];
    render(<PinnedViewsRail views={seven} />);
    expect(screen.getByRole("button", { name: /view all/i })).toBeTruthy();
  });

  it("unpin confirm fires onUnpin(id)", () => {
    const onUnpin = vi.fn();
    render(<PinnedViewsRail views={sixViews} onUnpin={onUnpin} />);
    const unpinBtn = screen.getAllByRole("button", { name: /unpin/i })[0];
    fireEvent.click(unpinBtn);
    expect(onUnpin).toHaveBeenCalledWith("pv-1");
  });
});
