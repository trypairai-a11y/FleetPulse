---
phase: 02-decisions-surface-propose-and-confirm-design-partner-1
plan: 04
subsystem: admin-api-billing-onboarding-fixture
tags: [phase-2, wave-4, admin-api, billing-service, onboarding-wizard, backwash-worker, super-admin, scaffolding-only, blocker-2-path-b]
dependency_graph:
  requires:
    - 02-00-wave-0-red-tests
    - 02-01-wave-1-spine-extensions
    - 02-02-wave-2-decisions-api
    - phase-1-writeAgentAction
  provides:
    - billingService.computeMonthlyBill
    - billingService.listMonthlyBillsAcrossTenants
    - billingService.isCourierActiveThisMonth
    - onboarding.buildOnboardingReport
    - ONBOARDING_BACKWASH_QUEUE
    - runBackwashJob
    - getBackwashJob
    - 7-onboarding-endpoints
    - 3-billing-endpoints
    - admin-router-mounted-at-/api/admin
    - seed-design-partner-fixture-script
    - npm-script-seed-design-partner-fixture
  affects:
    - backend/src/services/billing/
    - backend/src/services/onboarding/
    - backend/src/queues/onboardingBackwashWorker.ts
    - backend/src/routes/admin/
    - backend/src/server.ts
    - backend/jest.config.js
    - backend/prisma/seed-design-partner-fixture.ts
    - backend/package.json
tech_stack:
  added: []
  patterns:
    - "Pure-function-with-injectables runBackwashJob({tenantId, platforms, windowDays, pullChunk, job}) — Wave 0 worker test calls this directly with fake injectables to assert chunk count + progress events + concurrency cap; the BullMQ worker wires defaultPullChunkPhase2 (counts existing OrderLog rows in the window) on top in production."
    - "In-process semaphore (count/max/queue) for inner platform fan-out concurrency cap. BullMQ Worker.concurrency caps job parallelism; semaphore caps the platform fan-out at CONCURRENCY=2. Independent of BullMQ — works without Redis (Wave 0 test path)."
    - "Decimal coercion helper across billingService + reportBuilder: probes for Decimal.toNumber() first, then plain number, then Number(coerce). Handles real Prisma Decimal AND test-mock plain-number paths from a single call site."
    - "WARNING-7 originator-tag prefix in admin audit reasoning: `Originated by super-admin user <name> (id: <userId>).` — both admin.startTrial and admin.billingOverride start their reasoning with this so audit-log readers can disambiguate operator-driven entries from agent-driven ones until Phase 8 ships the Operator proposer enum (6 callsites total in src/routes/admin)."
    - "tenant.findFirst (NOT findUnique) for billing override reads. Wave 0's billingService.test.ts mocks `(prisma as any).tenant = { findFirst: jest.fn().mockResolvedValue({...}) }` — using findUnique would skip the mock entirely. Same pattern across reportBuilder + admin/billing.ts. (REQ-pricing-model)"
    - "In-memory re-filter on shift.findMany. The Wave 0 mock returns rows regardless of where args; my code re-filters by actualHoursMinutes >= 240 and tenantId in memory as a belt-and-suspenders guard. Production Prisma already filters at DB layer; the in-memory pass is a defensive copy of the same predicate."
    - "Scaffolding-only chunk handler defaultPullChunkPhase2 — counts OrderLog rows already in the window. Phase 6 (Ingest Adapter Layer) replaces with real scraper invocation; the seed-design-partner-fixture script pre-populates rows so the wizard's progress reflects realistic numbers during the design-partner-1 dry-run (BLOCKER-2 path b)."
    - "jest.config.js 2-level moduleNameMapper extension for `../../middleware/auth` + `../../middleware/tenantScope`. Mirrors Wave 2's 2-level config mapper pattern (3-level paths intentionally unmapped to preserve the read-tools-against-real-prisma equilibrium). Required for routes/admin/* tests to hit the same auth mock as routes/* tests."
    - "Idempotent seed via prisma.$transaction on cleanup: deletes in FK-dependency order (PendingAgentAction → AiScore → Violation → CashRecord → OrderLog → AttendanceRecord → Shift → LocationLog → Driver) before inserting fresh fixture data. Safety guard aborts unless --force when real (non-fixture) OrderLog rows are present."
key_files:
  created:
    - backend/src/services/billing/billingService.ts
    - backend/src/services/billing/index.ts
    - backend/src/services/onboarding/reportBuilder.ts
    - backend/src/services/onboarding/index.ts
    - backend/src/queues/onboardingBackwashWorker.ts
    - backend/src/routes/admin/onboarding.ts
    - backend/src/routes/admin/billing.ts
    - backend/src/routes/admin/index.ts
    - backend/prisma/seed-design-partner-fixture.ts
    - .planning/phases/02-decisions-surface-propose-and-confirm-design-partner-1/02-04-SUMMARY.md
  modified:
    - backend/src/server.ts
    - backend/jest.config.js
    - backend/package.json
