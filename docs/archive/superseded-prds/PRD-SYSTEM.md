# PRD-SYSTEM — Darb System-Level Spec

**Version:** 0.1
**Date:** 20 April 2026
**Owner:** Khalifa
**Audience:** Claude Code + product + ops + infra
**Convention:** Feature IDs `S1`–`S12`. Decisions `DS1`–`DS22`. Follows the same format as `PRD-RESTRUCTURE.md`, `PRD-DELIVEROO.md`, `PRD-AMERICANA.md`.

---

## 1. What this PRD covers (and what it doesn't)

**In scope (cross-cutting, platform-agnostic):**
- SaaS tenancy backbone — tenant lifecycle, super-admin console, role matrix, usage metering.
- Global tabs — Overview (cross-platform exec landing) and Analytics (KPIs + Charts + AI Insights).
- Observability — Sentry + structured logs.
- Audit log + PII handling.
- Data retention worker (tiered hot/cold/archive).
- AI cost meter + per-tenant kill-switch.
- Environments (Dev/Staging/Prod).
- Design system tokens.

**Out of scope (covered by per-platform PRDs):**
- Keeta, Talabat, Deliveroo, Americana specifics — see `KEETA-PARITY-SPEC.md`, `PRD-RESTRUCTURE.md`, `PRD-DELIVEROO.md`, `PRD-AMERICANA.md`.

**Explicitly not being built in v1:**
- Self-service tenant signup (sales-assisted only).
- Invoice generation and payment collection (finance handles outside Darb).
- WhatsApp integration.
- Transactional email (in-app + push only; see DS12).
- Live Map, Tickets, Recruitment (all dropped or deferred).
- Full Arabic translation coverage (i18n scaffolded, not translated).
- Historical data migration tooling (clean-slate onboarding).
- Anomaly detection, AI digest emails, contract-OCR uploader.
- Feature flag system (all tenants on all features; `featureFlags.ts` in repo as escape hatch only).
- Per-tenant branding / white-label theming.

---

## 2. Target state in one paragraph

Darb is a multi-tenant fleet-ops SaaS for Kuwait delivery operators. Tenants are onboarded by Darb ops staff through a guided provisioning wizard. Each tenant runs their Keeta, Talabat, Deliveroo, and Americana operations on the same shared infrastructure, with logical tenant isolation enforced at the database layer. Drivers use one Expo mobile app for check-in and screenshot ingestion; supervisors and managers use the web dashboard. Darb tracks per-tenant active-driver usage monthly for finance's external invoicing. Claude is used only for OCR in v1 with a metered cost cap; every other AI feature is v2. Observability is Sentry + JSON logs. Retention is tiered 90d hot / 2y cold / 7y archive. All mutations are audit-logged; PII is handled with column-level awareness.

---

## 3. Implementation order

| # | ID | Title | Priority | Depends on |
|---|---|---|---|---|
| 1 | S1 | Tenant lifecycle + super-admin console | P0 | — |
| 2 | S2 | Role matrix + `SUPER_ADMIN`/`BILLING_ADMIN` + permission matrix file | P0 | S1 |
| 3 | S3 | Usage metering (monthly active-driver count) | P0 | S1 |
| 4 | S4 | AI cost meter + per-tenant kill-switch | P0 | S1 |
| 5 | S5 | Global Overview (cross-platform exec landing) | P0 | All platform PRDs |
| 6 | S6 | Global Analytics (KPIs + Charts + AI Insights sub-sections) | P1 | S5 |
| 7 | S7 | Observability (Sentry + structured logs) | P0 | — |
| 8 | S8 | Audit log + PII-aware handling | P1 | S1 |
| 9 | S9 | Retention worker (tiered) | P2 | S1 |
| 10 | S10 | Design system tokens + Shadcn theme doc | P2 | — |
| 11 | S11 | Environments + deployment pipeline | P0 | — |
| 12 | S12 | In-app notification delivery (no email) | P0 | — |

---

## 4. Feature specs

### S1 — Tenant lifecycle + super-admin console

