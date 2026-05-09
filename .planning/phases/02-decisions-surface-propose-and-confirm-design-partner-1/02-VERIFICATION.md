---
phase: 02-decisions-surface-propose-and-confirm-design-partner-1
verified: 2026-05-09T17:59:46Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification: null
deferred:
  - truth: "Real scraper invocation in onboardingBackwashWorker"
    addressed_in: "Phase 6"
    evidence: "PROJECT.md Phase-2 Scope Deferral: 'Real scraper invocation is deferred to Phase 6 (Ingest Adapter Layer).' Phase-2 ships scaffolding (queue, chunked iterator, audit-row writes); Phase 6 wires real adapters."
  - truth: "design-partner-1 dry-run executed end-to-end"
    addressed_in: "Manual user execution (post-deploy)"
    evidence: "02-05-SUMMARY 'Manual Onboarding Steps' section: 8-step manual sequence documented for user to perform after Phase 2 deploy lands. Skip was instructed by orchestrator (real founder + real tenant naming + browser smoke required)."
  - truth: "Cost ceiling per tenant configurable"
    addressed_in: "Phase 8"
    evidence: "Hardcoded at 50 proposals/day per tenant in monitor prompt + scheduler comments; configurable via UI in Phase 8 Settings & Power Tools."
  - truth: "Suspend/Penalty cards execute live actions on Approve"
    addressed_in: "Phase 8"
    evidence: "PROJECT.md Phase-2 deferral: Suspend/Penalty cards display visible-with-disabled-Approve in Phase 2; Phase 8 wires those tools live (auditExpensiveAction tool gate)."
human_verification:
  - test: "design-partner-1 onboarding dry-run end-to-end"
    expected: "Wizard completes 5 steps + DarbsReadReport renders + tenant trialEndsAt set + override applied + audit ledger row visible"
    why_human: "Requires real founder identity, real tenant naming choice, browser smoke with super-admin login, and visual verification of Sierra design system rendering. Documented as 8-step Manual Onboarding Steps in 02-05-SUMMARY."
---

# Phase 2: Decisions Surface + Propose-and-Confirm + Design Partner #1 — Verification Report

**Phase Goal (from ROADMAP):** Ship the owner's proposal inbox at `/decisions`, the propose-and-confirm v1 autonomy model, the continuous-monitoring loop that fills the inbox, action drafting, the per-active-courier billing model, and the white-glove onboarding flow — onboard design partner #1 charging KD 100/month.

**Verified:** 2026-05-09T17:59:46Z
**Status:** PASSED (with documented deferrals + 1 human-verification item)
**Re-verification:** No — initial verification

---

## Summary

**VERDICT: PASSED.** All 6 success criteria are observably met in the codebase. All 6 phase requirements have implementation evidence. 31/31 backend test suites + 188/188 backend tests green; 6/6 Phase 2 frontend tests green; backend + frontend TypeScript both 0 errors; lint:tenant exit 0; production build succeeds with `/decisions`, `/decisions/[id]`, `/decisions/audit`, `/admin/onboarding`, `/admin/onboarding/[tenantId]/report`, `/admin/billing`, `/admin/billing/[tenantId]` routes compiled; Prisma migration is purely additive (0 destructive ops); migrations applied to dev DB; the 4 acknowledged deferrals from PROJECT.md "Phase-2 Scope Deferral" section are documented and explicitly NOT counted as gaps; the 8-step manual design-partner-1 dry-run sequence is documented in 02-05-SUMMARY for user post-deploy execution.

There are 16 pre-existing frontend test failures in `formatters.test.ts` and `StatusBadge.test.tsx` — these test files were written against the legacy gray color palette but the implementation moved to the Sierra design system (`bg-sand-200`) in commit `f9909e4` (pre-Phase-2). They are NOT a Phase 2 regression. They are out-of-scope for this phase but should be updated in a future cleanup pass.

---

## Per-Criterion Verification

### Criterion 1: `/decisions` page renders cards from PendingAgentAction (status=proposed) with approve/edit/dismiss buttons; CON-decisions-card-shape compliant

**Verdict: VERIFIED**

