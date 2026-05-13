// Phase 4 Wave 1 — chat surface types. Mirror of backend Zod schemas + the
// ChatThread / ChatMessage / ScheduledBriefing Prisma models.
//
// See:
//   backend/src/agent/tools/view/describeView.ts  (describeView Zod union)
//   backend/src/services/chatHistoryService.ts    (persistence API)
//   backend/prisma/schema.prisma                  (ChatThread / ChatMessage)

import type { ViewSpec } from "./views";

export type ViewType =
  | "kpi_strip"
  | "table"
  | "time_series"
  | "bar_chart"
  | "mini_map"
  | "comparison_cards"
  | "callout"
  | "action_card"
  | "draft_message";

export interface GeneratedView {
  id: string;
  viewType: ViewType;
  title?: string;
  subtitle?: string;
  spec: ViewSpec | Record<string, unknown>;
  pinnable: boolean;
  pinnedViewId?: string;
}

export interface ChatThread {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  preview?: string;
  pinned: boolean;
  source: "user" | "briefing";
  briefingId?: string;
  createdAt: string;
  lastMessageAt: string;
  archivedAt?: string;
}

export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatMessageState =
  | "queued"
  | "tool_running"
  | "streaming"
  | "complete"
  | "error"
  | "cancelled";

export interface ToolCallRecord {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  state: "running" | "success" | "error";
  latencyMs?: number;
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: ChatMessageRole;
  content: string;
  views: GeneratedView[];
  toolCalls: ToolCallRecord[];
  proposalId?: string;
  state: ChatMessageState;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  modelName?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface StreamingState {
  phase:
    | "idle"
    | "queued"
    | "tool_running"
    | "streaming_text"
    | "streaming_view"
    | "complete"
    | "error"
    | "cancelled";
  msgId?: string;
  toolName?: string;
  errorMessage?: string;
}

export interface ScheduledBriefing {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  cron: string;
  prompt: string;
  recipients: string[];
  channels: Array<"in_chat" | "email">;
  type: "briefing" | "standing_rule_v3";
  active: boolean;
  nextFireAt?: string;
  lastFireAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlashCommand {
  name: string;
  description: string;
  example?: string;
}

// Phase 4 Wave 4 — pinned generated views, mirror of backend PinnedView model.
// `refreshFrequency` controls how the tile re-fetches: "on_open" rebuilds
// from runAgent when first viewed, "live" polls every 30s via React Query,
// "static" is frozen at pin time.
export interface PinnedView {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  viewType: ViewType;
  spec: ViewSpec | Record<string, unknown>;
  sortOrder: number;
  refreshFrequency: "on_open" | "live" | "static";
  sourceThreadId?: string;
  sourceMessageId?: string;
  pinnedAt: string;
  lastViewedAt: string;
}