**New top-level route visible only to `SUPER_ADMIN`:** `/tenants`

**Prisma additions:**

```prisma
model TenantProvisioningRun {
  id              String   @id @default(cuid())
  tenantId        String
  status          String   // "DRAFT" | "IN_PROGRESS" | "READY" | "ABANDONED"
  startedBy       String   // super-admin user
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  steps           Json     // { company: done, platforms: done, drivers: pending, ... }
  notes           String?

  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  @@index([status])
}

// Extend Tenant:
// status       String   @default("ACTIVE") // ACTIVE | SUSPENDED | ARCHIVED
// suspendedAt  DateTime?
// suspendedReason String?
// branding     Json?    // reserved for v2 white-label; null in v1
```

**Provisioning wizard (Darb ops-facing, lives in `/tenants/new`):**

Steps:
1. **Company** — name, legal name, tax ID, primary contact, address, timezone (default `Asia/Kuwait`).
2. **Platforms** — which platforms to enable (Keeta, Talabat, Deliveroo, Americana).
3. **First admin** — create the tenant's first `ADMIN` user (email, name, initial password the ops specialist will share manually — no email sent; see DS12).
4. **Americana seed** (only if Americana enabled) — chains, stores, rates (manual entry; no contract OCR in v1, see DS3).
5. **Drivers stub** — CSV upload or skip (no historical data migration; this is just the initial roster).
6. **Handoff** — ops specialist schedules first training session; mark `READY`.

**Impersonation for support:**
- `POST /api/tenants/:id/impersonate` — SUPER_ADMIN only. Returns a short-lived (30 min) JWT with `originalUserId` claim preserved for audit.
- Banner on UI while impersonating: "Impersonating {tenant name} as SUPER_ADMIN — [Exit]".
- Every request during impersonation logs to audit with both identities.

**Routes:**
```
GET  /api/tenants                      # list all (SUPER_ADMIN)
POST /api/tenants                      # create (starts provisioning run)
GET  /api/tenants/:id                  # detail
PATCH /api/tenants/:id                 # update (status, notes, platforms)
POST /api/tenants/:id/suspend          # suspend access
POST /api/tenants/:id/resume
POST /api/tenants/:id/impersonate
GET  /api/tenants/:id/provisioning     # current provisioning run state
PATCH /api/tenants/:id/provisioning    # mark steps complete
```

**Acceptance:**
- A Darb ops specialist can create a new tenant and reach the READY state in <30 min.
- Impersonation works end-to-end; all actions are audit-logged under both identities.
- Suspended tenant: users cannot log in; data is preserved.

---

### S2 — Role matrix + permission matrix file

**Role set (7 total):**

| Role | Scope | Who |
|---|---|---|
| `SUPER_ADMIN` | Darb staff, cross-tenant | Darb's ops + engineering |
| `ADMIN` | Tenant, full access | Tenant's owner/CEO |
| `OPS_MANAGER` | Tenant, ops-wide | Ops directors |
| `SUPERVISOR` | Tenant, ops read + some write | Field supervisors |
| `ACCOUNTANT` | Tenant, financial views + reports | Finance team |
| `BILLING_ADMIN` | Tenant, usage/billing views only | *v1: exists but unused. v2: active for self-service billing.* |
| `VIEWER` | Tenant, read-only | Auditors, observers |

**Permission matrix file:**

`backend/src/auth/permissionMatrix.ts` — exports a typed map:

```ts
export const PERMISSIONS = {
  'drivers.create':   ['ADMIN', 'OPS_MANAGER'],
  'drivers.update':   ['ADMIN', 'OPS_MANAGER', 'SUPERVISOR'],
  'drivers.delete':   ['ADMIN'],
  'violations.override': ['ADMIN', 'OPS_MANAGER', 'SUPERVISOR'],
  'americana.ingest.approve': ['ADMIN', 'OPS_MANAGER'],
  'tenants.impersonate': ['SUPER_ADMIN'],
  'tenants.create':   ['SUPER_ADMIN'],
  'cash.reconcile':   ['ACCOUNTANT', 'OPS_MANAGER', 'ADMIN'],
  // ... full matrix ~80 entries expected
} as const;

export type Permission = keyof typeof PERMISSIONS;
export function hasPermission(role: Role, p: Permission): boolean;
```