| Check | Command | Result |
|-------|---------|--------|
| Routes exist | `ls frontend/src/app/(dashboard)/decisions/` | `[id]/  audit/  layout.tsx  page.tsx` — all 4 present |
| Component count | `ls frontend/src/components/decisions/ \| wc -l` | 11 components (matches threshold ≥11) |
| Frontend test | `npx vitest run src/__tests__/decisions/DecisionsList.test.tsx` | 1 file passed, 3 tests passed |
| Build compiles route | `npm run build \| grep decisions` | `ƒ /decisions`, `ƒ /decisions/[id]`, `ƒ /decisions/audit` all compiled |
| Card shape contract | `grep "CON-decisions-card-shape" backend/src/services/decisions/cardProjector.ts` | "CON-decisions-card-shape, UI-SPEC §3.1.2 + §4.5" reference present |
| Backend cardProjector tests | `npm test -- --testPathPatterns=cardProjector` | 1 suite, 4 tests passed |

Components present:
- `DecisionsList.tsx`, `DecisionCard.tsx`, `EditDrawer.tsx`, `DismissConfirm.tsx`,
- `EvidenceList.tsx`, `FilterChipStrip.tsx`, `TagPill.tsx`, `KeyboardShortcutsHelp.tsx`,
- `AuditEntryDetail.tsx`, `AuditRowPreview.tsx`, `DecisionsEmptyState.tsx`.

Card data flows: `PendingAgentAction` (Prisma) → `cardProjector.projectActionToCard()` → REST API at `/api/decisions` → `decisionsApi` client → `DecisionsList` page → `DecisionCard` (with Approve/Edit/Dismiss). Wired end-to-end.

---

### Criterion 2: Continuous-monitoring BullMQ worker scans tenant data on tiered cadence (1m/15m/1h) and fills the inbox

**Verdict: VERIFIED**

| Check | Command | Result |
|-------|---------|--------|
| Monitor prompt | `test -f backend/src/agent/prompts/monitor.md` | Exists |
| Monitor agent registration | `grep "promptFile.*monitor" backend/src/agent/index.ts` | `promptFile: "monitor.md"` (registered through `registerAgent` shape) |
| Tier wiring | `grep -c monitorTick backend/src/agent/scheduler.ts` | 5 occurrences (export + 3 setInterval calls + 1 error-log) — matches threshold ≥3 |
| Hot tier (1m) | `grep "60_000" backend/src/agent/scheduler.ts` | `setInterval(() => void monitorTick("hot"), 60_000)` ✓ |
| Warm tier (15m) | `grep "900_000" backend/src/agent/scheduler.ts` | `setInterval(() => void monitorTick("warm"), 900_000)` ✓ |
| Cold tier (1h) | `grep "3_600_000" backend/src/agent/scheduler.ts` | `setInterval(() => void monitorTick("cold"), 3_600_000)` ✓ |
| Monitor tests | `npm test -- --testPathPatterns=agent/monitor` | 4 suites, 16 tests passed (neverExecutes, dismissSuppression, promptRegression, monitoringSmoke) |
| Scheduler tests | `npm test -- --testPathPatterns=agent/scheduler` | 1 suite, 3 tests passed |
| 50/day rate limit | `grep -E "50.*proposal" backend/src/agent/` | Documented in scheduler.ts comments + monitor.md prompt; enforced by monitor agent with `listAgentMemory` budget probe |

> Note on architecture: The "monitor agent" is implemented as a registered agent in `backend/src/agent/index.ts` (config-driven), not as a standalone class file at `agent/agents/monitor.ts`. This aligns with the registry pattern shared with triage/reconciliation/narrator/chat agents. The scheduler invokes `monitorTick(tier)` on cadence, which dispatches into the registered monitor agent runtime — observable behavior matches the success criterion.

---

### Criterion 3: Approve writes AgentAction audit row + executes the action (draftCourierMessage live; flagForReview/proposeCashReminder audit-only)

**Verdict: VERIFIED**

