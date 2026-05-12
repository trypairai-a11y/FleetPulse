// Wave 0 chat-view fixtures — one per GeneratedView variant.
// Consumed by ChatViewRenderer.test.tsx + (future) chat snapshot tests.
//
// Wave 1 Task 4 ships frontend/src/types/chat.ts exporting GeneratedView.
// Until then we use a local structural alias so the fixture file parses
// without import resolution. This alias is intentionally `any` so that
// Wave 1's stricter type catches every fixture in one go (forcing the
// reviewer to look at all 9 fixtures together).
//
// REQ-chat-generated-dashboards.

// TODO(Wave 1 Task 4): replace with `import type { GeneratedView } from "@/types/chat";`
type GeneratedView = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export const fixtureKpiStrip: GeneratedView = {
  id: "fx-kpi-1",
  viewType: "kpi_strip",
  title: "Yesterday's revenue",
  spec: {
    tiles: [
      { label: "Revenue", value: "KD 1,247", delta: { pct: -12, direction: "down" }, tone: "danger" },
      { label: "Coverage", value: "18 / 22", delta: { pct: -18, direction: "down" }, tone: "warning" },
      { label: "Reject %", value: "4.2%", delta: { pct: 1.1, direction: "up" }, tone: "warning" },
    ],
  },
  pinnable: true,
};

export const fixtureTable: GeneratedView = {
  id: "fx-tab-1",
  viewType: "table",
  title: "Late or missed today (Hawally)",
  spec: {
    columns: ["Driver", "Platform", "Status", "Late by"],
    rows: [
      { Driver: "Mohamed Khaled", Platform: "Talabat", Status: "Late", "Late by": "14 min" },
      { Driver: "Ali Hassan", Platform: "Keeta", Status: "Missed", "Late by": "—" },
      { Driver: "Tariq N.", Platform: "Deliveroo", Status: "Late", "Late by": "3 min" },
    ],
  },
  pinnable: true,
};

export const fixtureTimeSeries: GeneratedView = {
  id: "fx-ts-1",
  viewType: "time_series",
  title: "Tariq — 30-day score",
  spec: {
    series: [
      {
        name: "score",
        points: Array.from({ length: 30 }, (_, i) => ({
          x: `2026-04-${String(i + 1).padStart(2, "0")}`,
          y: 80 + Math.round(Math.sin(i / 4) * 8 + i / 5),
        })),
      },
    ],
  },
  pinnable: true,
};

export const fixtureBarChart: GeneratedView = {
  id: "fx-bar-1",
  viewType: "bar_chart",
  title: "Revenue by zone (yesterday)",
  spec: {
    bars: [
      { label: "Hawally", value: 1247 },
      { label: "Avenues", value: 980 },
      { label: "Salmiya", value: 740 },
      { label: "Jabriya", value: 510 },
    ],
  },
  pinnable: true,
};

export const fixtureMiniMap: GeneratedView = {
  id: "fx-map-1",
  viewType: "mini_map",
  title: "Mohamed Khaled — last seen",
  spec: {
    markers: [
      { lat: 29.3325, lng: 47.9834, label: "Mohamed Khaled", platform: "Talabat" },
    ],
    center: { lat: 29.3325, lng: 47.9834 },
    zoom: 13,
  },
  pinnable: true,
};

export const fixtureComparisonCards: GeneratedView = {
  id: "fx-cmp-1",
  viewType: "comparison_cards",
  title: "Cash exposure — Talabat vs Keeta",
  spec: {
    cards: [
      { title: "Talabat", value: "KD 812.750", delta: { pct: 8, direction: "up" }, tone: "warning" },
      { title: "Keeta", value: "KD 416.250", delta: { pct: -3, direction: "down" }, tone: "info" },
    ],
  },
  pinnable: true,
};

export const fixtureCallout: GeneratedView = {
  id: "fx-co-1",
  viewType: "callout",
  spec: {
    severity: "info",
    message: "Deleting driver records is out of scope for v1. Open a ticket to request this change.",
  },
  pinnable: false,
};

export const fixtureActionCard: GeneratedView = {
  id: "fx-ac-1",
  viewType: "action_card",
  title: "Warn the worst 3 drivers from yesterday",
  spec: {
    pendingActionId: "pa-1",
    ctaLabel: "Approve & send",
    subject: "Mohamed Khaled, Ali Hassan, Tariq N.",
    body: "3 drafted SMS warnings. Click Approve to send all three.",
  },
  pinnable: false,
};

export const fixtureDraftMessage: GeneratedView = {
  id: "fx-dm-1",
  viewType: "draft_message",
  title: "Draft SMS — Mohamed Khaled",
  spec: {
    recipient: "Mohamed Khaled",
    recipientPhone: "+96599887766",
    channel: "sms",
    body: "Hi Mohamed, please make sure to clock in on time. You were 14 minutes late yesterday.",
  },
  pinnable: false,
};

export const allFixtures: GeneratedView[] = [
  fixtureKpiStrip,
  fixtureTable,
  fixtureTimeSeries,
  fixtureBarChart,
  fixtureMiniMap,
  fixtureComparisonCards,
  fixtureCallout,
  fixtureActionCard,
  fixtureDraftMessage,
];
