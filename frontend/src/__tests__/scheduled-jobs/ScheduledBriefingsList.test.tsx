/**
 * @wave 5 (Wave 0 RED — flips GREEN in Wave 5 Task 4)
 *
 * ScheduledBriefingsList — CRUD list view at /scheduled-jobs. Whitelisted
 * cron schedules from the dropdown (orchestrator_resolutions §3); custom
 * cron entry hidden behind a role=ADMIN check. Standing-rule templates
 * (type=standing_rule_v3) render with a "Phase 12 — won't fire yet" badge
 * so the user sees the feature is staged but not yet active.
 *
 * Acceptable RED state today: the component does not yet exist.
 *
 * REQ-chat-scheduled-jobs.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let ScheduledBriefingsList: React.ComponentType<any> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ScheduledBriefingsList = require("@/components/scheduled-jobs/ScheduledBriefingsList").ScheduledBriefingsList;
} catch {
  ScheduledBriefingsList = null;
}

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

describe("ScheduledBriefingsList (Wave 0 RED — flips GREEN in Wave 5)", () => {
  it("component is exported from @/components/scheduled-jobs/ScheduledBriefingsList", () => {
    expect(ScheduledBriefingsList).not.toBeNull();
  });

  it("renders all briefings in the list", () => {
    render(<ScheduledBriefingsList! briefings={briefings} />);
    expect(screen.getByText(/Morning briefing/)).toBeTruthy();
    expect(screen.getByText(/Worst-3 warner/)).toBeTruthy();
  });

  it("standing_rule_v3 row shows 'Phase 12 — won't fire yet' badge", () => {
    render(<ScheduledBriefingsList! briefings={briefings} />);
    expect(screen.getByText(/Phase 12/i)).toBeTruthy();
  });

  it("create form submit calls onCreate({ title, prompt, schedule })", () => {
    const onCreate = vi.fn();
    render(<ScheduledBriefingsList! briefings={[]} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: /new briefing|create|add briefing/i }));
    // Form opens; submit with default values
    fireEvent.click(screen.getByRole("button", { name: /save|submit|create/i }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("delete confirms before firing onDelete(id)", () => {
    const onDelete = vi.fn();
    render(<ScheduledBriefingsList! briefings={briefings} onDelete={onDelete} />);
    const deleteBtn = screen.getAllByRole("button", { name: /delete|remove/i })[0];
    fireEvent.click(deleteBtn);
    // Confirm modal
    fireEvent.click(screen.getByRole("button", { name: /confirm|yes/i }));
    expect(onDelete).toHaveBeenCalled();
  });
});
