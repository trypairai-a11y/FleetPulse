// Wave 0 RED test — turns GREEN in Wave 2 when
// frontend/src/components/decisions/DecisionsList.tsx ships. Do not skip.
//
// Behavior contract (CON-decisions-card-shape + UI-SPEC §3.1):
//   - Renders N cards from a `cards` prop.
//   - Cmd+Enter on the focused card triggers onApprove(card.id).
//   - Empty state appears when cards.length === 0.
//
// REQ-decisions-proposal-inbox.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// Wave 2 will create this component; the import is intentionally
// unresolvable in Wave 0 to surface a module-not-found RED state.
import { DecisionsList } from "@/components/decisions/DecisionsList";

const mockCards = [
  {
    id: "pa-1",
    tag: "Warn" as const,
    confidence: 0.85,
    headline:
      "Mohamed Khaled (driver_xy12) — 3 late clock-ins this week",
    reasoning:
      "I noticed Mohamed clocked in late 3 times this week. Same driver had 2 late clock-ins last week. Trend: regression.",
    state: "pending" as const,
    toolName: "draftCourierMessage",
    toolIsLive: true,
    subjectType: "Driver",
    subjectId: "drv_xy12",
    driverName: "Mohamed Khaled",
    createdAt: "2026-05-09T06:31:00Z",
    originalProposal: { driverId: "drv_xy12", body: "..." },
  },
  {
    id: "pa-2",
    tag: "Cash reminder" as const,
    confidence: 0.92,
    headline:
      "Cash reminder: Ali (driver_z73) owes KD 28.500 from Keeta settlement",
    reasoning: "Settlement gap detected on 2026-05-08; pending dues KD 28.500.",
    state: "pending" as const,
    toolName: "draftCourierMessage",
    toolIsLive: true,
    subjectType: "Driver",
    subjectId: "drv_z73",
    driverName: "Ali Hassan",
    createdAt: "2026-05-09T06:32:00Z",
    originalProposal: { driverId: "drv_z73", body: "..." },
  },
  {
    id: "pa-3",
    tag: "Suspend" as const,
    confidence: 0.7,
    headline:
      "Suspend driver_aa11 — 5 cancellations today, GPS-stale 4 times",
    reasoning: "Pattern suggests intentional non-engagement.",
    state: "pending" as const,
    toolName: "suspendDriver",
    toolIsLive: false, // Phase 8 tool, audit-only in Phase 2
    subjectType: "Driver",
    subjectId: "drv_aa11",
    driverName: "Yousef",
    createdAt: "2026-05-09T06:33:00Z",
    originalProposal: { driverId: "drv_aa11" },
  },
];

describe("REQ-decisions-proposal-inbox: DecisionsList", () => {
  it("renders N cards from the cards prop", () => {
    const onApprove = vi.fn();
    render(
      <DecisionsList
        cards={mockCards}
        loading={false}
        onApprove={onApprove}
        onDismiss={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Mohamed Khaled/i)).toBeInTheDocument();
    expect(screen.getByText(/Ali Hassan/i)).toBeInTheDocument();
    expect(screen.getByText(/Yousef/i)).toBeInTheDocument();
  });

  it("Cmd+Enter on focused card triggers onApprove(card.id)", () => {
    const onApprove = vi.fn();
    render(
      <DecisionsList
        cards={mockCards}
        loading={false}
        onApprove={onApprove}
        onDismiss={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    // The first card is auto-focused when the list mounts.
    fireEvent.keyDown(window, {
      key: "Enter",
      metaKey: true,
    });
    expect(onApprove).toHaveBeenCalledWith("pa-1");
  });

  it("shows the empty state when cards array is []", () => {
    render(
      <DecisionsList
        cards={[]}
        loading={false}
        onApprove={vi.fn()}
        onDismiss={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    // From UI-SPEC §3.1.6 — "Nothing for you right now."
    expect(screen.getByText(/nothing for you right now/i)).toBeInTheDocument();
  });
});
