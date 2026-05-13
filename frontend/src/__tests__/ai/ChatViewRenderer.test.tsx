/**
 * @wave 3 (Wave 0 RED — flips GREEN in Wave 3 Task 5)
 *
 * ChatViewRenderer renders all 9 viewType variants from a GeneratedView
 * (chat-views fixture). Unknown viewType falls back to a safe error
 * renderer (T-04-W0-07 mitigation — no `dangerouslySetInnerHTML` anywhere).
 *
 * Acceptable RED state today: the component file does not yet exist, so
 * `require("@/components/chat/ChatViewRenderer")` throws.
 *
 * REQ-chat-generated-dashboards.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Wave 3 ships frontend/src/components/chat/ChatViewRenderer.tsx.
// Static import resolves the @/ alias via Vitest's Vite resolver.
import { ChatViewRenderer as _ChatViewRenderer } from "@/components/chat/ChatViewRenderer";
const ChatViewRenderer: React.ComponentType<{ view: any }> = _ChatViewRenderer as never;

import {
  fixtureKpiStrip,
  fixtureTable,
  fixtureTimeSeries,
  fixtureBarChart,
  fixtureMiniMap,
  fixtureComparisonCards,
  fixtureCallout,
  fixtureActionCard,
  fixtureDraftMessage,
} from "../fixtures/chat-views";

describe("ChatViewRenderer (Wave 0 RED — flips GREEN in Wave 3)", () => {
  it("component is exported from @/components/chat/ChatViewRenderer", () => {
    expect(ChatViewRenderer).toBeDefined();
  });

  it("renders kpi_strip: shows tile labels and values", () => {
    render(<ChatViewRenderer view={fixtureKpiStrip} />);
    expect(screen.getByText(/revenue/i)).toBeTruthy();
    expect(screen.getByText(/KD 1,247/)).toBeTruthy();
  });

  it("renders table: column headers + at least one row", () => {
    render(<ChatViewRenderer view={fixtureTable} />);
    expect(screen.getByText(/Driver/)).toBeTruthy();
    expect(screen.getByText(/Mohamed Khaled/)).toBeTruthy();
  });

  it("renders time_series: chart container in DOM", () => {
    render(<ChatViewRenderer view={fixtureTimeSeries} />);
    expect(screen.getByText(/Tariq — 30-day score/)).toBeTruthy();
  });

  it("renders bar_chart: bar labels visible", () => {
    render(<ChatViewRenderer view={fixtureBarChart} />);
    expect(screen.getByText(/Hawally/)).toBeTruthy();
    expect(screen.getByText(/Avenues/)).toBeTruthy();
  });

  it("renders mini_map: marker label visible", () => {
    render(<ChatViewRenderer view={fixtureMiniMap} />);
    expect(screen.getByText(/Mohamed Khaled — last seen/)).toBeTruthy();
  });

  it("renders comparison_cards: both card titles visible", () => {
    render(<ChatViewRenderer view={fixtureComparisonCards} />);
    expect(screen.getByText("Talabat")).toBeTruthy();
    expect(screen.getByText("Keeta")).toBeTruthy();
  });

  it("renders callout: message visible with severity styling", () => {
    render(<ChatViewRenderer view={fixtureCallout} />);
    expect(screen.getByText(/Deleting driver records is out of scope/)).toBeTruthy();
  });

  it("renders action_card: CTA label visible", () => {
    render(<ChatViewRenderer view={fixtureActionCard} />);
    expect(screen.getByText(/Approve & send/)).toBeTruthy();
  });

  it("renders draft_message: recipient + body visible", () => {
    render(<ChatViewRenderer view={fixtureDraftMessage} />);
    expect(screen.getByText(/Draft SMS/)).toBeTruthy();
    expect(screen.getByText(/clock in on time/)).toBeTruthy();
  });

  it("unknown viewType falls back to safe error renderer (no crash, no XSS)", () => {
    render(<ChatViewRenderer view={{ id: "fx-x", viewType: "wormhole", spec: {} }} />);
    expect(document.body.innerHTML).not.toMatch(/<script/i);
    expect(screen.getByText(/unsupported view|unknown view/i)).toBeTruthy();
  });
});
