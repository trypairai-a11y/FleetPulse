// Per-user saved generated views. Phase 4 (chat) writes via "Pin to Home";
// Phase 1 ships CRUD only.
//
// All queries scope by BOTH tenantId AND userId (T-01-W2-04 mitigation:
// listPinsForUser cannot leak another user's pins; removePinnedView
// triple-scopes by id+tenantId+userId via a find-then-delete pattern).
//
// REQ-data-pinned-view.

import { prisma } from "../config";

export type PinnedViewType =
  // Phase 1 originals
  | "table"
  | "chart"
  | "kpi_strip"
  | "map"
  | "comparison"
  // Phase 4 Wave 1 — 5 new variants matching describeView's discriminated union
  | "bar_chart"
  | "time_series"
  | "callout"
  | "action_card"
  | "draft_message";

export type RefreshFrequency = "on_open" | "live" | "static";

export interface PinnedViewSpec {
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  viewType: PinnedViewType;
  spec: object; // generated-view spec (chart config, query, format)
  sortOrder?: number;
  // Phase 4 Wave 1 — refresh behaviour + chat-origin link (UI-SPEC §3.2.7).
  refreshFrequency?: RefreshFrequency;
  sourceThreadId?: string;
  sourceMessageId?: string;
}

export interface PinnedViewRecord extends PinnedViewSpec {
  id: string;
  pinnedAt: Date;
  lastViewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TYPES: ReadonlySet<string> = new Set([
  "table",
  "chart",
  "kpi_strip",
  "map",
  "comparison",
  // Phase 4 Wave 1
  "bar_chart",
  "time_series",
  "callout",
  "action_card",
  "draft_message",
]);

const VALID_REFRESH: ReadonlySet<string> = new Set([
  "on_open",
  "live",
  "static",
]);

export async function createPinnedView(
  view: PinnedViewSpec,
): Promise<{ id: string }> {
  if (!view.tenantId) throw new Error("createPinnedView: tenantId required");
  if (!view.userId) throw new Error("createPinnedView: userId required");
  if (!view.title) throw new Error("createPinnedView: title required");
  if (!VALID_TYPES.has(view.viewType)) {
    throw new Error(`createPinnedView: invalid viewType "${view.viewType}"`);
  }

  if (
    view.refreshFrequency !== undefined &&
    !VALID_REFRESH.has(view.refreshFrequency)
  ) {
    throw new Error(
      `createPinnedView: invalid refreshFrequency "${view.refreshFrequency}"`,
    );
  }

  const created = await prisma.pinnedView.create({
    data: {
      tenantId: view.tenantId,
      userId: view.userId,
      title: view.title,
      description: view.description ?? null,
      viewType: view.viewType,
      spec: view.spec as any,
      sortOrder: view.sortOrder ?? 0,
      refreshFrequency: view.refreshFrequency ?? "on_open",
      sourceThreadId: view.sourceThreadId ?? null,
      sourceMessageId: view.sourceMessageId ?? null,
    },
  });
  return { id: created.id };
}

export async function listPinsForUser(
  tenantId: string,
  userId: string,
): Promise<PinnedViewRecord[]> {
  if (!tenantId) throw new Error("listPinsForUser: tenantId required");
  if (!userId) throw new Error("listPinsForUser: userId required");

  const rows = await prisma.pinnedView.findMany({
    where: { tenantId, userId },
    orderBy: { sortOrder: "asc" },
  });
  return rows as unknown as PinnedViewRecord[];
}

export async function removePinnedView(
  id: string,
  tenantId: string,
  userId: string,
): Promise<{ removed: boolean }> {
  if (!id || !tenantId || !userId) {
    throw new Error("removePinnedView: id, tenantId, userId required");
  }
  // Two-step (find + delete), both scoped, so a foreign user/tenant cannot
  // delete via id-guess (T-01-W2-04 defense-in-depth).
  const existing = await prisma.pinnedView.findFirst({
    where: { id, tenantId, userId },
  });
  if (!existing) return { removed: false };
  await prisma.pinnedView.delete({ where: { id } });
  return { removed: true };
}
