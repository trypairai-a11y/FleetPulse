// Phase 4 Wave 3 — axios client for /api/chat/* CRUD endpoints.
// Wraps the existing axios singleton from @/lib/api (cookie auth + refresh).
import api from "@/lib/api";
import type { ChatThread, ChatMessage } from "@/types/chat";

export interface ListThreadsResponse {
  threads: ChatThread[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  grouped?: {
    today: ChatThread[];
    yesterday: ChatThread[];
    thisWeek: ChatThread[];
    older: ChatThread[];
  };
  search?: { matches: unknown[] };
}

export interface GetThreadResponse {
  thread: ChatThread;
  messages: ChatMessage[];
  hasMoreMessages: boolean;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessageId: string;
}

export const chatApi = {
  async createThread(initialMessage?: string): Promise<{ thread: ChatThread }> {
    const { data } = await api.post("/api/chat/threads", { initialMessage });
    return data;
  },
  async listThreads(opts?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ListThreadsResponse> {
    const { data } = await api.get("/api/chat/threads", { params: opts });
    return data;
  },
  async getThread(id: string): Promise<GetThreadResponse> {
    const { data } = await api.get(`/api/chat/threads/${id}`);
    return data;
  },
  async patchThread(
    id: string,
    patch: { title?: string; pinned?: boolean },
  ): Promise<{ thread: ChatThread }> {
    const { data } = await api.patch(`/api/chat/threads/${id}`, patch);
    return data;
  },
  async deleteThread(id: string): Promise<{ ok: true }> {
    const { data } = await api.delete(`/api/chat/threads/${id}`);
    return data;
  },
  async sendMessage(
    threadId: string,
    content: string,
  ): Promise<SendMessageResponse> {
    const { data } = await api.post(
      `/api/chat/threads/${threadId}/messages`,
      { content },
    );
    return data;
  },
  async cancelMessage(messageId: string): Promise<{ ok: true }> {
    const { data } = await api.post(`/api/chat/messages/${messageId}/cancel`);
    return data;
  },
  async getMessage(messageId: string): Promise<{ message: ChatMessage }> {
    const { data } = await api.get(`/api/chat/messages/${messageId}`);
    return data;
  },
};

export default chatApi;