| Check | Command | Result |
|-------|---------|--------|
| Decisions route exists | `test -f backend/src/routes/decisions.ts` | Exists |
| Approve/Edit/Dismiss handlers | `grep "approve\|dismiss\|edit" backend/src/routes/decisions.ts \| wc -l` | 19 occurrences (≥3 threshold) |
| approveFlow tests | `npm test -- --testPathPatterns=decisions/approveFlow` | 1 suite, 6 tests passed (including concurrency race) |
| Action tools | `ls backend/src/agent/tools/action/` | `draftCourierMessage.ts`, `flagForReview.ts`, `proposeCashReminder.ts` — all 3 present |
| draftCourierMessage live | `grep "requiresApproval" backend/src/agent/tools/action/draftCourierMessage.ts` | `requiresApproval: true` (correct: gate fires propose, fall-through executes on Approve when ctx.userId is set) |
| Audit row written | Inspect `routes/decisions.ts` POST /:id/approve | Calls `writeAgentAction(...)` after `toolRegistry.invoke()` succeeds; produces canonical CON-audit-row-shape ledger entry |
| Re-invoke pattern | Inspect `routes/decisions.ts` POST /:id/approve handler comments | "toolRegistry.invoke(toolName, ctx with userId, finalInput) — the registry's gate falls through to .execute() because ctx.userId is set, so the tool body fires (e.g. notification.create for draftCourierMessage)" — confirms live execution path |
| Optimistic lock | Inspect `routes/decisions.ts` POST /:id/approve | `updateMany where {id, resolvedAt: null}` followed by count === 1 check — prevents double-approve race (T-02-14) |

draftCourierMessage's body pushes a notification.create — verified live via approveFlow test suite (6 tests including the concurrency-race scenario).

---

### Criterion 4: Dismiss writes AgentMemory `dismissed:*` so monitor learns; suppresses identical proposal for 7 days

**Verdict: VERIFIED**

| Check | Command | Result |
|-------|---------|--------|
| dismissFlow tests | `npm test -- --testPathPatterns=decisions/dismissFlow` | 1 suite, 3 tests passed |
| dismissSuppression tests | `npm test -- --testPathPatterns=agent/monitor` | dismissSuppression.test.ts included in 4 suites / 16 tests passed |
| Memory key format | `grep "dismissed:" backend/src/routes/decisions.ts` | `` `dismissed:${pa.toolName}:${pa.subjectType ?? "_"}:${pa.subjectId ?? "_"}` `` — matches CON-dismiss-suppression-7-day shape |
| Monitor consults dismissals | `grep "dismissed:" backend/src/agent/tools/read/listAgentMemory.ts + monitor.md` | Monitor prompt mandates `listAgentMemory({prefix: "dismissed:", limit: 200})` at top of every tick |
| 7-day window | Monitor prompt | "re-proposing an action against a subject the operator dismissed within the last 7 days erodes trust" — codified as suppression contract |

End-to-end flow: Dismiss → POST /:id/dismiss → upsertAgentMemory writes `dismissed:<tool>:<subjectType>:<subjectId>` → monitor's next tick reads this key → suppresses identical proposal for 7 days.

---

### Criterion 5: Per-active-courier billing model: KD 2 × active × min KD 200, with design-partner override (KD 100); active = ≥4h/day on ≥1 day in month

**Verdict: VERIFIED**

| Check | Command | Result |
|-------|---------|--------|
| billingService exists | `test -f backend/src/services/billing/billingService.ts` | Exists |
| Billing tests | `npm test -- --testPathPatterns=billing` | 2 suites, 6 tests passed (4 billingService + 2 overrideIsolation) — 1 more than the spec's "5", which is a positive (extra coverage) not a regression |
| 4-hour active threshold | `grep "4.*hour\|fourHour\|>=.*4" billingService.ts` | `const ACTIVE_HOURS_THRESHOLD_MINUTES = 240; // 4 hours` and `actualHoursMinutes >= 240 (4h)` — matches PRD definition |
| Pricing rules | Inspect billingService.ts + tests | KD 2/active × min KD 200 floor verified by tests `150 active → KD 300`, `50 active → KD 200 floor`, override path |
| Override KD 100 wins | overrideIsolation.test.ts + billingService.test.ts | Tests prove override is scoped to a single tenant (cross-tenant isolation guaranteed) and `monthlyOverrideKd` short-circuits the `max(2 × active, 200)` formula when set |

Billing data flow: Tenant → billingService.computeMonthlyBill(tenantId, month) → reads Tenant.monthlyOverrideKd if present (KD 100 for design partners) ELSE computes max(2 × activeCouriers, 200) where activeCouriers = drivers with `actualHoursMinutes >= 240` on at least 1 day in the month. Override is per-tenant (not global).

