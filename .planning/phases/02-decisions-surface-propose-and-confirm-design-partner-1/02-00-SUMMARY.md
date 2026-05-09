---
phase: 02-decisions-surface-propose-and-confirm-design-partner-1
plan: 00
subsystem: testing-and-tooling
tags: [tdd, red-tests, eval-harness, lint-tenant, vitest, jest, wave-0, gold-set]
dependency_graph:
  requires:
    - phase-1-wave-0-eslint-rule
    - phase-1-jest-mocks
    - phase-1-walking-skeleton
  provides:
    - failing-tests-for-wave-1-2-3-4-5
    - 10-gold-set-fixtures
    - extended-lint-tenant-scope
    - frontend-component-red-tests
  affects:
    - backend/package.json
    - backend/src/__tests__/decisions/
    - backend/src/__tests__/agent/monitor/
    - backend/src/__tests__/agent/scheduler/
    - backend/src/__tests__/billing/
    - backend/src/__tests__/queues/
    - backend/src/__tests__/onboarding/
    - backend/src/__tests__/middleware/
    - frontend/src/__tests__/decisions/
    - frontend/src/__tests__/admin/
tech_stack:
  added: []
  patterns:
    - "Module-not-found as RED state (TS2307 + Cannot find module) — tests fail because production code ships in Waves 1-5"
    - "GoldFixture interface + GOLD_FIXTURES aggregator pattern (each fixture = single anomaly class with explicit minProposals/required/forbidden tools)"
    - "Optimistic-lock concurrency race via prisma.pendingAgentAction.updateMany({where:{id, resolvedAt: null}}) — first writer count=1, second count=0 → 409"
    - "promptRegression as it.each over the GOLD_FIXTURES + Jest snapshot of headline+reasoning per fixture"
    - "Per-tier setInterval spy assertions for 60_000 / 900_000 / 3_600_000 ms cadences"
key_files:
  created:
    - backend/src/__tests__/decisions/cardProjector.test.ts
    - backend/src/__tests__/decisions/approveFlow.test.ts
    - backend/src/__tests__/decisions/dismissFlow.test.ts
    - backend/src/__tests__/agent/monitor/monitoringSmoke.test.ts
    - backend/src/__tests__/agent/monitor/neverExecutes.test.ts
    - backend/src/__tests__/agent/monitor/dismissSuppression.test.ts
    - backend/src/__tests__/agent/monitor/promptRegression.test.ts
    - backend/src/__tests__/agent/monitor/fixtures/index.ts
    - backend/src/__tests__/agent/monitor/fixtures/01-late-clockins.ts
    - backend/src/__tests__/agent/monitor/fixtures/02-gps-stale.ts
    - backend/src/__tests__/agent/monitor/fixtures/03-rejection-cluster.ts
    - backend/src/__tests__/agent/monitor/fixtures/04-cash-mismatch.ts
    - backend/src/__tests__/agent/monitor/fixtures/05-perf-regression.ts
    - backend/src/__tests__/agent/monitor/fixtures/06-dismissed-suppression.ts
    - backend/src/__tests__/agent/monitor/fixtures/07-empty-state.ts
    - backend/src/__tests__/agent/monitor/fixtures/08-multi-anomaly-courier.ts
    - backend/src/__tests__/agent/monitor/fixtures/09-disabled-tenant.ts
    - backend/src/__tests__/agent/monitor/fixtures/10-deleted-courier.ts
    - backend/src/__tests__/agent/scheduler/monitorTier.test.ts
    - backend/src/__tests__/billing/billingService.test.ts
    - backend/src/__tests__/billing/overrideIsolation.test.ts
    - backend/src/__tests__/queues/onboardingBackwashWorker.test.ts
    - backend/src/__tests__/onboarding/backwashProgress.test.ts
    - backend/src/__tests__/onboarding/reportRender.test.ts
    - backend/src/__tests__/middleware/superAdmin.test.ts
    - frontend/src/__tests__/decisions/DecisionsList.test.tsx
    - frontend/src/__tests__/admin/DarbsReadReport.test.tsx
  modified:
    - backend/package.json
