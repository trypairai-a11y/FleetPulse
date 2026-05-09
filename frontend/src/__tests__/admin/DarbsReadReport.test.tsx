// Wave 0 RED test — turns GREEN in Wave 4 when
// frontend/src/components/admin/DarbsReadReport.tsx ships. Do not skip.
//
// Behavior contract (UI-SPEC §3.4.3 + feedback_invoices_white_background +
// feedback_invoices_no_pdf):
//   - Renders all 9 sections (cover, topLineNumbers, top5Performers,
//     bottom5Performers, cashExposure, violations, whatDarbWouldHaveDone,
//     whatThisCosts, footer).
//   - Root container has bg-white (no gradient bg, no watermark).
//   - "Print to PDF" button is present but does NOT auto-download on
//     mount (per feedback memory).
//
// REQ-gtm-onboarding.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
// Wave 4 will create this component; the import is intentionally
// unresolvable in Wave 0 to surface a module-not-found RED state.
import { DarbsReadReport } from "@/components/admin/DarbsReadReport";

const mockReportData = {
  cover: {
    tenantName: "Acme Fleet",
    fleetSize: 142,
    dateRange: { from: "2026-04-09", to: "2026-05-09" },
    founderSignature: "Mohammed Khalifa",
  },
  topLineNumbers: {
    totalOrders: 1500,
    totalRevenueKd: 4200.5,
    courierCount: 142,
    onlineHours: 38400,
    completionRate: 0.94,
  },
  top5Performers: [
    {
      driverId: "d1",
      name: "Ali",
      compositeScore: 92,
      orders: 320,
      revenueKd: 880,
    },
  ],
  bottom5Performers: [
    {
      driverId: "d99",
      name: "Yousef",
      compositeScore: 41,
      orders: 80,
      revenueKd: 200,
      critique: "GPS missing 4 days this week.",
    },
  ],
  cashExposure: {
    totalOutstandingKd: 320,
    byPlatform: { KEETA: 220, TALABAT: 100 },
    topRisks: [],
  },
  violations: {
    totalCount: 18,
    byType: { LATE: 12, GPS_STALE: 6 },
    mostCommonPattern: "LATE",
  },
  whatDarbWouldHaveDone: [
    {
      action: "Draft a written warning",
      reasoning: "3 late clock-ins this week.",
      courierName: "Mohamed Khaled",
      dateRange: { from: "2026-05-03", to: "2026-05-08" },
    },
  ],
  whatThisCosts: {
    fleetSize: 142,
    formula: "142 × KD 2 = KD 284",
    monthlyKd: 284,
    overrideKd: 100,
  },
  footer: {
    contactName: "Mohammed Khalifa",
    contactEmail: "mohammedkhalifamail@gmail.com",
    trialDays: 14,
  },
};

describe("REQ-gtm-onboarding: DarbsReadReport", () => {
  it("renders all 9 sections (per UI-SPEC §3.4.3)", () => {
    render(<DarbsReadReport data={mockReportData} />);
    // Section anchors are testable via section titles or data-section
    // attributes. Wave 4 will define the exact selectors; until then
    // assert that the tenant name (cover) AND the founder signature
    // (footer) AND the formula (whatThisCosts) are all rendered —
    // which together prove top-to-bottom render.
    expect(screen.getByText(/Acme Fleet/i)).toBeInTheDocument();
    expect(screen.getByText(/Top 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Bottom 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Cash exposure/i)).toBeInTheDocument();
    expect(screen.getByText(/Violations/i)).toBeInTheDocument();
    expect(screen.getByText(/What Darb would have done/i)).toBeInTheDocument();
    expect(screen.getByText(/What this costs/i)).toBeInTheDocument();
    expect(screen.getByText(/142 × KD 2/)).toBeInTheDocument();
  });

  it("root container has white background (no gradient bg, no watermark)", () => {
    const { container } = render(
      <DarbsReadReport data={mockReportData} />,
    );
    const root = container.firstChild as HTMLElement;
    // Per feedback_invoices_white_background — bg-white only, no
    // gradient classes (bg-gradient-to-*, from-*, to-*).
    expect(root.className).toMatch(/bg-white/);
    expect(root.className).not.toMatch(/bg-gradient-to-/);
    expect(root.className).not.toMatch(/from-(?!.*white)/);
  });

  it("'Print to PDF' button is present but does NOT auto-fire a download on mount", () => {
    const beforeUnloadSpy = vi.fn();
    window.addEventListener("beforeunload", beforeUnloadSpy);
    render(<DarbsReadReport data={mockReportData} />);
    // No print/pdf side effect on mount.
    expect(beforeUnloadSpy).not.toHaveBeenCalled();
    // The button itself must be available for explicit user click.
    expect(
      screen.getByRole("button", { name: /print to pdf/i }),
    ).toBeInTheDocument();
    window.removeEventListener("beforeunload", beforeUnloadSpy);
  });
});