**Middleware:** `requirePermission('drivers.create')` — 403 if role not in the list.

**Frontend:** `usePermission('drivers.create')` hook returning `boolean`; used to hide or disable UI elements.

**Acceptance:**
- Matrix is the single source of truth; every route and UI element references it by key.
- Code review blocks any route without a `requirePermission()` call (add lint rule).
- Impersonation respects the impersonated user's role, not the impersonator's.

---

### S3 — Usage metering (monthly active-driver count)

**Intent:** Darb tracks per-tenant usage so finance can invoice tenants externally. Darb does **not** generate invoices or collect payment in v1 (DS11).

**Definition of "active driver":** A driver is active in month M for tenant T if they have **any** of: a shift, an attendance record, an order/metrics record, or a violation on any platform during M.

**Prisma additions:**

```prisma
model TenantUsageSnapshot {
  id                  String   @id @default(cuid())
  tenantId            String
  period              String   // "2026-04" (YYYY-MM)
  activeDriverCount   Int
  byPlatform          Json     // { KEETA: 45, TALABAT: 22, DELIVEROO: 18, AMERICANA: 30 }
  generatedAt         DateTime @default(now())
  lockedAt            DateTime? // once locked, cannot be recomputed
  lockedBy            String?

  tenant              Tenant   @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, period])
}
```

**Worker:** `backend/src/queues/usageMeteringWorker.ts` — runs daily.
- Computes current month's usage for every tenant.
- Upserts into `TenantUsageSnapshot` until the month locks on the 2nd of the following month.
- Once locked, finance can export the billing period.

**Route:**
```
GET  /api/tenants/:id/usage?period=YYYY-MM     # SUPER_ADMIN / BILLING_ADMIN
POST /api/tenants/:id/usage/:period/lock       # SUPER_ADMIN
GET  /api/usage/export?period=YYYY-MM          # CSV of all tenants' usage for a period
```

**UI:** In the `/tenants/:id` detail view, a "Usage" tab showing monthly active-driver count with platform breakdown and a "Lock & export" button.

---

### S4 — AI cost meter + per-tenant kill-switch

**Intent:** Since AI cost is unknown (DS4), every Claude call is metered and each tenant has a hard monthly cap. Crossing the cap degrades features gracefully instead of running up a bill.

**Prisma additions:**

```prisma
model AiCallLog {
  id              String   @id @default(cuid())
  tenantId        String
  feature         String   // "OCR_TALABAT" | "OCR_DELIVEROO" | ...
  model           String   // "claude-sonnet-4-6" etc
  promptTokens    Int
  completionTokens Int
  costUsd         Decimal  @db.Decimal(10, 6)
  latencyMs       Int
  status          String   // "OK" | "ERROR" | "RATE_LIMITED" | "KILL_SWITCH"
  refId           String?  // linked record (e.g., IngestRun.id)
  createdAt       DateTime @default(now())

  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, createdAt])
  @@index([tenantId, feature, createdAt])
}

// Extend Tenant with:
// aiMonthlyCapUsd Decimal? @db.Decimal(10, 2)  // e.g., 200.00
// aiKillSwitchOn  Boolean  @default(false)
```

**Service wrapper:** `backend/src/services/aiGate.ts`

```ts
export async function aiCall(tenantId: string, feature: string, fn: () => Promise<AiCallResult>) {
  const tenant = await getTenant(tenantId);
  if (tenant.aiKillSwitchOn) throw new AiKillSwitchError();
  const mtdCost = await getMtdAiCost(tenantId);
  if (tenant.aiMonthlyCapUsd && mtdCost >= tenant.aiMonthlyCapUsd) {
    await activateKillSwitch(tenantId, 'CAP_REACHED');
    throw new AiCapReachedError();
  }
  const start = Date.now();
  try {
    const result = await fn();
    await logAiCall(tenantId, feature, result, Date.now() - start, 'OK');
    return result;
  } catch (err) {
    await logAiCall(tenantId, feature, err, Date.now() - start, 'ERROR');
    throw err;
  }
}
```

