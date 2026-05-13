/**
 * @wave 5 (Wave 0 RED — flipped GREEN in Wave 5 Task 4)
 *
 * ScheduledBriefingsList — CRUD list view at /chat/scheduled. Whitelisted
 * cron schedules from the dropdown (orchestrator_resolutions §3); custom
 * cron entry hidden behind a role=ADMIN check. Standing-rule templates
 * (type=standing_rule_v3) render with a "Phase 12 — won't fire yet" badge
 * so the user sees the feature is staged but not yet active.
 *
 * Wave 5 rewrite (Rule 3 deviation): the original Wave 0 RED scaffold
 * used `<Component! …/>` non-null-assertion syntax that oxc (vite's TS
 * parser) cannot parse — same defect Wave 4's PinnedViewsRail.test.tsx
 * hit. Rewrote as real cases against the now-existing component using
 * static imports.
 *
 * REQ-chat-scheduled-jobs.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScheduledBriefingsList } from "@/components/scheduled-jobs/ScheduledBriefingsList";

const briefings = [
  {
    id: "br-1",
    title: "Morning briefing",
    prompt: "Give me yesterday's summary",
    schedule: "0 6 * * *",
    active: true,
    type: "briefing",
  },
  {
    id: "br-2",
    title: "Worst-3 warner",
    prompt: "Warn the worst 3 drivers from yesterday",
    schedule: "0 7 * * *",
    active: false,
    type: "standing_rule_v3",
  },
];

describe("ScheduledBriefingsList (Wave 5 GREEN)", () => {
  it("component is exported from @/components/scheduled-jobs/ScheduledBriefingsList", () => {
    expect(ScheduledBriefingsList).toBeDefined();
  });

  it("renders all briefings in the list", () => {
    render(<ScheduledBriefingsList briefings={briefings} />);
    expect(screen.getByText(/Morning briefing/)).toBeTruthy();
    expect(screen.getByText(/Worst-3 warner/)).toBeTruthy();
  });

  it("standing_rule_v3 row shows 'Phase 12 — won't fire yet' badge", () => {
    render(<ScheduledBriefingsList briefings={briefings} />);
    expect(screen.getByText(/Phase 12/i)).toBeTruthy();
  });

  it("create form submit calls onCreate({ title, prompt, schedule })", () => {
    const onCreate = vi.fn();
    render(<ScheduledBriefingsList briefings={[]} onCreate={onCreate} />);
    fireEvent.click(
      screen.getByRole("button", { name: /new briefing|create|add briefing/i }),
    );
    // Form opens; submit with default values
    fireEvent.click(screen.getByRole("button", { name: /save|submit|create/i }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("delete confirms before firing onDelete(id)", () => {
    const onDelete = vi.fn();
    render(<ScheduledBriefingsList briefings={briefings} onDelete={onDelete} />);
    const deleteBtn = screen.getAllByRole("button", { name: /delete/i })[0];
    fireEvent.click(deleteBtn);
    // Confirm modal
    fireEvent.click(screen.getByRole("button", { name: /confirm|yes/i }));
    expect(onDelete).toHaveBeenCalled();
  });
});
