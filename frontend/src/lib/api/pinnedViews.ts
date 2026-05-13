// Phase 4 Wave 4 — axios client for /api/pinned-views CRUD + /:id/refresh.
// Consumed by usePinnedViews / useUnpinView / useRefreshPin hooks.

import api from "@/lib/api";
import type { PinnedView, ViewType } from "@/types/chat";

export type RefreshFrequency = "on_open" | "live" | "static";

export interface CreatePinBody {
  viewType: ViewType | string;
  spec: object;
  title: string;
  description?: string;
  sortOrder?: number;
  refreshFrequency?: RefreshFrequency;
  sourceThreadId?: string;
  sourceMessageId?: string;
}

export const pinnedViewsApi = {
  async list(): Promise<{ pinnedViews: PinnedView[] }> {
    const { data } = await api.get("/api/pinned-views");
    return data;
  },
  async create(
    body: CreatePinBody,
  ): Promise<{
    pinnedView: PinnedView;
    warnSoftCap?: boolean;
    deduplicated?: boolean;
  }> {
    const { data } = await api.post("/api/pinned-views", body);
    return data;
  },
  async patch(
    id: string,
    body: Partial<{
      title: string;
      description: string;
      sortOrder: number;
      refreshFrequency: RefreshFrequency;
    }>,
  ): Promise<{ pinnedView: PinnedView }> {
    const { data } = await api.patch(`/api/pinned-views/${id}`, body);
    return data;
  },
  async remove(id: string): Promise<{ ok: boolean }> {
    const { data } = await api.delete(`/api/pinned-views/${id}`);
    return data;
  },
  async refresh(
    id: string,
  ): Promise<{ pinnedView: PinnedView; refreshedSpec: unknown; note?: string }> {
    const { data } = await api.post(`/api/pinned-views/${id}/refresh`);
    return data;
  },
};
