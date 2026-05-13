// Phase 4 Wave 5 — React Query wrappers for /api/scheduled-briefings.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { briefingsApi, type CreateBriefingBody } from "@/lib/api/scheduledBriefings";

const KEY = ["scheduled-briefings"] as const;

export function useScheduledBriefings() {
  return useQuery({
    queryKey: KEY,
    queryFn: briefingsApi.list,
  });
}

export function useCreateBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBriefingBody) => briefingsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => briefingsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      briefingsApi.patch(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
