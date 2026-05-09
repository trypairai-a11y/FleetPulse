// Phase 2 Wave 5 — Frontend admin types.
//
// Mirrors backend Wave 4 admin response shapes (admin/onboarding.ts +
// admin/billing.ts + services/onboarding/reportBuilder.ts +
// services/billing/billingService.ts).
//
// REQ-pricing-model + REQ-gtm-onboarding.
//
// The DarbsReadReport component (and its Wave 0 RED test) speak a slightly
// looser shape than the strict backend ReportData — fields like
// `cover.founderSignature` (test) vs `cover.founderSignatureLine` (backend),
// `top5Performers[].name + compositeScore + orders` (test) vs
// `top5Performers[].driverName + score + ordersCompleted` (backend). The
// component normalizes both inputs at render time. The types here document
// the union surface so any caller can pass either shape and trust the
// component handles it.
//
// Numeric monetary fields use `number` (not Decimal) — the backend coerces
// Decimal → number at the report-builder boundary already.

// ─── Onboarding wizard ────────────────────────────────────────────────────

export interface TenantInfoFormData {
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  fleetSizeEstimate?: number;
  designPartner?: boolean;
  monthlyOverrideKd?: number | null;
}

export interface CreateTenantResponse {
  tenantId: string;
  tenantName: string;
  ownerUserId: string;
  tempPassword: string;
  tempPasswordNote?: string;
}

export interface ImportSummary {
  totalRows: number;
  valid: number;
  invalid: { missingPhone: number; duplicateCivilId: number };
  created: number;
}

export type BackwashPlatform = "KEETA" | "TALABAT" | "DELIVEROO" | "AMERICANA";

export interface PlatformCredsResponse {
  connected: boolean;
  platform: BackwashPlatform;
  note?: string;
  error?: string;
}

export interface BackwashStatus {
  jobId: string;
  state:
    | "waiting"
    | "active"
    | "completed"
    | "failed"
    | "delayed"
    | "paused"
    | "stuck"
    | "unknown";
  progress: {
    step?: number;
    totalSteps?: number;
    message?: string;
  } | number | null;
}

export interface RunBackwashResponse {
  jobId: string;
  tenantId: string;
}

// ─── Report shape ─────────────────────────────────────────────────────────
// Backend (Wave 4 reportBuilder) shape — strict. The DarbsReadReport
// component accepts EITHER this shape or the looser test-fixture shape.

export interface ReportCoverStrict {
  tenantName: string;
  fleetSize: number;
  dateRange: { from: string; to: string };
  founderSignatureLine: string;
}

export interface ReportTopLineNumbersStrict {
  totalOrders: number;
  totalRevenueKd: number;
  courierCount: number;
  totalOnlineHours: number;
  completionRate: number;
}

export interface PerformerRowStrict {
  driverId: string;
  driverName: string;
  score: number;
  ordersCompleted: number;
}

export interface BottomPerformerRowStrict extends PerformerRowStrict {
  agentCritique: string;
}

export interface CashExposureStrict {
  totalOutstandingKd: number;
  byPlatform: Record<string, number>;
  top3RiskyReceivables: Array<{
    driverId: string;
    driverName: string;
    amountKd: number;
  }>;
}

export interface ViolationsSummaryStrict {
  countByType: Record<string, number>;
  mostCommonPattern: string;
}

export interface ReportCardStrict {
  action: string;
  reasoning: string;
  courierName: string;
  dateRange: { from: string; to: string };
}

export interface WhatThisCostsStrict {
  fleetSize: number;
  computedKd: number;
  floorKd: number;
  overrideKd: number | null;
  netKd: number;
  breakdown: string;
}

export interface ReportFooterStrict {
  contactEmail: string;
  signatureLine: string;
  trialStartButtonHref: string;
}

export interface ReportData {
  cover: ReportCoverStrict | {
    tenantName: string;
    fleetSize?: number;
    dateRange: { from: string; to: string };
    founderSignature?: string;
    founderSignatureLine?: string;
  };
  topLineNumbers: ReportTopLineNumbersStrict | {
    totalOrders: number;
    totalRevenueKd: number;
    courierCount: number;
    onlineHours?: number;
    totalOnlineHours?: number;
    completionRate: number;
  };
  top5Performers: Array<
    PerformerRowStrict | {
      driverId: string;
      name?: string;
      driverName?: string;
      compositeScore?: number;
      score?: number;
      orders?: number;
      ordersCompleted?: number;
      revenueKd?: number;
    }
  >;
  bottom5Performers: Array<
    BottomPerformerRowStrict | {
      driverId: string;
      name?: string;
      driverName?: string;
      compositeScore?: number;
      score?: number;
      orders?: number;
      ordersCompleted?: number;
      revenueKd?: number;
      critique?: string;
      agentCritique?: string;
    }
  >;
  cashExposure: CashExposureStrict | {
    totalOutstandingKd: number;
    byPlatform: Record<string, number>;
    topRisks?: Array<{
      driverId: string;
      driverName: string;
      amountKd: number;
    }>;
    top3RiskyReceivables?: Array<{
      driverId: string;
      driverName: string;
      amountKd: number;
    }>;
  };
  violations: ViolationsSummaryStrict | {
    totalCount?: number;
    byType?: Record<string, number>;
    countByType?: Record<string, number>;
    mostCommonPattern: string;
  };
  whatDarbWouldHaveDone: ReportCardStrict[];
  whatThisCosts: WhatThisCostsStrict | {
    fleetSize: number;
    formula?: string;
    monthlyKd?: number;
    computedKd?: number;
    floorKd?: number;
    overrideKd?: number | null;
    netKd?: number;
    breakdown?: string;
  };
  footer: ReportFooterStrict | {
    contactEmail?: string;
    contactName?: string;
    signatureLine?: string;
    trialDays?: number;
    trialStartButtonHref?: string;
  };
}

export interface StartTrialRequest {
  designPartner?: boolean;
  overrideKd?: number | null;
}

export interface StartTrialResponse {
  tenantId: string;
  designPartner: boolean;
  monthlyOverrideKd: number | null;
  trialEndsAt: string;
  auditId: string;
}

// ─── Billing dashboard ────────────────────────────────────────────────────

export interface BillingTenant {
  tenantId: string;
  tenantName?: string;
  activeCouriers: number;
  computedKd: number;
  override: number | null;
  netKd: number;
  designPartner: boolean;
  trialEndsAt: Date | string | null;
}

export interface BillingTotals {
  tenantCount: number;
  mrrKd: number;
  activeCouriersAcrossFleets: number;
}

export interface BillingListResponse {
  month: string;
  tenants: BillingTenant[];
  totals: BillingTotals;
}

export interface BillingDetail {
  bill: BillingTenant & { yearMonth: string };
  past6Months: Array<BillingTenant & { yearMonth: string }>;
  pastInvoices: Array<{
    id: string;
    amountKd?: number;
    issuedAt?: string;
    [k: string]: unknown;
  }>;
}

export interface OverrideUpdateRequest {
  override: number | null;
  reason: string;
}

export interface OverrideUpdateResponse {
  tenantId: string;
  override: number | null;
  previousOverride: number | null;
  auditId: string;
}
