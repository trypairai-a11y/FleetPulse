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
  | "table"
  | "chart"
  | "kpi_strip"
  | "map"
  | "comparison";

export interface PinnedViewSpec {
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  viewType: PinnedViewType;
  spec: object; // generated-view spec (chart config, query, format)
  sortOrder?: number;
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

  const created = await prisma.pinnedView.create({
    data: {
      tenantId: view.tenantId,
      userId: view.userId,
      title: view.title,
      description: view.description ?? null,
      viewType: view.viewType,
      spec: view.spec as any,
      sortOrder: view.sortOrder ?? 0,
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
