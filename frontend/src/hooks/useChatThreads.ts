// Phase 4 Wave 3 — React Query wrappers around /api/chat/* CRUD.
// Local-only state belongs to the streaming hook (useStreamingChat); this
// hook owns the per-thread cache.
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api/chat";

export function useChatThreads(opts?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["chat-threads", opts ?? {}],
    queryFn: () => chatApi.listThreads(opts),
    staleTime: 30_000,
  });
}

export function useChatThread(id: string | null | undefined) {
  return useQuery({
    queryKey: ["chat-thread", id],
    queryFn: () => chatApi.getThread(id as string),
    enabled: !!id,
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (initialMessage?: string) => chatApi.createThread(initialMessage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-threads"] }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatApi.deleteThread(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-threads"] }),
  });
}

export function usePatchThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { title?: string; pinned?: boolean } }) =>
      chatApi.patchThread(id, patch),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["chat-threads"] });
      qc.invalidateQueries({ queryKey: ["chat-thread", vars.id] });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      chatApi.sendMessage(threadId, content),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["chat-thread", vars.threadId] });
    },
  });
}
