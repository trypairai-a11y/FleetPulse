// Phase 4 Wave 4 — React Query wrappers for /api/pinned-views.
// 30s refetch interval drives "live" tile refresh; user-initiated
// refresh + unpin invalidate the same key.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pinnedViewsApi } from "@/lib/api/pinnedViews";

const KEY = ["pinned-views"] as const;

export function usePinnedViews() {
  return useQuery({
    queryKey: KEY,
    queryFn: pinnedViewsApi.list,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useUnpinView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pinnedViewsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useRefreshPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pinnedViewsApi.refresh(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