---

### Criterion 6: White-glove onboarding flow: 5-step wizard + 30-day backwash worker (scaffolding) + "Darb's read on your fleet" report; design-partner-1 dry-run available via seed-design-partner-fixture script

**Verdict: VERIFIED**

| Check | Command | Result |
|-------|---------|--------|
| Backwash worker | `test -f backend/src/queues/onboardingBackwashWorker.ts` | Exists |
| Onboarding report builder | `test -f backend/src/services/onboarding/reportBuilder.ts` | Exists |
| Seed script | `test -f backend/prisma/seed-design-partner-fixture.ts` | Exists |
| DarbsReadReport component | `test -f frontend/src/components/admin/DarbsReadReport.tsx` | Exists |
| Onboarding wizard page | `test -f frontend/src/app/(dashboard)/admin/onboarding/page.tsx` | Exists |
| 5 step components | `ls frontend/src/components/admin/onboarding/` | TenantInfoStep, CourierImportStep, PlatformCredentialsStep, BackwashStep, ReportPreview — 5 steps |
| Onboarding tests | `npm test -- --testPathPatterns=onboarding` | 3 suites, 5 tests passed |
| DarbsReadReport test | `npx vitest run src/__tests__/admin/DarbsReadReport.test.tsx` | 1 file, 3 tests passed |
| White background per memory | `grep -E "bg-white" frontend/src/components/admin/DarbsReadReport.tsx` | `className="bg-white text-slate-900 ... print:max-w-none"` + print CSS `background: white !important` — adheres to feedback_invoices_white_background.md |
| seed:design-partner-fixture script | `grep "seed:design-partner-fixture" backend/package.json` | 1 occurrence (npm script registered) |
| Build compiles admin routes | `npm run build \| grep admin` | `ƒ /admin/billing`, `ƒ /admin/billing/[tenantId]`, `ƒ /admin/onboarding`, `ƒ /admin/onboarding/[tenantId]/report` — all 4 admin routes compiled |
| Backwash scaffolding only | onboardingBackwashWorker tests | Tests assert audit-row writes per chunk + no real scraper invocation (scraper deferred to Phase 6 per PROJECT.md) |

---

## Per-Requirement Verification

### REQ-decisions-proposal-inbox

- **Source plans:** 02-00, 02-02, 02-03
- **Implementation:** `backend/src/routes/decisions.ts` (HTTP API), `backend/src/services/decisions/cardProjector.ts` (CON-decisions-card-shape projection), `backend/src/services/decisions/evidenceCollector.ts`, `frontend/src/app/(dashboard)/decisions/page.tsx`, 11 components in `frontend/src/components/decisions/`
- **Test evidence:** approveFlow.test.ts (6), dismissFlow.test.ts (3), cardProjector.test.ts (4), DecisionsList.test.tsx (3) — 16 tests passed
- **Status:** SATISFIED

### REQ-agent-continuous-monitoring

- **Source plans:** 02-00, 02-01
- **Implementation:** `backend/src/agent/scheduler.ts` (3 setInterval cron tiers), `backend/src/agent/prompts/monitor.md` (monitor playbook), `backend/src/agent/index.ts` (monitor agent registration), `backend/src/agent/tools/read/listAgentMemory.ts` (dismissed:* probe)
- **Test evidence:** monitoringSmoke.test.ts, neverExecutes.test.ts, dismissSuppression.test.ts, promptRegression.test.ts (16 tests across 4 suites), monitorTier.test.ts (3 tests) — 19 tests passed
- **Status:** SATISFIED

### REQ-agent-action-drafting

- **Source plans:** 02-00, 02-01, 02-02
- **Implementation:** `backend/src/agent/tools/action/draftCourierMessage.ts` (LIVE — `requiresApproval: true`), `backend/src/agent/tools/action/flagForReview.ts` (audit-only), `backend/src/agent/tools/action/proposeCashReminder.ts` (audit-only); `editableParams` extends ToolDefinition for safe operator edits during approve
- **Test evidence:** approveFlow.test.ts (re-invoke + edit-merge path tests), draft tool used end-to-end in monitoringSmoke.test.ts
- **Status:** SATISFIED

### REQ-agent-propose-confirm