**Degradation behavior when kill-switch is on or cap is reached:**
- OCR ingest: the screenshot is stored as `PENDING_MANUAL_REVIEW`; ops sees a banner and can manually re-key or wait for cap reset next month.
- Any future AI feature: same pattern — fall back to manual or feature disabled with banner.

**SUPER_ADMIN UI:** On `/tenants/:id`, a panel showing MTD AI cost, breakdown by feature, cap, kill-switch toggle, and an "AI call log" table (last 100 calls).

**Default cap for new tenants:** $50/month (low; SUPER_ADMIN raises on request).

---

### S5 — Global Overview (cross-platform exec landing)

**Route:** `frontend/src/app/(dashboard)/overview/page.tsx`

**Intent:** The one screen a tenant CEO opens first thing Monday. Cross-platform, scannable in 30 seconds.

**Cards:**

1. **Top strip — 4 KPI pills:**
   - Active drivers this week
   - Deliveries yesterday (sum across platforms)
   - Open violations (today)
   - Revenue MTD (sum across platforms) — Americana revenue + driver earnings from Keeta/Talabat/Deliveroo

2. **Deliveries by platform (stacked bar, last 14 days):**
   - Colors fixed per platform.
   - Click a bar → filter drill-through to that platform's overview.

3. **Exceptions today:**
   - Combined feed: Keeta violations today, Deliveroo unassigned orders, Americana no-shows, Talabat ingest failures.
   - Clickable rows → jump to that platform's violations/ingest page.
   - Limit 10 items; "See all" links deeper.

4. **Driver leaderboard (top 10 MTD):**
   - Cross-platform. Columns: name, platforms, total deliveries, tier, score.
   - Scoped to user's role (SUPERVISOR sees their area; ADMIN sees all).

**Route:** `GET /api/overview?tenant={auto}` — one call returns all four cards' data.

**Performance budget:** Overview loads in <1.5s on cold cache. Use materialized views for KPI pills (recomputed by `overviewMatworker` every 5 min) so landing is snappy.

---

### S6 — Global Analytics (KPIs + Charts + AI Insights)

**Route:** `frontend/src/app/(dashboard)/analytics/page.tsx` with three sub-sections (tabs within the page):

**Sub-section 1: KPIs**
- Uses existing `KpiDefinition` model.
- Tenant admin defines KPIs (name, formula, target, platform scope).
- Page shows current value vs. target with trend sparkline and a RAG (red/amber/green) dot.
- Examples: "On-time delivery rate", "Daily orders per driver", "Attendance %", "Violation count per 100 deliveries".

**Sub-section 2: Charts**
- Free-form chart explorer. Pick a metric, dimensions, filters → renders a chart.
- Chart types: line, bar, stacked bar, pie, table.
- Saved views: save a chart config for quick re-access.
- **No** drag-drop dashboard builder in v1 — just saved single charts.

**Sub-section 3: AI Insights**
- **v1: placeholder** — page exists, shows a "Coming in v2" message explaining the feature (Claude-generated narratives). Empty shell so tab structure is stable.
- v2: populated by the AI digest generator (see v2 backlog).

**Routes:**
```
GET  /api/analytics/kpis
GET  /api/analytics/kpis/:id/values?from=...&to=...
POST /api/analytics/kpis
GET  /api/analytics/chart?metric=...&dim=...&filter=...
POST /api/analytics/saved-views
GET  /api/analytics/saved-views
```

---

### S7 — Observability (Sentry + structured logs)

**Sentry:**
- `@sentry/nextjs` on frontend with release tagging + source maps.
- `@sentry/node` on backend with Express integration.
- DSN per environment; hide from git via env vars.
- Sample rate: 100% errors, 10% performance (adjust after first month of data).