decisions:
  - "Frontend Vitest infrastructure was ALREADY in place in the repo (vitest.config.ts + setup.tsx with jsdom, @testing-library/jest-dom, next/navigation + next/image mocks). No new dev-deps installed; only the 2 new component test files were added."
  - "promptRegression.test.ts gates on result.status — when CI lacks ANTHROPIC_API_KEY (status=disabled), the prompt-content assertions are skipped but the spine integrity assertion (runs through the runtime, persists AgentRunLog) still fires. This mirrors Phase 1's walkingSkeleton.test.ts pattern."
  - "neverExecutes.test.ts pins TWO invariants: (1) zero notification.create calls during a monitor run, (2) every toolRegistry.invoke call carries ctx.userId === undefined. The second is the harder of the two — it forces Wave 1+ executors to keep ctx.userId UNSET until the human approves through the route."
  - "approveFlow.test.ts concurrency-race test mocks prisma.pendingAgentAction.updateMany via call-counter (first call → count=1, second → count=0). This documents the optimistic-lock pattern Wave 2 must adopt."
  - "Gold-set fixtures use Phase 2's only LIVE tool (draftCourierMessage) for required-tool-names. Phase 8 tools (applyPenalty, suspendDriver) are explicitly listed in forbiddenToolNames for every active-anomaly fixture (4/10) — guards against the prompt accidentally promoting Phase 8 tools before they ship."
  - "Test files use direct `import { prisma } from '../mocks/config'` (Phase 1 deviation 4 pattern) so jest.config.js moduleNameMapper doesn't need to grow. All 14 new test files at depth 2 or 3 follow this pattern."
metrics:
  duration_minutes: 22
  completed: 2026-05-09T18:51:30Z
  tasks_completed: 3
  files_created: 27
  files_modified: 1
  commits:
    - "87f5da7 — Task 1 (14 backend RED test files + 10 gold-set fixtures + 1 fixtures index)"
    - "31f3318 — Task 2 (2 frontend RED component tests)"
    - "a03d056 — Task 3 (lint:tenant scope extended)"
---

# Phase 2 Plan 00: Wave 0 Safety Net Summary

**One-liner:** 14 backend RED test files + 10 gold-set fixtures + 2 frontend
RED component tests + extended lint:tenant scope — every Phase 2
deliverable now has a failing test waiting under `__tests__/` that
Waves 1-5 will turn green.

## What Was Built

Wave 0 lays the **propose-and-confirm safety net** before any feature
code lands in Phase 2. Three deliverables, each in its own commit:

1. **14 backend RED test files** + **10 gold-set fixtures** + 1
   fixtures aggregator. Covers card projection, approve flow (incl.
   the new concurrency race), dismiss flow, monitoring smoke,
   never-executes invariant, dismiss suppression, prompt regression,
   tiered scheduler cadence, billing math, billing override isolation,
   onboarding backwash chunking, onboarding progress polling, "Darb's
   read" report rendering, and super-admin middleware.

2. **2 frontend RED component tests** for DecisionsList (CON-decisions-card-shape
   compliance) and DarbsReadReport (white background + 9 sections).
   Vitest infrastructure was already configured in the repo from a
   prior commit, so this commit only added the 2 component tests.

3. **`lint:tenant` scope extended** by 8 new path patterns covering
   every Phase 2 backend surface that touches Prisma. The
   `no-prisma-without-tenant` ESLint rule is now armed for Wave 1+:
   any commit dropping a Prisma call without a tenantId filter into
   one of these paths fails the gate.

## Test File Status at End of Wave 0

| Test File                                                     | Status at Wave 0 End | Turns GREEN in   |
| ------------------------------------------------------------- | -------------------- | ---------------- |
| `decisions/cardProjector.test.ts`                             | RED (TS2307)         | Wave 2           |
| `decisions/approveFlow.test.ts`                               | RED (TS2307)         | Wave 2           |
| `decisions/dismissFlow.test.ts`                               | RED (TS2307)         | Wave 2           |
| `agent/monitor/monitoringSmoke.test.ts`                       | RED                  | Waves 1 + 3      |
| `agent/monitor/neverExecutes.test.ts`                         | RED                  | Waves 1 + 3      |
| `agent/monitor/dismissSuppression.test.ts`                    | RED                  | Waves 1 + 2      |
| `agent/monitor/promptRegression.test.ts`                      | RED                  | Waves 1 + 3 + 4  |
| `agent/scheduler/monitorTier.test.ts`                         | RED (interval miss)  | Wave 1           |
| `billing/billingService.test.ts`                              | RED (TS2307)         | Wave 5           |
| `billing/overrideIsolation.test.ts`                           | RED (TS2307)         | Wave 5           |
| `queues/onboardingBackwashWorker.test.ts`                     | RED (TS2307)         | Wave 4           |
| `onboarding/backwashProgress.test.ts`                         | RED (TS2307)         | Wave 4           |
| `onboarding/reportRender.test.ts`                             | RED (TS2307)         | Wave 4           |
| `middleware/superAdmin.test.ts`                               | RED (TS2307)         | Wave 4           |
| `frontend/decisions/DecisionsList.test.tsx`                   | RED (module-404)     | Wave 2           |
| `frontend/admin/DarbsReadReport.test.tsx`                     | RED (module-404)     | Wave 4           |

