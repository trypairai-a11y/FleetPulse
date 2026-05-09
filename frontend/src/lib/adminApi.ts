// Phase 2 Wave 5 — Typed axios wrappers for the /api/admin/onboarding/*
// and /api/admin/billing/* endpoints. Mounts on the existing axios
// instance from @/lib/api so JWT cookie auth + 401 refresh interceptor
// flow through automatically.
//
// REQ-pricing-model + REQ-gtm-onboarding.
//
// All endpoints are super-admin gated server-side (requireSuperAdmin).
// The frontend sidebar conditionally renders the admin section based on
// /api/auth/me's isSuperAdmin flag (Wave 5 enriched the auth route).

import api from "@/lib/api";
import type {
  TenantInfoFormData,
  CreateTenantResponse,
  ImportSummary,
  PlatformCredsResponse,
  BackwashStatus,
  RunBackwashResponse,
  ReportData,
  StartTrialRequest,
  StartTrialResponse,
  BillingListResponse,
  BillingDetail,
  OverrideUpdateRequest,
  OverrideUpdateResponse,
  BackwashPlatform,
} from "@/types/admin";

// Re-export approveDecision so admin pages that need to surface a decision
// approval (rare but referenced by the plan's `contains: "approveDecision"`
// hint) can pull it from a single import path.
export { approveDecision } from "@/lib/decisionsApi";

// ─── Onboarding wizard ────────────────────────────────────────────────────

export async function createTenant(
  data: TenantInfoFormData,
): Promise<CreateTenantResponse> {
  const { data: resp } = await api.post<CreateTenantResponse>(
    "/api/admin/onboarding/tenants",
    data,
  );
  return resp;
}

export async function importCouriers(
  tenantId: string,
  file: File,
): Promise<ImportSummary> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<ImportSummary>(
    `/api/admin/onboarding/tenants/${tenantId}/couriers/import`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export interface PlatformCredsRequest {
  platform: BackwashPlatform;
  username: string;
  password: string;
  enabled?: boolean;
}

export async function setPlatformCredentials(
  tenantId: string,
  data: PlatformCredsRequest,
): Promise<PlatformCredsResponse> {
  const { data: resp } = await api.post<PlatformCredsResponse>(
    `/api/admin/onboarding/tenants/${tenantId}/platform-credentials`,
    data,
  );
  return resp;
}

export interface RunBackwashRequest {
  windowDays?: number;
  platforms?: BackwashPlatform[];
}

export async function runBackwash(
  tenantId: string,
  body: RunBackwashRequest = {},
): Promise<RunBackwashResponse> {
  const { data } = await api.post<RunBackwashResponse>(
    `/api/admin/onboarding/tenants/${tenantId}/run-backwash`,
    body,
  );
  return data;
}

export async function getBackwashStatus(
  tenantId: string,
  jobId: string,
): Promise<BackwashStatus> {
  const { data } = await api.get<BackwashStatus>(
    `/api/admin/onboarding/tenants/${tenantId}/backwash-status`,
    { params: { jobId } },
  );
  return data;
}

export async function getReport(
  tenantId: string,
  windowDays?: number,
): Promise<ReportData> {
  const { data } = await api.get<ReportData>(
    `/api/admin/onboarding/tenants/${tenantId}/report`,
    { params: windowDays != null ? { windowDays } : undefined },
  );
  return data;
}

export async function startTrial(
  tenantId: string,
  body: StartTrialRequest,
): Promise<StartTrialResponse> {
  const { data } = await api.post<StartTrialResponse>(
    `/api/admin/onboarding/tenants/${tenantId}/start-trial`,
    body,
  );
  return data;
}

// ─── Billing dashboard ────────────────────────────────────────────────────

export async function listBilling(
  month?: string,
): Promise<BillingListResponse> {
  const { data } = await api.get<BillingListResponse>(
    "/api/admin/billing/tenants",
    { params: month ? { month } : undefined },
  );
  return data;
}

export async function getBillingDetail(
  tenantId: string,
  month?: string,
): Promise<BillingDetail> {
  const { data } = await api.get<BillingDetail>(
    `/api/admin/billing/tenants/${tenantId}`,
    { params: month ? { month } : undefined },
  );
  return data;
}

export async function patchOverride(
  tenantId: string,
  body: OverrideUpdateRequest,
): Promise<OverrideUpdateResponse> {
  const { data } = await api.patch<OverrideUpdateResponse>(
    `/api/admin/billing/tenants/${tenantId}/override`,
    body,
  );
  return data;
}