**Structured logs:**
- `pino` (backend) + `pino-pretty` (dev only) + JSON in prod.
- Every log line: `timestamp`, `level`, `tenantId`, `userId`, `requestId`, `route`, `msg`, `extra`.
- Destination: Axiom or Better Stack (cheap, simple ingestion). Configured via env var.

**Correlation:**
- `X-Request-Id` header propagated from frontend → backend → workers.
- Every audit-log entry + Sentry event + log line shares the same request ID for a given user action.

**Metrics:**
- No custom metrics service in v1 beyond Sentry performance. v2 can add Prometheus if needed.

---

### S8 — Audit log + PII-aware handling

**Audit log:**

```prisma
model AuditLog {
  id              String   @id @default(cuid())
  tenantId        String?  // null for SUPER_ADMIN cross-tenant actions
  actorUserId     String
  actorRole       String
  impersonatedUserId String? // set when SUPER_ADMIN is impersonating
  action          String   // "driver.create", "violation.override", "tenant.suspend", ...
  resourceType    String
  resourceId      String?
  before          Json?    // previous state (diff view)
  after           Json?    // new state
  ip              String?
  userAgent       String?
  requestId       String?
  createdAt       DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([actorUserId, createdAt])
  @@index([resourceType, resourceId])
}
```

**Emitter:** `auditLog.emit(...)` — called by every mutation route. Helper wrapper around `prisma.auditLog.create` that enriches from request context.

**UI:** `/settings/audit` (ADMIN only) — filterable list, clickable rows open before/after diff viewer.

**Retention:** 7 years (locked by DS20) for financial + violation-related records; 2 years for everything else.

**PII-aware handling:**
- Driver phone, civil ID, passport number, photos, location: marked as PII in the Prisma schema via comment conventions.
- PII fields are **never** included in audit-log `before`/`after` payloads; masked as `"[PII]"`.
- Logs (pino) have a redaction list: `phone`, `civilId`, `passport`, `address` — automatically replaced with `"***"`.
- On driver offboarding, a soft-delete marks records `piiScrubbed=true`; a worker after a grace period (30 days, configurable) nulls the PII columns.

---

### S9 — Retention worker (tiered)

**Tiers:**

| Tier | Age | Location | Accessibility |
|---|---|---|---|
| Hot | 0–90 days | Postgres main tables | Queryable by all APIs + UI |
| Cold | 90 days – 2 years | Postgres archive schema (partitioned by month) | Queryable by explicit historical-API endpoints, slower |
| Archive | 2–7 years | S3 Parquet files (compressed, per-table per-month) | SUPER_ADMIN restore-on-demand only |

**Worker:** `backend/src/queues/retentionWorker.ts` — runs weekly (Sunday night).

Responsibilities:
1. Move hot rows older than 90 days into archive schema (`archive.keeta_metrics_2026_01`, etc.).
2. For archive schema rows older than 2 years, export to S3 Parquet, then hard-delete from Postgres.
3. For archive-S3 files older than 7 years, hard-delete from S3 (locked to financial + audit categories).
4. Emit completion notification to SUPER_ADMIN.

**Exceptions:** Audit log + financial records (invoices, cash collections, `AmericanaDailyOrders`) retained 7 years regardless of tier.

**Restore-on-demand:** `POST /api/tenants/:id/restore?table=...&period=YYYY-MM` — SUPER_ADMIN only; spins up a one-off job to materialize the Parquet back into a temporary table for read.

---

### S10 — Design system tokens + Shadcn theme

**New file:** `frontend/src/styles/tokens.ts`

