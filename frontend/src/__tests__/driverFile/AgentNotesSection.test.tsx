// Wave 0 RED test — turns GREEN in Wave 3 when
// frontend/src/components/driver-file/AgentNotes.tsx ships.
//
// REQ-driver-file (agent notes sub-tabs with AuditEntryDetail reuse).

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// Wave 3 creates this — RED state today.
// @ts-expect-error wave-3-creates
import AgentNotes from "@/components/driver-file/AgentNotes";
import { mockDriverFileData } from "./__fixtures__/mockDriverFileData";

describe("AgentNotesSection (RED — Wave 3)", () => {
  it("renders 3 sub-tabs: Recent proposals, Observations, Audit log", () => {
    render(<AgentNotes notes={mockDriverFileData.agentNotes} />);
    expect(screen.getByRole("tab", { name: /Recent proposals/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Observations/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Audit log/i })).toBeInTheDocument();
  });

  it("default active tab is Recent proposals", () => {
    render(<AgentNotes notes={mockDriverFileData.agentNotes} />);
    expect(screen.getByRole("tab", { name: /Recent proposals/i })).toHaveAttribute("aria-selected", "true");
  });

  it("renders empty-state copy 'Darb hasn't proposed anything for this driver yet.' when no notes", () => {
    render(<AgentNotes notes={{ proposals: [], observations: [], audit: [] }} />);
    expect(screen.getByText(/Darb hasn't proposed anything for this driver yet/i)).toBeInTheDocument();
  });

  it("clicking Audit log tab + a row opens AuditEntryDetail SlidePanel", () => {
    const audit = [{ id: "a1", toolName: "draftCourierMessage", createdAt: "2026-05-01T10:00:00Z" }];
    render(<AgentNotes notes={{ proposals: [], observations: [], audit }} />);
    fireEvent.click(screen.getByRole("tab", { name: /Audit log/i }));
    fireEvent.click(screen.getByText(/draftCourierMessage/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
