// Phase 4 Wave 1 — frontend mirror of backend Zod ViewSpec discriminated union.
// The shapes here MUST stay in lockstep with
//   backend/src/agent/tools/view/describeView.ts
// If you change one side, change the other in the same plan.
//
// Pure type declarations — no runtime code, no imports — zero bundle cost.

export interface KpiStripSpec {
  type: "kpi_strip";
  title?: string;
  tiles: Array<{
    label: string;
    value: string;
    delta?: { pct: number; direction: "up" | "down" } | null;
    tone?:
      | "positive"
      | "negative"
      | "neutral"
      | "success"
      | "warning"
      | "danger";
  }>;
}

export interface TableSpec {
  type: "table";
  title?: string;
  columns: Array<
    | string
    | {
        key: string;
        label: string;
        align?: "left" | "right";
        format?: "number" | "currency_kd" | "percent" | "date" | "text";
      }
  >;
  rows: Array<Record<string, string | number>>;
  sortable?: boolean;
  exportable?: boolean;
}

export interface TimeSeriesSpec {
  type: "time_series";
  title?: string;
  series?: Array<{
    name: string;
    points: Array<{ x: string | number; y: number }>;
  }>;
  xKey?: string;
  yKeys?: string[];
  data?: Array<Record<string, string | number>>;
  unit?: string;
  chartType?: "line" | "area";
}

export interface BarChartSpec {
  type: "bar_chart";
  title?: string;
  bars?: Array<{ label: string; value: number }>;
  xKey?: string;
  yKeys?: string[];
  data?: Array<Record<string, string | number>>;
  unit?: string;
  groupMode?: "grouped" | "stacked";
}

export interface MiniMapSpec {
  type: "mini_map";
  title?: string;
  center?: [number, number];
  zoom?: number;
  markers: Array<{
    id?: string;
    lat: number;
    lng: number;
    color?: string;
    label?: string;
  }>;
  showCluster?: boolean;
}

export interface ComparisonCardsSpec {
  type: "comparison_cards";
  title?: string;
  cards?: Array<{
    title: string;
    subtitle?: string;
    value?: string;
    metrics?: Array<{ label: string; value: string }>;
    tone?: "success" | "neutral" | "warning" | "danger";
  }>;
  items?: Array<{
    title: string;
    subtitle?: string;
    metrics: Array<{ label: string; value: string }>;
    tone?: "success" | "neutral" | "warning" | "danger";
  }>;
}

export interface CalloutSpec {
  type: "callout";
  severity?: "info" | "warning" | "danger" | "success";
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  message?: string;
  body?: string;
  bullets?: string[];
}

export interface ActionCardSpec {
  type: "action_card";
  title?: string;
  ctaLabel?: string;
  pendingActionId?: string;
  buttons?: Array<{
    label: string;
    intent: "primary" | "secondary" | "destructive";
    nextPrompt?: string;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
  }>;
}

export interface DraftMessageSpec {
  type: "draft_message";
  recipient:
    | string
    | { driverId: string; driverName: string; phone?: string };
  channel?: "whatsapp" | "sms" | "inbox" | "WHATSAPP" | "SMS" | "IN_APP";
  body?: string;
  bodyEn?: string;
  bodyAr?: string;
  intent?: string;
}

export type ViewSpec =
  | KpiStripSpec
  | TableSpec
  | TimeSeriesSpec
  | BarChartSpec
  | MiniMapSpec
  | ComparisonCardsSpec
  | CalloutSpec
  | ActionCardSpec
  | DraftMessageSpec;
