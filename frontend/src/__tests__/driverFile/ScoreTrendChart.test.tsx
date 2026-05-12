// Wave 0 RED test — turns GREEN in Wave 3 when
// frontend/src/components/driver-file/ScoreTrendChart.tsx ships.
//
// REQ-driver-file (90-day trend chart).

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
// Wave 3 creates this — RED state today.
// @ts-expect-error wave-3-creates
import ScoreTrendChart from "@/components/driver-file/ScoreTrendChart";

describe("ScoreTrendChart (RED — Wave 3)", () => {
  it("renders explicit empty state 'No 90-day trend yet' when points is empty", () => {
    render(<ScoreTrendChart points={[]} />);
    expect(screen.getByText(/No 90-day trend yet/i)).toBeInTheDocument();
  });

  it("renders a LineChart when given >= 14 points; logs no React hydration warning", () => {
    const points = Array.from({ length: 14 }, (_, i) => ({
      snapshotDate: `2026-04-${String(i + 1).padStart(2, "0")}`,
      compositeScore: 70 + i,
    }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<ScoreTrendChart points={points} />);
    expect(container.querySelector(".recharts-responsive-container, .recharts-wrapper")).toBeTruthy();
    expect(warn).not.toHaveBeenCalledWith(expect.stringMatching(/hydration/i));
    expect(error).not.toHaveBeenCalledWith(expect.stringMatching(/hydration/i));
    warn.mockRestore();
    error.mockRestore();
  });
});
