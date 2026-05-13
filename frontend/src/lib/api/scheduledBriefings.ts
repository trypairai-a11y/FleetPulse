// Phase 4 Wave 5 — axios client for /api/scheduled-briefings CRUD.
// Consumed by useScheduledBriefings / useCreateBriefing / useToggleBriefing
// / useDeleteBriefing.

import api from "@/lib/api";
import type { ScheduledBriefing } from "@/types/chat";

export interface CreateBriefingBody {
  name: string;
  cron: string;
  prompt: string;
  recipients?: string[];
  channels?: Array<"in_chat" | "email">;
  type?: "briefing" | "standing_rule_v3";
}

export const briefingsApi = {
  async list(): Promise<{ briefings: ScheduledBriefing[] }> {
    const { data } = await api.get("/api/scheduled-briefings");
    return data;
  },
  async create(body: CreateBriefingBody): Promise<{ briefing: ScheduledBriefing }> {
    const { data } = await api.post("/api/scheduled-briefings", body);
    return data;
  },
  async patch(
    id: string,
    body: Partial<{ active: boolean; name: string; cron: string; prompt: string }>,
  ): Promise<{ briefing: ScheduledBriefing }> {
    const { data } = await api.patch(`/api/scheduled-briefings/${id}`, body);
    return data;
  },
  async remove(id: string): Promise<{ ok: true }> {
    const { data } = await api.delete(`/api/scheduled-briefings/${id}`);
    return data;
  },
};