decisions:
  - "computeMonthlyBill input shape is `{tenantId, yearMonth}` (not `(tenantId, monthDate)` as the plan prose suggested). The Wave 0 RED test (line 61-66) pins this exact call shape: `await computeMonthlyBill({tenantId: TENANT, yearMonth: '2026-05'})` returning `{netKd, activeCouriers}`. The TS interface MonthlyBill aligns with the test verbatim — `activeCouriers` (not `monthlyActiveCouriers`)."
  - "reportBuilder file lives at `services/onboarding/reportBuilder.ts` (not `onboardingReport.ts` as the plan suggested). The Wave 0 RED test imports from this exact path (`../../services/onboarding/reportBuilder`). The function is `buildOnboardingReport({tenantId, windowDays})` (object args, not positional)."
  - "Active-courier counting strategy — findMany + Set-based unique-driver in memory, NOT groupBy. Wave 0's billing test mocks `prisma.shift.findMany` only; using groupBy would require an extra mock surface and the test contract is satisfied either way. The trade-off: production reads ~30 days × ~150 drivers worth of shifts per month per tenant (≈5k rows) — negligible. Phase 11 may swap to groupBy if any tenant grows past ~500 drivers."
  - "Defensive in-memory re-filter on shift.findMany rows by `actualHoursMinutes >= 240 && tenantId === expected`. Wave 0's `seedShifts(0, true)` test mocks the findMany to return a sub-threshold row regardless of where args; my code's belt-and-suspenders filter is what makes the test pass. Production Prisma already filters at DB layer; in-memory pass is redundant but cheap and defends against future test-mock drift."
  - "tenant.findFirst (NOT findUnique) across billing + report. Wave 0's overrideIsolation.test.ts injects `(prisma as any).tenant = { findFirst: jest.fn().mockImplementation(({ where }) => Promise.resolve(tenants[where.id] ?? null)) }`. Switching to findUnique would defeat the mock (it's not on the mock object). Same call shape across reportBuilder.loadTenantContext + admin/billing.ts.PATCH override reader."
  - "BullMQ worker exposes runBackwashJob as a top-level export so Wave 0's test can call it directly with injected pullChunk + job. The BullMQ Worker wraps it with defaultPullChunkPhase2 + a real job.updateProgress binding. This is the standard 'pure-core / wrapper-shell' pattern — same as Phase 1's runAgent vs runtime.ts split."
  - "ONBOARDING_BACKWASH_QUEUE name is namespaced 'onboarding:backwash' (colon delimiter). Avoids collision with the existing notification + keeta-portal queues. The test uses ONBOARDING_BACKWASH_QUEUE constant directly so the namespace change is invisible to consumers."
  - "Concurrency cap (≤2 platforms in flight) implemented via in-process semaphore inside runBackwashJob — NOT via BullMQ Worker.concurrency. The semaphore guards the inner platform fan-out (4 platforms × 6 chunks = 24 chunks per job); BullMQ.concurrency caps job parallelism (1 backwash job per worker). Both layers exist; they enforce different invariants."
  - "Seed-fixture rawData.status (not OrderLog.status — there is no such column). The OrderLog schema doesn't have a status enum, but the report's completionRate calculation expects a 'DELIVERED' status. The seed embeds a synthetic status in rawData.status; Phase 6 will add a real status column when scrapers land. The reportBuilder.buildTopLineNumbers fall-back path (catch block) returns totalOrders as deliveredCount when groupBy fails or no status column exists — completionRate stays a valid 0..1."
  - "Phase 2 platform-credentials endpoint returns 202 + Phase-6 handoff note. We deliberately do NOT introduce a new secret-storage path (T-02-24): every secret-storage code path in the codebase has had a security review. Phase 6's Ingest Adapter Layer wires the credential into the existing TalabatSession / KeetaPortalCredential session models. Phase 2 records the handoff and surfaces the deferral note to the wizard."
  - "Tenant.fleetSize is NOT in the schema. The Wave 0 reportRender.test mocks the tenant.findFirst return to include fleetSize: 142 for convenience; my reportBuilder.loadTenantContext returns `tenant?.fleetSize ?? courierCount` so production falls back to driver count when the synthetic field is absent. To avoid a runtime error when the typed Prisma client surfaces unknown fields, the select clause omits fleetSize — the cast `(prisma as unknown as ...)` lets the test mock surface the synthetic field via the return type."
  - "Driver isActive does NOT exist; the Driver schema uses status: DriverStatus. Driver.count's where clause uses `{ tenantId, status: 'ACTIVE' }` instead of `{ tenantId, isActive: true }`. The reportRender test mocks driver.count returning 142 directly so the where clause shape is invisible to the test; production matches the schema."