**Aggregate (backend full suite):** 14 failed, 17 passed (31 total). 144
existing tests still passing — **zero regression** against Phase 1's
142+ baseline.

## Gold-Set Fixtures (10 anomaly classes covered)

| #  | Fixture                          | Tier  | minProposals | Required tool          | Phase 8 forbidden? |
| -- | -------------------------------- | ----- | ------------ | ---------------------- | ------------------ |
| 01 | 3 late clock-ins                 | warm  | ≥1           | draftCourierMessage    | ✓                  |
| 02 | GPS stale 12 min                 | hot   | ≥1           | draftCourierMessage    | ✓                  |
| 03 | 3 order rejections / 2 hours     | hot   | ≥1           | draftCourierMessage    | ✓                  |
| 04 | Cash mismatch KD 28.500          | cold  | ≥1           | draftCourierMessage    | ✓                  |
| 05 | Performance regression           | cold  | ≥1           | draftCourierMessage    | ✓                  |
| 06 | Dismissed 2d ago (suppression)   | warm  | 0            | —                      | (incl. draft)      |
| 07 | Empty fleet                      | hot   | 0            | —                      | (incl. draft)      |
| 08 | Multi-anomaly (rate-limit ≤ 1)   | warm  | ≥1, ≤1/courier| draftCourierMessage   | ✓                  |
| 09 | Disabled tenant (cost guard)     | hot   | 0            | —                      | (incl. draft)      |
| 10 | Deleted courier mid-run          | warm  | 0            | —                      | (incl. draft)      |

Two extra invariants are embedded in `promptRegression.test.ts`:
- Per-fixture Jest snapshot of headline+reasoning so prompt diffs
  surface in PR review.
- Cross-fixture sentinel: every active-anomaly fixture's `forbiddenToolNames`
  must include `applyPenalty` and `suspendDriver`. This prevents a
  contributor from accidentally weakening the Phase 2 → Phase 8
  boundary on individual fixtures.

## lint:tenant Scope Expansion (before / after)

```diff
-eslint src/agent/ src/__tests__/agent/ src/routes/aiChiefOfStaff.ts src/routes/ai.ts
+eslint src/agent/ src/__tests__/agent/ src/routes/aiChiefOfStaff.ts src/routes/ai.ts \
+       src/agent/tools/action/ src/services/decisions/ src/services/billing/ \
+       src/services/onboarding/ src/routes/decisions.ts src/routes/admin/ \
+       src/middleware/superAdmin.ts src/queues/onboardingBackwashWorker.ts
```

Added paths (8): `src/agent/tools/action/`, `src/services/decisions/`,
`src/services/billing/`, `src/services/onboarding/`, `src/routes/decisions.ts`,
`src/routes/admin/`, `src/middleware/superAdmin.ts`,
`src/queues/onboardingBackwashWorker.ts`. `--no-error-on-unmatched-pattern`
keeps the script clean while these directories don't yet exist.

## Verification Commands (Wave 1 should re-run these to confirm RED state)

```bash
cd backend
npm run lint:tenant                           # exit 0
npm run test:agent                            # 9 passed (Phase 1) + 5 RED (Phase 2 monitor/scheduler) = 14 suites
npx jest --testPathPatterns='(decisions|monitor|scheduler|billing|queues|onboarding|middleware/superAdmin)'
                                              # 14 failed, 14 total (Phase 2 RED)
npm test                                      # 17 passed + 14 failed = 31 suites; 144 passed + 17 failed = 161 tests

cd ../frontend
npx vitest run src/__tests__/decisions src/__tests__/admin
                                              # 2 failed (Phase 2 RED)
```

## Hand-off Note for Wave 1

Wave 1's first act should be:

1. **Confirm the RED count hasn't drifted.** Run the verification
   commands above. Expected:
   - Backend full: `Test Suites: 14 failed, 17 passed, 31 total`
   - Backend test:agent: `Test Suites: 5 failed, 9 passed, 14 total`
   - Frontend Phase 2 only: `Test Files  2 failed (2)`

2. **Implement `backend/src/agent/tools/action/draftCourierMessage.ts`
   first.** This single tool flips ALL FOUR of the most-watched RED
   tests:
   - `agent/monitor/neverExecutes.test.ts` (proves monitor never reaches
     execute() for a write tool with `requiresApproval: true`)
   - `agent/monitor/monitoringSmoke.test.ts` (the walking-skeleton smoke
     for the monitor agent)
   - `agent/monitor/promptRegression.test.ts` (gold-set fixtures expect
     this tool name in `requiredToolNames`)
   - `decisions/approveFlow.test.ts` "live tool re-invokes registry"
     test (Wave 2 approve route re-invokes this tool with `ctx.userId`
     set)