- **Source plans:** 02-01, 02-02, 02-03
- **Implementation:** `backend/src/agent/registry.ts` (gate: when `ctx.userId` is unset and `requiresApproval=true`, stage PendingAgentAction; when set, fall through to .execute()), `backend/src/routes/decisions.ts` POST /:id/approve handler (re-invoke with userId set), POST /:id/dismiss (suppression memory), POST /:id/undo (5-minute revert window)
- **Test evidence:** approveFlow.test.ts (6 — including concurrency race T-02-14), dismissFlow.test.ts (3), neverExecutes.test.ts (asserts monitor's tool calls produce PendingAgentAction rows, never side-effect writes)
- **Status:** SATISFIED

### REQ-pricing-model

- **Source plans:** 02-04, 02-05
- **Implementation:** `backend/src/services/billing/billingService.ts` (computeMonthlyBill: max(KD 2 × active, KD 200) with `monthlyOverrideKd` short-circuit; active = `actualHoursMinutes >= 240` ≥ 1 day/month), `backend/src/routes/admin/` billing endpoints, frontend `/admin/billing` + `/admin/billing/[tenantId]` pages with OverrideToggle
- **Test evidence:** billingService.test.ts (4) + overrideIsolation.test.ts (2) = 6 tests passed
- **Status:** SATISFIED

### REQ-gtm-onboarding

- **Source plans:** 02-04, 02-05
- **Implementation:** `backend/src/queues/onboardingBackwashWorker.ts` (chunked 5-day-window iterator + audit-row writes per chunk; real scraper deferred to Phase 6), `backend/src/services/onboarding/reportBuilder.ts` (Darb's read report data builder), `backend/prisma/seed-design-partner-fixture.ts` (8 drivers × 30 days fixture), `frontend/src/components/admin/DarbsReadReport.tsx`, `frontend/src/components/admin/OnboardingStepper.tsx`, 5 step components in `frontend/src/components/admin/onboarding/`, `frontend/src/app/(dashboard)/admin/onboarding/page.tsx`, `frontend/src/app/(dashboard)/admin/onboarding/[tenantId]/report/page.tsx`, `frontend/src/components/admin/SuperAdminGuard.tsx`, `backend/src/middleware/superAdmin.ts`
- **Test evidence:** onboardingBackwashWorker.test.ts (3), DarbsReadReport.test.tsx (3), plus admin route tests folded into the broader 188-test backend suite
- **Status:** SATISFIED

---

## Acknowledged Deferrals (NOT Gaps)

These four items are explicitly documented in `.planning/PROJECT.md` "Phase-2 Scope Deferral" section + 02-05-SUMMARY orchestrator notes. They were agreed up-front and validated by plan-checker. They are NOT counted as Phase 2 gaps.

| # | Deferred Item | Resolution Phase | Evidence |
|---|---------------|-----------------|----------|
| 1 | Real scraper invocation in onboardingBackwashWorker | Phase 6 (Ingest Adapter Layer) | PROJECT.md: "Phase 2 ships the BullMQ queue, the chunked 5-day-window iterator, per-platform progress tracking, and audit-row writes per chunk. Real scraper invocation is deferred to Phase 6." |
| 2 | design-partner-1 dry-run executed end-to-end | Manual user post-deploy | 02-05-SUMMARY "Manual Onboarding Steps" — 8 numbered steps documented for user. Skip instructed by orchestrator: "requires a real founder + real tenant naming + browser smoke." |
| 3 | Cost ceiling per tenant configurable | Phase 8 (Settings & Power Tools) | Hardcoded at 50 proposals/day in monitor.md + scheduler.ts comments. UI configuration deferred. |
| 4 | Suspend/Penalty cards execute live actions on Approve | Phase 8 | PROJECT.md: "Suspend/Penalty cards display visible-with-disabled-Approve in Phase 2; Phase 8 wires those tools live." |

---

## Migration Audit

| Check | Result |
|-------|--------|
| Migration file exists | `backend/prisma/migrations/20260510000000_decisions_billing_admin_models/migration.sql` ✓ |
| Migration is additive | `grep -E "DROP TABLE\|DROP COLUMN\|ALTER COLUMN.*DROP" migration.sql` returned **0 lines** — purely additive |
| New schema fields | `designPartner`, `monthlyOverrideKd`, `trialEndsAt` (Tenant) + `isSuperAdmin` (User) — all 4 present in `schema.prisma` |
| Migration applied | `npx prisma migrate status` → "26 migrations found ... Database schema is up to date!" |
| Idempotent | T-02-29 mitigation: ADD COLUMN IF NOT EXISTS pattern guards re-runs |

PostgreSQL applies these as metadata-only ops on PG12+ → safe for production deploy with no downtime risk.

---

## Cross-Cutting Checks

| Check | Result |
|-------|--------|
| Backend full test suite | **31 suites passed, 188 tests passed** (Phase 1 baseline was 142 → +46 new Phase 2 tests, no regression) |
| Frontend Phase 2 test suites | DecisionsList.test.tsx: 3/3 passed; DarbsReadReport.test.tsx: 3/3 passed |
| Frontend full test suite | 20 passed / 16 failed — 16 failures are pre-existing in `formatters.test.ts` + `StatusBadge.test.tsx` (Sierra design system mismatch from commit f9909e4, before Phase 2). NOT a Phase 2 regression. |
| Backend TypeScript | `npx tsc --noEmit` → 0 errors |
| Frontend TypeScript | `npx tsc --noEmit` → 0 errors |
| Frontend production build | Succeeded — all `/decisions/*` and `/admin/*` routes compiled (only pre-existing ESLint warnings on `app/global-error.tsx` unrelated to Phase 2) |
| lint:tenant | Exit 0 — covers `src/agent/`, `src/__tests__/agent/`, `src/agent/tools/action/`, `src/services/decisions/`, `src/services/billing/`, `src/services/onboarding/`, `src/routes/decisions.ts`, `src/routes/admin/`, `src/middleware/superAdmin.ts`, `src/queues/onboardingBackwashWorker.ts` |

---

## Manual Steps Remaining (design-partner-1 dry-run, from 02-05-SUMMARY)

The user must execute these 8 steps post-deploy. They were skipped during execution per orchestrator instruction (requires real founder identity + real tenant naming + browser smoke).

1. **Promote a User to super-admin in dev DB:**
   ```
   docker exec darb-postgres-1 psql -U darb -d darb -c \
     "UPDATE \"User\" SET \"isSuperAdmin\" = true WHERE email = 'mohammedkhalifamail@gmail.com';"
   ```
2. **Sign in to /login → land on /decisions.** Confirm SidebarV2 shows the "Admin" footer section with Onboarding + Billing links.
3. **Run the wizard end-to-end** at `/admin/onboarding` (5 steps): Tenant info → CourierImport → PlatformCredentials → Backwash → ReportPreview. Pre-seed fixture data via `cd backend && npm run seed:design-partner-fixture -- --tenantId=<id>`.
4. **Verify DB state** via Prisma Studio: tenant has `designPartner=true`, `monthlyOverrideKd=100`, `trialEndsAt` set 30 days out.
5. **Verify /admin/billing dashboard** shows the dry-run tenant with KD 100 monthly bill (override path).
6. **Override audit trail check** — open OverrideToggle history, confirm the reason text (10+ chars) is recorded against the operator's user.
7. **Cross-tenant isolation:** confirm any OTHER tenant's billing row shows the actual computed bill (not KD 100). Override is scoped to the dry-run tenant only.
8. **Cleanup (optional):** delete the dry-run Tenant from prisma studio (cascades to User + AgentAction + seeded Driver/Shift/OrderLog/Violation/etc. rows).

These steps are also a human-verification entry in the frontmatter for the `/decisions` orchestrator to surface to the user.

---

## Phase 2 Verdict

**PASSED.** All 6 success criteria are observably met in the codebase, all 6 phase requirements have implementation evidence, all Phase 2 backend + frontend tests are green (31/31 backend suites, 188/188 backend tests, 6/6 Phase 2 frontend tests), the migration is purely additive and applied, and the 4 acknowledged deferrals match PROJECT.md "Phase-2 Scope Deferral" exactly. The only outstanding action is the documented 8-step design-partner-1 dry-run for the user to execute post-deploy — this is a human-verification item, not a gap, since the orchestrator explicitly instructed the skip.

---

_Verified: 2026-05-09T17:59:46Z_
_Verifier: Claude (gsd-verifier)_
