// Phase 2 Wave 3 — Typed axios wrappers for the Decisions + Audit APIs.
// Mounts on the existing axios instance from @/lib/api so JWT cookie auth
// + 401 refresh interceptor flow through automatically.

import api from "@/lib/api";
import type {
  DecisionCardData,
  DecisionsListResponse,
  AgentActionDetail,
  AuditListResponse,
} from "@/types/decisions";

// ---- Decisions inbox ----

export interface ListDecisionsParams {
  status?: "pending" | "approved" | "dismissed" | "all";
  filter?:
    | "all"
    | "high-conf"
    | "this-week"
    | "penalty"
    | "cash"
    | "warn"
    | "suspend"
    | "promote";
  sort?: "priority" | "newest" | "confidence";
  page?: number;
  limit?: number;
}

export async function listDecisions(
  params: ListDecisionsParams = {},
): Promise<DecisionsListResponse> {
  const { data } = await api.get<DecisionsListResponse>("/api/decisions", {
    params,
  });
  return data;
}

export async function getPendingCount(): Promise<{ count: number }> {
  const { data } = await api.get<{ count: number }>(
    "/api/decisions/pending-count",
  );
  return data;
}

export async function getDecision(id: string): Promise<DecisionCardData> {
  const { data } = await api.get<DecisionCardData>(`/api/decisions/${id}`);
  return data;
}

export async function approveDecision(
  id: string,
  modifications?: Record<string, unknown>,
): Promise<{
  agentActionId: string;
  outcome: "success" | "failure";
  audit: unknown;
}> {
  const body = modifications ? { modifications } : {};
  const { data } = await api.post(`/api/decisions/${id}/approve`, body);
  return data;
}

export async function dismissDecision(
  id: string,
  reason: string,
): Promise<{ agentMemoryId: string }> {
  const { data } = await api.post(`/api/decisions/${id}/dismiss`, { reason });
  return data;
}

export async function undoDecision(
  id: string,
): Promise<{ agentActionId: string; rolledBackAt: string }> {
  const { data } = await api.post(`/api/decisions/${id}/undo`);
  return data;
}

// ---- Audit log ----

export interface ListAuditParams {
  dateFrom?: string;
  dateTo?: string;
  toolName?: string;
  outcome?: "success" | "failure" | "rolled_back";
  approverId?: string;
  subjectType?: string;
  subjectId?: string;
  page?: number;
  limit?: number;
}

export async function listAuditActions(
  params: ListAuditParams = {},
): Promise<AuditListResponse> {
  const { data } = await api.get<AuditListResponse>(
    "/api/audit/agent-actions",
    { params },
  );
  return data;
}

export async function getAuditAction(id: string): Promise<AgentActionDetail> {
  const { data } = await api.get<AgentActionDetail>(
    `/api/audit/agent-actions/${id}`,
  );
  return data;
}

export async function rollbackAuditAction(
  id: string,
  reason: string,
): Promise<{ agentActionId: string; rolledBackAt: string }> {
  const { data } = await api.post(
    `/api/audit/agent-actions/${id}/rollback`,
    { reason },
  );
  return data;
}