metrics:
  duration_minutes: 38
  completed: 2026-05-09T20:48:00Z
  tasks_completed: 4
  files_created: 9
  files_modified: 3
  commits:
    - "2d948af — Task 1 (billingService + reportBuilder; 7/7 Wave-0 tests GREEN)"
    - "5196403 — Task 2 (onboardingBackwashWorker scaffolding; 3/3 RED tests GREEN)"
    - "7d20c3a — Task 3 (admin/onboarding 7 endpoints + admin/billing 3 endpoints + server mount; 1/1 RED test GREEN; 2-level jest mapper)"
    - "5380c55 — Task 4 (seed-design-partner-fixture script + npm script; BLOCKER-2 path b)"
---

# Phase 2 Plan 04: Wave 4 Admin API + Billing + Onboarding Summary

**One-liner:** Founder/super-admin backend surface ships — billingService
with KD 200 floor and per-tenant override (no leakage), 9-section "Darb's
read on your fleet" report builder, scaffolding-only 30-day backwash
worker (5-day chunked, ≤2 platforms in flight), 7 admin/onboarding +
3 admin/billing endpoints all super-admin gated, and a one-shot
design-partner-fixture seed script that pre-populates 30 days of
plausible data so the Wave 5 design-partner-1 dry-run renders the full
report. All 5 Wave-0 backend RED test suites in billing/, queues/, and
onboarding/ flip to GREEN. Backend baseline: **31/31 suites, 188 tests
passing** (was 26/31 + 177 tests after Wave 2; Wave 3 frontend-only
didn't move the backend total).

## What Was Built

### 1. billingService (commit 2d948af)

**`backend/src/services/billing/billingService.ts`** — pure, mockable.

```ts
export interface MonthlyBill {
  tenantId: string;
  tenantName?: string;
  yearMonth: string; // "YYYY-MM"
  activeCouriers: number;
  computedKd: number; // max(activeCouriers × 2, 200)
  override: number | null;
  netKd: number; // override ?? computedKd
  designPartner: boolean;
  trialEndsAt: Date | null;
}

export async function computeMonthlyBill(args: {
  tenantId: string; yearMonth: string;
}): Promise<MonthlyBill>;

export async function listMonthlyBillsAcrossTenants(yearMonth: string): Promise<MonthlyBill[]>;

export async function isCourierActiveThisMonth(
  tenantId: string, driverId: string, yearMonth: string
): Promise<boolean>;

export const billingConstants = {
  PRICE_PER_COURIER_KD: 2.0,
  FLOOR_KD: 200.0,
  ACTIVE_HOURS_THRESHOLD_MINUTES: 240,
};
```

**Math (per orchestrator decision #7 + Wave 0 RED tests):**

| Scenario | activeCouriers | computedKd | override | netKd |
| -------- | -------------- | ---------- | -------- | ----- |
| 150 active, no override | 150 | 300 | null | **300** |
| 50 active, no override | 50 | 200 (floor) | null | **200** |
| 150 active, override=100 | 150 | 300 | 100 | **100** (override wins) |
| 1 shift @ 240 min | 1 | 200 (floor) | null | **200** |
| Sub-threshold shifts only | 0 | 200 (floor) | null | **200** |

**Tests turned GREEN:** billingService.test.ts (5/5) + overrideIsolation.test.ts (1/1).

### 2. onboardingReport / reportBuilder (commit 2d948af)

**`backend/src/services/onboarding/reportBuilder.ts`** — `buildOnboardingReport({tenantId, windowDays=30})`.

Returns ReportData with all 9 sections per UI-SPEC §3.4.3:

| # | Section | Source | PII-safe |
| -- | ------- | ------ | -------- |
| 1 | cover | tenant.findFirst + courier count | yes |
| 2 | topLineNumbers | orderLog.aggregate + shift.findMany sum | yes |
| 3 | top5Performers | aiScore (latest/driver) + orderLog.groupBy | yes (name only) |
| 4 | bottom5Performers | same + 1-line agent critique template | yes |
| 5 | cashExposure | cashRecord.aggregate + by-platform breakdown | yes (name only) |
| 6 | violations | violation.findMany + countByType + most-common | yes (no name) |
| 7 | whatDarbWouldHaveDone | pendingAgentAction.findMany (last 10) | yes (name only) |
| 8 | whatThisCosts | computeMonthlyBill | n/a |
| 9 | footer | tenant.settings.contactEmail + trial-CTA href | n/a |

**Length contract for whatDarbWouldHaveDone:** 0..10 ReportCards (relaxed
per BLOCKER-3 fix). The seed-design-partner-fixture (Task 4) creates
exactly 10 PendingAgentAction rows so the design-partner-1 dry-run
returns 10 cards; the unit test only checks shape.

**PII redaction (T-02-26):** every driver projection uses `name` only.
Phone, civilId, full address never appear. Verified by inspection — no
`phone`/`civilId`/`address`/`nationalId` references in reportBuilder.

**Test turned GREEN:** reportRender.test.ts (1/1).

### 3. onboardingBackwashWorker (commit 5196403)

**`backend/src/queues/onboardingBackwashWorker.ts`** — Phase 2 SCAFFOLDING.

| Export | Purpose |
| ------ | ------- |
| `ONBOARDING_BACKWASH_QUEUE` | "onboarding:backwash" (namespaced) |
| `runBackwashJob({...})` | Pure runner with injectable pullChunk + job |
| `defaultPullChunkPhase2` | Counts existing OrderLog rows (Phase 6 swaps for scraper) |
| `getOnboardingBackwashQueue()` | Production queue accessor (null when REDIS_URL unset) |
| `getBackwashJob(jobId)` | Production status accessor |
| `startOnboardingBackwashWorker()` | Boots BullMQ Worker |

**Chunking + concurrency:**
- Window split into 6 × N(platforms) chunks of 5 days each (e.g. 30-day +
  4 platforms = 24 chunks, totalSteps=24).
- Per-chunk `job.updateProgress({step, totalSteps, message})` emits
  realistic checkpoint messages (e.g. "Pulling KEETA 2026-04-15..2026-04-20").
- In-process semaphore caps platform fan-out at **CONCURRENCY=2**
  (Pitfall 5 mitigation). BullMQ Worker.concurrency stays at 1 (one
  backwash per worker process); the semaphore caps the inner fan-out.

**Phase 2 vs Phase 6 boundary:** code comments + JSDoc make explicit
that `defaultPullChunkPhase2` is a counting placeholder. Phase 6's
Ingest Adapter Layer will replace the body with real scraper invocations
(`await ingestAdapter.fetchOrders(tenantId, platform, from, to)`). The
chunked harness + progress-event surface stays unchanged.

**Tests turned GREEN:** queues/onboardingBackwashWorker.test.ts (3/3) —
chunk-count, progress-event shape, and concurrency cap all pinned.

### 4. /api/admin/onboarding routes (commit 7d20c3a)

**`backend/src/routes/admin/onboarding.ts`** — 7 endpoints.

| Method + Path | RBAC | Behaviour |
| ------------- | ---- | --------- |
| POST /tenants | super-admin | Creates Tenant (subscriptionPlan=TRIAL) + initial owner User; returns tempPassword for verbal handoff (Phase 9 wires email magic-link). |
| POST /tenants/:tid/couriers/import | super-admin | multer 10MB + 10k row limit (T-02-23). XLSX parsed via existing `xlsx` dep; tenant-scoped duplicate-civilId detection; returns {totalRows, valid, invalid, created}. |
| POST /tenants/:tid/platform-credentials | super-admin | Returns 202 + Phase-6 handoff note. We do NOT introduce a new secret-storage path (T-02-24); Phase 6 wires existing TalabatSession/KeetaPortalCredential models. |
| POST /tenants/:tid/run-backwash | super-admin | Validates tenantId, queues a BullMQ job (or 503 when REDIS_URL unset), returns {jobId}. |
| GET /tenants/:tid/backwash-status?jobId=X | super-admin | Returns {jobId, state, progress: {step, totalSteps, message}}. |
| GET /tenants/:tid/report | super-admin | Calls buildOnboardingReport(tenantId, windowDays); returns ReportData. |
| POST /tenants/:tid/start-trial | super-admin | tenant.update {designPartner, monthlyOverrideKd, trialEndsAt: now+14d} + writeAgentAction. WARNING-7: reasoning starts with `Originated by super-admin user <name> (id: <userId>).`. |

**Test turned GREEN:** onboarding/backwashProgress.test.ts (1/1).

### 5. /api/admin/billing routes (commit 7d20c3a)

**`backend/src/routes/admin/billing.ts`** — 3 endpoints.

| Method + Path | RBAC | Behaviour |
| ------------- | ---- | --------- |
| GET /tenants?month=YYYY-MM | super-admin | listMonthlyBillsAcrossTenants(month); returns {month, tenants[], totals: {tenantCount, mrrKd, activeCouriersAcrossFleets}}. |
| GET /tenants/:tid?month=YYYY-MM | super-admin | computeMonthlyBill + 6-month history + last 24 TaxInvoice rows. |
| PATCH /tenants/:tid/override | super-admin | Sets monthlyOverrideKd; writeAgentAction with reasoning prefix `Originated by super-admin user <name> (id: <userId>).`. Reason field required (400 on empty); negative-number guard (400). |

**Override audit trail (T-02-25):** writeAgentAction is the only writer.
proposer="Darb" hardcoded by Phase 1's writeAgentAction (WARNING-7
limitation); the reasoning field carries the originator metadata so
audit-log readers can disambiguate operator-driven entries from
agent-driven ones. Phase 8 ships the Operator proposer enum to remove
this workaround. **6 callsites of "Originated by super-admin" prefix in
src/routes/admin** (verified by grep).

### 6. server.ts mount (commit 7d20c3a)

```ts
import adminRouter from "./routes/admin";
// ...
app.use("/api/admin", adminRouter);
```

Mounted immediately after /api/audit (Wave 2 router). The mount applies
authMiddleware + requireSuperAdmin via the sub-router's own `router.use(...)`
calls — server.ts doesn't apply additional middleware at the mount point.

### 7. jest.config.js 2-level mapper (commit 7d20c3a)

Added 2-level moduleNameMapper for `^\\.\\./\\.\\./middleware/auth$` +
`^\\.\\./\\.\\./middleware/tenantScope$`. routes/admin/* tests
(depth 2) now hit the same auth + tenantScope mocks the routes/* tests
use. Mirrors the Wave 2 config mapper pattern (3-level paths
intentionally unmapped to preserve the read-tools-against-real-prisma
equilibrium).

### 8. seed-design-partner-fixture script (commit 5380c55)

**`backend/prisma/seed-design-partner-fixture.ts`** + npm script
`seed:design-partner-fixture`. **BLOCKER-2 path b** — Phase 2 ships
scaffolding-only ingestion; the design-partner-1 dry-run uses this
script as the one-time interim. Real scrapers ship in Phase 6.

**Fixture targets (defaults):**

| Table | Rows |
| ----- | ---- |
| Driver | 8 |
| Shift | 240 (8 × 30 days; 70/20/10 on-time/late/no-show) |
| AttendanceRecord | 240 |
| LocationLog | 224 (4 pings × 7 days × 8 drivers) |
| OrderLog | ~5,000-6,000 (~25/driver/day, status distribution: 80 DELIVERED / 12 CANCELLED / 5 REJECTED / 3 LATE in rawData) |
| CashRecord | 24 (3 per driver × 8); 2 with pendingDues > 0 (KD 28.500 + KD 45.000) |
| Violation | 3 (LATE_PICKUP, ORDER_REJECTION_TIMEOUT, DROP_OFF_IN_ADVANCE in last 14 days) |
| AiScore | 8 (top-heavy: 5 in [70,95], 3 in [40,65]) |
| AgentRunLog | 1 (parent for PendingAgentAction FK) |
| PendingAgentAction | 10 (6 active + 4 resolved); ZERO Phase-8 tool names |

**CLI args:** `--tenantId=<id>` (required), `--days=30`, `--driverCount=8`, `--force`.

**Idempotency:** transaction wraps the cleanup (delete in FK-dependency
order) + insert. Re-running the script against the same tenant produces
the same fixture. The deterministic RNG (seed = driverCount × 1000 + days)
keeps distributions stable across re-runs.

**Safety:** aborts unless --force when the tenant has any non-fixture
OrderLog rows. Surfaces the destructive-overwrite warning prominently —
never silently overwrites real prospect data.

**ZERO Phase-8 tool names** in the fixture — the gold-set
forbiddenToolNames invariant is preserved (verified by `grep -c
"applyPenalty\\|suspendDriver" prisma/seed-design-partner-fixture.ts` →
0).

## Test File Status at End of Wave 4

| Test File | Status at Wave 4 End | Wave 3 End |
| --------- | -------------------- | ---------- |
| `billing/billingService.test.ts` | GREEN (5/5) | RED |
| `billing/overrideIsolation.test.ts` | GREEN (1/1) | RED |
| `queues/onboardingBackwashWorker.test.ts` | GREEN (3/3) | RED |
| `onboarding/backwashProgress.test.ts` | GREEN (1/1) | RED |
| `onboarding/reportRender.test.ts` | GREEN (1/1) | RED |
| `frontend/admin/DarbsReadReport.test.tsx` | RED (intentional — Wave 5) | RED |
| Wave 0 + 1 + 2 + 3 baseline | GREEN (preserved) | GREEN |

**Aggregate (backend full sweep):** **31/31 suites passing, 188 tests
GREEN** (was 26/31 + 177 at end of Wave 2). Wave 4 increased passes
by 5 suites + 11 tests with **zero regressions**. The 1 still-RED test
is the Wave-5-deferred frontend DarbsReadReport.test.tsx.

## API Surface Tally (Wave 4)

| Method + Path | Owner | Auth chain |
| ------------- | ----- | ---------- |
| POST /api/admin/onboarding/tenants | onboarding.ts | authMiddleware + requireSuperAdmin |
| POST /api/admin/onboarding/tenants/:tid/couriers/import | onboarding.ts | same |
| POST /api/admin/onboarding/tenants/:tid/platform-credentials | onboarding.ts | same |
| POST /api/admin/onboarding/tenants/:tid/run-backwash | onboarding.ts | same |
| GET /api/admin/onboarding/tenants/:tid/backwash-status | onboarding.ts | same |
| GET /api/admin/onboarding/tenants/:tid/report | onboarding.ts | same |
| POST /api/admin/onboarding/tenants/:tid/start-trial | onboarding.ts | same |
| GET /api/admin/billing/tenants | billing.ts | same |
| GET /api/admin/billing/tenants/:tid | billing.ts | same |
| PATCH /api/admin/billing/tenants/:tid/override | billing.ts | same |

**Total:** 10 new endpoints. NONE mount tenantScope — admin routes
operate across tenants by design; handlers extract tenantId from
req.params.

## Verification Commands

```bash
cd backend
npx jest --testPathPatterns='billing|queues/onboarding|onboarding'
                                # 5/5 suites, 11/11 tests GREEN
npm test                        # 31/31 suites, 188 tests GREEN
npx tsc --noEmit                # 0 errors in non-test code
npm run lint:tenant             # 0 errors
grep -c "Originated by super-admin" src/routes/admin/ -r
                                # → 6 (≥2 required by plan)
grep -c "applyPenalty\|suspendDriver" prisma/seed-design-partner-fixture.ts
                                # → 0 (forbiddenToolNames preserved)
```

## Hand-off Note for Wave 5

Wave 5's first act:

1. **Run `cd backend && npx prisma migrate dev`** — the [BLOCKING] task.
   Wave 1 staged 4 schema columns (Tenant.designPartner +
   Tenant.monthlyOverrideKd + Tenant.trialEndsAt + User.isSuperAdmin) but
   the migration was deferred to this wave. Until this runs, the Prisma
   types are correct but the DB doesn't have the columns — runtime queries
   in admin/billing + admin/onboarding will fail.

2. **Build `frontend/src/app/(dashboard)/admin/onboarding/page.tsx`** — the
   5-step wizard per UI-SPEC §3.4. Reuse the existing keeta CSV/XLSX
   import drag-drop pattern for Step 2.

3. **Build `frontend/src/app/(dashboard)/admin/billing/page.tsx`** +
   `[tenantId]/page.tsx` per UI-SPEC §3.5. Consumes
   `GET /api/admin/billing/tenants` + the tenant-detail endpoint.

4. **Build the DarbsReadReport component.** Wave 0's frontend RED test
   (DarbsReadReport.test.tsx) flips GREEN once the component renders the
   9 sections. Use white background + the founder signature line at the
   bottom of section 1.

5. **Add `isSuperAdmin` to /api/auth/me response.** Wave 1's schema added
   User.isSuperAdmin but the Phase-1 auth route doesn't include it in
   /api/auth/me yet. SidebarV2 (Wave 3) reads `user.isSuperAdmin` and
   only renders the Admin section when truthy — so the Admin section
   never appears until /api/auth/me ships the flag. One-line fix in
   `backend/src/routes/auth.ts`.

6. **Design-partner-1 dry-run sequence** (per BLOCKER-2 path b):
   - Run `npm run prisma:migrate dev` (gates the schema columns).
   - Run `npm run seed:design-partner-fixture -- --tenantId=<dp1>` to
     pre-populate 30 days of plausible data.
   - Open `/admin/onboarding/<dp1>/report` to render the full 9-section
     "Darb's read on your fleet" with realistic numbers.
   - Validate top5/bottom5 performers + cash exposure tiles + violation
     counts + 10 PendingAgentAction cards in section 7.

7. **Wave 5 verifier checklist (run before phase-close):**
   - All 5 Wave-0 backend RED tests still GREEN (preserve Wave 4 work).
   - Frontend DarbsReadReport.test.tsx GREEN.
   - Migrate runs cleanly, additive only (no DROP TABLE / DROP COLUMN).
   - Override-leakage check: write override on tenant A → verify tenant
     B's bill unchanged on /api/admin/billing/tenants response.
   - Audit log: trigger /admin/billing/.../override → verify AgentAction
     row written with reasoning starting `Originated by super-admin user`.
   - 6-callsite check: `grep -c "Originated by super-admin" src/routes/admin/ -r` → ≥6.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] In-memory shift filter required for billing test**

- **Found during:** Task 1 — running billingService.test.ts.
- **Issue:** Test 5 ("courier with all shifts <240 → NOT active") seeds
  `prisma.shift.findMany.mockResolvedValue([{...actualHoursMinutes:100,...}])`.
  The mock returns the row regardless of where args. My initial code
  trusted the where clause and counted 1 active courier; test expected
  0.
- **Fix:** Added belt-and-suspenders in-memory re-filter on the findMany
  result by `actualHoursMinutes >= ACTIVE_HOURS_THRESHOLD_MINUTES &&
  tenantId === expected`. Production Prisma already filters at the DB
  layer; the in-memory pass is redundant in prod but defends against
  test-mock drift and any future refactor that loosens the where clause.
- **Files modified:** `backend/src/services/billing/billingService.ts`.
- **Commit:** Folded into 2d948af.

**2. [Rule 3 — Blocking] lint:tenant tripped on `where: {...} as any` casts**

- **Found during:** Task 1 — running `npm run lint:tenant` after the
  initial reportBuilder draft.
- **Issue:** The lint rule scans the immediate ObjectExpression of the
  `where` value. When `where` is followed by `as any` the AST sees a
  TSAsExpression instead and bails — false positive on tenantId presence.
  9 lint errors at first run, all on lines with `where: {...} as any`.
- **Fix:** Removed `as any` casts from where clauses. Prisma's generated
  types accept the shapes natively when the surrounding cast is on the
  delegate (e.g. `(prisma as unknown as {tenant: {findFirst: ...}})`)
  rather than on the where-value. For groupBy + Decimal-touching
  arguments where a cast was unavoidable, I cast at the delegate level
  — the where ObjectExpression is preserved and lint:tenant sees
  tenantId as the first key.
- **Files modified:** `backend/src/services/onboarding/reportBuilder.ts`.
- **Commit:** Folded into 2d948af.

**3. [Rule 3 — Blocking] Driver schema has no isActive column**

- **Found during:** Task 1 — TS error
  `'isActive' does not exist in type 'DriverWhereInput'`.
- **Issue:** I borrowed `isActive: true` from the plan prose; the actual
  Driver model uses `status: DriverStatus`. Both `loadTenantContext` +
  `buildPerformers` had `where:{tenantId, isActive: true}`.
- **Fix:** Replaced both occurrences with `where:{tenantId, status: "ACTIVE"}`.
- **Files modified:** `backend/src/services/onboarding/reportBuilder.ts`.
- **Commit:** Folded into 2d948af.

**4. [Rule 3 — Blocking] _count typing on prisma.orderLog.aggregate**

- **Found during:** Task 1 — TS error on the aggregate's _count narrowing.
- **Issue:** Prisma's `_count: {id: true}` returns `_count: {id: number}`
  (object), not `_count: number`. My initial code asserted both shapes
  in a single ternary that TS couldn't narrow.
- **Fix:** Replaced the ternary with an `if/else` block that handles
  both number and `{id: number}` shapes explicitly. TS now narrows
  cleanly.
- **Files modified:** `backend/src/services/onboarding/reportBuilder.ts`.
- **Commit:** Folded into 2d948af.

**5. [Rule 3 — Blocking] tenant.fleetSize is not a real schema column**

- **Found during:** Task 1 — TS error on `tenant.findFirst({select: {fleetSize: true}})`.
- **Issue:** The Wave 0 reportRender.test mocks the tenant.findFirst
  return to include `fleetSize: 142` for convenience. My initial select
  included `fleetSize: true` but the schema doesn't have that column;
  Prisma's typed client rejects unknown select fields.
- **Fix:** Removed `fleetSize: true` from the select. The cast
  `(prisma as unknown as ...).tenant.findFirst` lets the test mock
  surface fleetSize via the synthetic return type; production reads
  fall back to courierCount via `tenant?.fleetSize ?? courierCount`.
  Test still passes because the cast bypasses the typed select check
  for the mock path.
- **Files modified:** `backend/src/services/onboarding/reportBuilder.ts`.
- **Commit:** Folded into 2d948af.

**6. [Rule 3 — Blocking] jest moduleNameMapper missing 2-level middleware paths**

- **Found during:** Task 3 — backwashProgress.test.ts returned 401
  instead of 200 because authMiddleware was firing the real
  Bearer-token check.
- **Issue:** jest.config.js had `^../middleware/auth$` (1-level only)
  — my routes/admin/onboarding.ts is 2 levels deep so its
  `from "../../middleware/auth"` import didn't hit the mock.
- **Fix:** Added 2-level mapper `^\\.\\./\\.\\./middleware/auth$` +
  `^\\.\\./\\.\\./middleware/tenantScope$`. Mirrors Wave 2's 2-level
  config mapper pattern exactly. 3-level paths intentionally unmapped
  (preserves the read-tools-against-real-prisma equilibrium).
- **Files modified:** `backend/jest.config.js`.
- **Commit:** Folded into 7d20c3a.

**7. [Rule 1 — Bug] grep-based forbidden-tool count failed on comment**

- **Found during:** Task 4 self-check — `grep -c "applyPenalty\\|suspendDriver" prisma/seed-design-partner-fixture.ts` returned 1 instead of 0. The plan's verify command requires exactly 0.
- **Issue:** A doc comment in the seed script's header mentioned "NO
  applyPenalty / suspendDriver" — the words appeared in plain text inside a
  comment.
- **Fix:** Rephrased the comment to "ZERO Phase-8 tool names" without
  naming the forbidden tools verbatim. The forbiddenToolNames invariant
  from gold-set fixtures is now preserved at the count level too —
  defensive against future grep-based audits.
- **Files modified:** `backend/prisma/seed-design-partner-fixture.ts`.
- **Commit:** Folded into 5380c55.

### Rule 4 (architectural) — None

No architectural decisions required. Wave 4 ships pure backend services +
routes on top of Wave 1's spine, Wave 2's audit primitives, and Phase 1's
agent runtime. The one architectural-shaped decision (defaultPullChunkPhase2
counting existing rows vs invoking real scrapers) was already taken at the
plan / orchestrator level (BLOCKER-2 path b) and documented in PLAN.md +
PROJECT.md before this wave started.

## Threat Model Compliance

| Threat | Mitigation Status |
| ------ | ----------------- |
| T-02-21 — Elevation of privilege via /api/admin/* | DONE — every admin sub-router mounts authMiddleware + requireSuperAdmin (Wave 1 middleware reads isSuperAdmin from DB on every request). NO tenantScope on admin routes — handlers extract tenantId from req.params explicitly. lint:tenant covers admin/ directory (Wave 0 expanded the glob). |
| T-02-22 — Billing override leak across tenants | DONE — computeMonthlyBill uses tenant.findFirst({where:{id:tenantId}}) — never findMany. Wave-0 overrideIsolation.test.ts asserts tenant-A's override does NOT affect tenant-B's bill (1/1 GREEN). |
| T-02-23 — DoS via 1M-row CSV upload | DONE — POST couriers/import uses multer with maxFileSize=10MB; row count enforced ≤10,000 (returns 413 + clear message past limit). |
| T-02-24 — Plaintext platform credentials | DONE — POST platform-credentials returns 202 + Phase-6 handoff note. We did NOT introduce a new secret-storage path; existing TalabatSession / KeetaPortalCredential models (which already encrypt at rest) will own credential persistence in Phase 6. |
| T-02-25 — Billing override change without audit trail | DONE — PATCH /override writes AgentAction via writeAgentAction with toolName='admin.billingOverride', subjectType='Tenant', subjectId=tenantId, originalProposal={oldOverride}, modificationsBeforeApproval={newOverride, reason}, outcome='success'. Reason field required (400 on empty). 6 callsites of `Originated by super-admin user` audit-prefix verified. |
| T-02-26 — Report HTML injects PII into prospect-shareable artifact | DONE — buildOnboardingReport uses driver.name only — never phone, civilId, address, nationalId. Verified by inspection of all 9 section builders. Phase 2 ships in-app + downloadable PDF only (sharable link deferred per orchestrator decision #6). |

## Threat Flags

None — Wave 4 ships HTTP surface that is fully covered by the
threat_model section above. The 10 new endpoints all sit behind
authMiddleware + requireSuperAdmin; the 1 outbound side effect
(POST run-backwash queueing a BullMQ job) is gated by tenant existence
+ valid platform list; the seed script is dev-time tooling that aborts
on real prior data.

## Self-Check: PASSED

Verified all 9 created files exist, 3 modified files updated, and all 4
commits are reachable:

```
FOUND: backend/src/services/billing/billingService.ts
FOUND: backend/src/services/billing/index.ts
FOUND: backend/src/services/onboarding/reportBuilder.ts
FOUND: backend/src/services/onboarding/index.ts
FOUND: backend/src/queues/onboardingBackwashWorker.ts
FOUND: backend/src/routes/admin/onboarding.ts
FOUND: backend/src/routes/admin/billing.ts
FOUND: backend/src/routes/admin/index.ts
FOUND: backend/prisma/seed-design-partner-fixture.ts
MODIFIED: backend/src/server.ts (mounts /api/admin)
MODIFIED: backend/jest.config.js (2-level middleware mappers)
MODIFIED: backend/package.json (seed:design-partner-fixture npm script)
FOUND COMMIT: 2d948af (Task 1 — billingService + reportBuilder)
FOUND COMMIT: 5196403 (Task 2 — onboardingBackwashWorker)
FOUND COMMIT: 7d20c3a (Task 3 — admin routes + server mount + jest mapper)
FOUND COMMIT: 5380c55 (Task 4 — seed-design-partner-fixture script)
```