```ts
export const tokens = {
  colors: {
    brand: { primary: '#0EA5E9', secondary: '#6366F1', accent: '#F59E0B' },
    platform: {
      keeta:     '#E63946',
      talabat:   '#FF5500',
      deliveroo: '#00CCBC',
      americana: '#1A1A2E',
    },
    status: { success: '#10B981', warn: '#F59E0B', danger: '#EF4444', info: '#3B82F6' },
    tier:   { gold: '#F4C430', silver: '#BFC1C2', bronze: '#CD7F32' },
  },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' },
  radius:  { sm: '4px', md: '8px', lg: '12px', pill: '999px' },
  typography: {
    h1: { size: '28px', weight: 700, lineHeight: '36px' },
    h2: { size: '22px', weight: 600, lineHeight: '30px' },
    body: { size: '14px', weight: 400, lineHeight: '22px' },
    caption: { size: '12px', weight: 400, lineHeight: '16px' },
  },
  elevation: { card: '0 1px 2px rgba(0,0,0,0.05)', popover: '0 8px 24px rgba(0,0,0,0.08)' },
};
```

**Shadcn theme:** `frontend/src/components/ui/theme.css` wired from tokens (CSS vars).

**Doc:** `frontend/src/styles/DESIGN-NOTES.md` — one-page rules for when to use which spacing, color, and component variant. No Storybook in v1.

**Used by:** Every new component starts by importing from `tokens`. Lint rule (Tailwind arbitrary-value blocker) enforces no hardcoded hex colors in new code.

---

### S11 — Environments + deployment pipeline

**Environments:**

| Env | URL | Purpose | Data |
|---|---|---|---|
| Dev | local / docker-compose | Developer iteration | Seed script data |
| Staging | `staging.darb.app` | QA + ops testing | Anonymized copy of prod schema; no real tenant data |
| Prod | `darb.app` | Real tenants | Real data, tiered retention applied |

**CI/CD (GitHub Actions or equivalent):**
- PR opens → lint, typecheck, unit tests, Prisma schema diff check.
- Merge to `main` → auto-deploy to staging.
- Manual promote (Actions workflow) → deploy to prod.
- Database migrations: Prisma Migrate in deploy step, with pre-check for destructive changes.

**Rollback:** `main` revert + redeploy. No feature-flag fallback in v1 (DS17).

**Escape hatch:** `frontend/src/lib/featureFlags.ts` and `backend/src/config/featureFlags.ts` — hardcoded tenant-scoped booleans that can be flipped by git commit + redeploy. Use only for emergencies (e.g., disable a broken AI feature for one tenant).

**Secrets:** Doppler / 1Password Secrets Automation / AWS Secrets Manager (pick one before first prod deploy). Not committed to git.

---

### S12 — In-app notification delivery (no email)

**Constraint (DS12):** No transactional email in v1. All notification delivery is in-app + mobile push.

**Channels:**

| Channel | Delivery | Where |
|---|---|---|
| In-app bell | Web dashboard top bar, SSE stream + bell dropdown (existing pattern, extended) | `/notifications` |
| Mobile push | Expo push (drivers only) | Mobile app |

**What this breaks (known gaps):**
- **Password reset** → SUPER_ADMIN-assisted reset only. Flow: user clicks "Forgot password" → shows "Contact your admin". Admin triggers a reset, which generates a one-time link shown in the admin UI for them to share manually. Ugly but fits sales-assisted onboarding.
- **Invoices** → not in Darb (DS11).
- **Digest emails** → v2.

**Notification categories** (from existing Keeta feature work): `IMPORTANT`, `OPS_TODO`, `BENEFITS`, `OTHER`. Add new categories as needed.

**Bilingual notification text:** infrastructure exists (`title`/`titleAr`, `body`/`bodyAr`) but only `title`/`body` populated in v1 per DS14.

---

## 5. Prisma delta summary (all new/changed)

**New:**
- `TenantProvisioningRun`
- `TenantUsageSnapshot`
- `AiCallLog`
- `AuditLog`

**Modified `Tenant`:**
- `status`, `suspendedAt`, `suspendedReason`
- `aiMonthlyCapUsd`, `aiKillSwitchOn`
- `branding` (nullable JSON, reserved)

**Enum additions:**
- `Role`: add `SUPER_ADMIN`, `BILLING_ADMIN`

---

## 6. Decisions log (system-level)