3. **Tool spec hint** (extracted from interfaces in 02-00-PLAN.md):
   - `name: "draftCourierMessage"`
   - `sideEffect: "write"`
   - `requiresApproval: true`
   - `allowedAgents: ["monitor"]`
   - `requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"]`
   - `inputValidator: z.object({ driverId: z.string(), body: z.string().min(1) })`
   - `execute(ctx, input)`: ONLY runs when `ctx.userId` is set (the
     registry's approval gate handles the unset path); the body
     calls the existing notificationService to send a WhatsApp / SMS
     message.

4. **Once Wave 1 ships and the four red-bullet tests turn green**, Wave 2
   can layer `routes/decisions.ts` (approve / dismiss / list) on top
   without re-touching the registry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] ts-jest TS2339 on `(prisma.tenant as any) = ...`**

- **Found during:** First `test:agent` run after Task 1.
- **Issue:** The mocks/config.ts prisma stub doesn't expose a `tenant`
  delegate, and ts-jest's strict-property-access caught the bare
  property assignment even though the test only needs to attach a
  jest mock for the duration of one test.
- **Fix:** Replaced `(prisma.tenant as any) = { ... }` with the
  unknown-cast pattern used by Phase 1's tenantIsolation.test.ts:
  `(prisma as unknown as { tenant: { findMany: jest.Mock } }).tenant = {...}`.
- **Files modified:** `backend/src/__tests__/agent/scheduler/monitorTier.test.ts`
- **Commit:** Folded into 87f5da7 (Task 1) — fix landed before commit.

### Rule 4 (architectural) — None

No architectural decisions required. Wave 0 ships pure test scaffolding.

## Pre-existing Frontend Test Failures (out of scope)

`frontend/src/__tests__/lib/formatters.test.ts` and
`frontend/src/__tests__/components/StatusBadge.test.tsx` had pre-existing
failures (16 of them) caused by the Sierra design-token migration
that moved palette from `bg-gray-*` to `bg-sand-*`. These are not
caused by this plan's commits and are out of scope per the plan's
verification rules. Logged for the design-tokens cleanup phase.

## Threat Flags

None — Wave 0 ships pure test scaffolding + a one-line lint:tenant
glob update. No new HTTP surface, no new outbound integrations, no
new secrets, no schema changes.

## Self-Check: PASSED

Verified all 27 created files exist and all 3 commits are reachable:

```
FOUND: backend/src/__tests__/decisions/cardProjector.test.ts
FOUND: backend/src/__tests__/decisions/approveFlow.test.ts
FOUND: backend/src/__tests__/decisions/dismissFlow.test.ts
FOUND: backend/src/__tests__/agent/monitor/monitoringSmoke.test.ts
FOUND: backend/src/__tests__/agent/monitor/neverExecutes.test.ts
FOUND: backend/src/__tests__/agent/monitor/dismissSuppression.test.ts
FOUND: backend/src/__tests__/agent/monitor/promptRegression.test.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/index.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/01-late-clockins.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/02-gps-stale.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/03-rejection-cluster.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/04-cash-mismatch.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/05-perf-regression.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/06-dismissed-suppression.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/07-empty-state.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/08-multi-anomaly-courier.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/09-disabled-tenant.ts
FOUND: backend/src/__tests__/agent/monitor/fixtures/10-deleted-courier.ts
FOUND: backend/src/__tests__/agent/scheduler/monitorTier.test.ts
FOUND: backend/src/__tests__/billing/billingService.test.ts
FOUND: backend/src/__tests__/billing/overrideIsolation.test.ts
FOUND: backend/src/__tests__/queues/onboardingBackwashWorker.test.ts
FOUND: backend/src/__tests__/onboarding/backwashProgress.test.ts
FOUND: backend/src/__tests__/onboarding/reportRender.test.ts
FOUND: backend/src/__tests__/middleware/superAdmin.test.ts
FOUND: frontend/src/__tests__/decisions/DecisionsList.test.tsx
FOUND: frontend/src/__tests__/admin/DarbsReadReport.test.tsx
FOUND COMMIT: 87f5da7 (Task 1 — backend RED tests + fixtures)
FOUND COMMIT: 31f3318 (Task 2 — frontend RED component tests)
FOUND COMMIT: a03d056 (Task 3 — lint:tenant scope expansion)
```