| ID | Decision |
|---|---|
| DS1 | Darb is a **multi-tenant SaaS** targeting 10+ tenants over 12 months. |
| DS2 | Onboarding is **sales-assisted, ops-provisioned** (no self-service signup). |
| DS3 | AI in v1 = **OCR only** (Talabat + Deliveroo). Contract OCR, anomaly detection, digests all → v2. |
| DS4 | AI cost is **metered** via `AiCallLog`; every tenant has a **monthly cap + kill-switch**. |
| DS5 | Mobile app is **driver-only** (screenshots + check-in + notifications). No supervisor app. |
| DS6 | **7 roles**: `SUPER_ADMIN` + `ADMIN` + `OPS_MANAGER` + `SUPERVISOR` + `ACCOUNTANT` + `BILLING_ADMIN` + `VIEWER`. |
| DS7 | **Permission matrix** lives in a single file (`backend/src/auth/permissionMatrix.ts`) and is the source of truth for both routes and UI. |
| DS8 | Global sidebar = **Overview · Analytics · Keeta · Talabat · Deliveroo · Americana · Settings** (+ Tenants for SUPER_ADMIN). |
| DS9 | Companies tab → **Tenants** (SUPER_ADMIN only). |
| DS10 | KPIs + Analytics + Insights → **single Analytics tab** with sub-sections. |
| DS11 | **No invoicing in Darb.** Darb surfaces `TenantUsageSnapshot`; finance invoices tenants externally. BILLING_ADMIN role reserved for v2. |
| DS12 | **No transactional email in v1.** All notifications are in-app + mobile push. Password reset is SUPER_ADMIN-assisted. |
| DS13 | **No WhatsApp integration** in v1. Flag this as an ops risk — Kuwait ops relies on WhatsApp externally. |
| DS14 | **English-only** copy in v1; i18n scaffolding built but no translations committed. |
| DS15 | **Live Map permanently dropped** from core scope (tenant-specific opt-in if requested). |
| DS16 | **Tickets + Recruitment** → v2. |
| DS17 | **No feature flag system.** All tenants get all features. A `featureFlags.ts` file in repo is the emergency escape hatch. |
| DS18 | **Observability** = Sentry + `pino` structured JSON logs → Axiom/Better Stack. |
| DS19 | **Audit log** is full (every mutation); retained 7y for financial/violation, 2y for everything else. PII redacted from audit payloads. |
| DS20 | **Retention** is tiered: 90d hot / 2y cold / 7y archive. Audit + financial always 7y. |
| DS21 | **Environments** = Dev · Staging · Prod. No canary rollouts (no flag system). |
| DS22 | **v1 done** = all 4 platforms ingesting + 5 tenants live + billing-active (externally) for 30 days. |

---

## 7. Risks and things that will hurt later

| Risk | Why | Mitigation |
|---|---|---|
| No WhatsApp | Kuwait ops live on WhatsApp; drivers and managers don't check email. | Measure notification open rates post-launch; revisit WhatsApp in v2 if adoption suffers. |
| No email | Password reset UX is ugly; no async notifications to execs. | SUPER_ADMIN-assisted reset; digest emails are v2. If the first tenant pushes back, add `@aws-sdk/client-ses` in a single file. |
| No feature flags | Rolling back a broken feature for one tenant means rollback for all. | The `featureFlags.ts` file with tenant-scoped booleans lets us kill a feature quickly; a 30-minute git-revert is acceptable at current scale. |
| No invoicing | Finance work remains Excel-bound; miscommunication risk on usage vs. billed. | Usage export CSV is the single source of truth; finance process wrap around it. |
| No Arabic | Adoption friction in Kuwait. | i18n scaffold ready; one translation sprint post-launch can flip to bilingual. |
| SaaS ambition vs. single-tenant starter code | Existing schema is multi-tenant but not battle-tested; tenant isolation bugs are most common SaaS bug. | Add a tenant-isolation integration test for every new route; randomly-seed a second tenant and assert zero cross-reads. |
| No anomaly detection / digest | Execs may churn if dashboards don't proactively tell them what's broken. | Weekly manual report from ops specialists in first months; v2 automation after usage data lands. |

---

## 8. Open items before code

- [ ] Pick secrets manager (Doppler / 1Password Secrets Automation / AWS Secrets Manager).
- [ ] Pick log destination (Axiom vs Better Stack).
- [ ] Decide hosting region (Vercel + Neon in closest region to Kuwait; or AWS Bahrain).
- [ ] Confirm default `aiMonthlyCapUsd` ($50 proposed).
- [ ] Seed permission matrix: list every route's permission key before implementation begins.
- [ ] Sketch the `/tenants/new` provisioning wizard UI before building.
- [ ] Draft the Overview materialized-view refresh interval (5 min proposed).
- [ ] Align with finance on the monthly CSV export column set for usage billing.

---

## 9. File manifest (new/modified)

**New files:**
```
backend/src/auth/permissionMatrix.ts
backend/src/middleware/requirePermission.ts
backend/src/middleware/auditLogEmitter.ts
backend/src/services/aiGate.ts
backend/src/services/tenantProvisioning.ts
backend/src/services/retentionScheduler.ts
backend/src/queues/usageMeteringWorker.ts
backend/src/queues/retentionWorker.ts
backend/src/queues/overviewMatWorker.ts
backend/src/routes/tenants.ts
backend/src/routes/overview.ts
backend/src/routes/analytics.ts
backend/src/routes/audit.ts
backend/src/routes/usage.ts
backend/src/config/featureFlags.ts
frontend/src/app/(dashboard)/overview/page.tsx
frontend/src/app/(dashboard)/analytics/page.tsx
frontend/src/app/(dashboard)/analytics/kpis/page.tsx
frontend/src/app/(dashboard)/analytics/charts/page.tsx
frontend/src/app/(dashboard)/analytics/insights/page.tsx
frontend/src/app/(dashboard)/tenants/page.tsx
frontend/src/app/(dashboard)/tenants/new/page.tsx
frontend/src/app/(dashboard)/tenants/[id]/page.tsx
frontend/src/app/(dashboard)/settings/audit/page.tsx
frontend/src/app/(dashboard)/settings/team/page.tsx
frontend/src/components/overview/KpiStrip.tsx
frontend/src/components/overview/DeliveriesByPlatformChart.tsx
frontend/src/components/overview/ExceptionsFeed.tsx
frontend/src/components/overview/CrossPlatformLeaderboard.tsx
frontend/src/components/analytics/KpiCard.tsx
frontend/src/components/analytics/ChartExplorer.tsx
frontend/src/lib/usePermission.ts
frontend/src/lib/featureFlags.ts
frontend/src/styles/tokens.ts
frontend/src/styles/DESIGN-NOTES.md
```

**Modified files:**
```
backend/prisma/schema.prisma                           # +4 models, +enum values, Tenant extensions
backend/src/middleware/auth.ts                         # wire SUPER_ADMIN, impersonation JWT
backend/src/middleware/tenantScope.ts                  # respect impersonation claim
backend/src/config/index.ts                            # Sentry DSN, log destination
frontend/src/components/layout/Sidebar.tsx             # new global tabs, role-aware rendering
frontend/src/components/layout/TopBar.tsx              # impersonation banner
frontend/src/app/layout.tsx                            # Sentry init, design tokens
```

---

## 10. How v1 ships (the ladder)

1. **Weeks 1–2:** S1 + S2 + S7 + S11 — stand up the SaaS spine (tenants, roles, observability, pipeline).
2. **Weeks 3–4:** S3 + S4 + S8 — metering, audit, AI cost control. Platform PRDs unblock in parallel.
3. **Weeks 5–6:** S5 + S12 — Overview + in-app notifications. First tenant (pilot) onboards.
4. **Weeks 7–8:** S6 + S10 — Analytics surface + design tokens rollout.
5. **Weeks 9–12:** S9 + hardening + 4 more tenants onboard. v1 closes per DS22.
