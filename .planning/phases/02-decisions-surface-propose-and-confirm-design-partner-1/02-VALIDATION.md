---
phase: 2
slug: decisions-surface-propose-and-confirm-design-partner-1
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract. Sourced from `02-RESEARCH.md` § Validation Architecture (lines 1144–1364). Phase 2 is the strategic wedge AND the most eval-critical phase — the agent now drafts proposals, so prompt regressions must be caught.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend Framework** | Jest 30.3.0 + ts-jest 29.4.9 |
| **Frontend Framework** | Vitest |
| **Backend config** | `backend/jest.config.js` |
| **Frontend config** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && npm run test:agent` |
| **Frontend quick** | `cd frontend && npm test` |
| **Full suite command** | `cd backend && npm test && cd ../frontend && npm test` |
| **Estimated runtime** | quick ~10s, full ~60s |

---

## Sampling Rate

- **After every task commit:** Run quick-test for the affected scope (agent / decisions routes / frontend components)
- **After every plan wave:** Run full backend + frontend suite
- **Before `/gsd-verify-work`:** Full suite green + lint:tenant clean + monitoring smoke test passes
- **Max feedback latency:** ~10 seconds (quick), ~60 seconds (full)

---

## Per-Task Verification Map

> Will be populated by planner at task creation. Pre-staged from research §Validation Architecture below. Status will go from ⬜ to ✅ as Waves 1–5 implement against the Wave 0 RED scaffolding.

| Req ID | Behavior | Test Type | Automated Command | Status |
|--------|----------|-----------|-------------------|--------|
| REQ-decisions-proposal-inbox | `/api/decisions` returns CON-decisions-card-shape projections | unit | `cd backend && npx jest decisions/cardProjector` | ⬜ |
| REQ-decisions-proposal-inbox | `/decisions` page renders cards via mocked API | component | `cd frontend && npx vitest decisions/DecisionsList` | ⬜ |
| REQ-agent-continuous-monitoring | Monitor agent runs end-to-end (read tools → write tool → PendingAgentAction created) | integration | `cd backend && npx jest agent/monitor/monitoringSmoke` | ⬜ |
| REQ-agent-continuous-monitoring | Tiered cadence: monitorTick("hot")/("warm")/("cold") fires at right intervals | unit | `cd backend && npx jest agent/scheduler/monitorTier` | ⬜ |
| REQ-agent-action-drafting | Prompt regression: monitor produces gold-set proposals | snapshot | `cd backend && npx jest agent/monitor/promptRegression` | ⬜ |
| REQ-agent-propose-confirm | Monitor NEVER executes a write tool side effect | unit | `cd backend && npx jest agent/monitor/neverExecutes` | ⬜ |
| REQ-agent-propose-confirm | Approve route writes AgentAction with proposer="Darb", approver=userId, resolution=approved | unit | `cd backend && npx jest decisions/approveFlow` | ⬜ |
| REQ-agent-propose-confirm | Concurrent approve race: 1st returns 200, 2nd returns 409 (optimistic-lock via updateMany where {id, resolvedAt: null}) | unit | `cd backend && npx jest decisions/approveFlow -t "concurrent approve race"` | ⬜ |
| REQ-agent-propose-confirm | Dismiss route writes AgentMemory with key=`dismissed:*` and reason metadata | unit | `cd backend && npx jest decisions/dismissFlow` | ⬜ |
| REQ-agent-propose-confirm | Monitor's next run skips proposing identical action when dismissed:* exists < 7 days ago | integration | `cd backend && npx jest agent/monitor/dismissSuppression` | ⬜ |
| REQ-pricing-model | computeMonthlyBill: 150 active couriers → KD 300 | unit | `cd backend && npx jest billing/billingService` | ⬜ |
| REQ-pricing-model | computeMonthlyBill: 50 active couriers → KD 200 (floor) | unit | same | ⬜ |
| REQ-pricing-model | Design partner override: monthlyOverrideKd=100 → netKd=100 regardless of activeCount | unit | same | ⬜ |
| REQ-pricing-model | Override applies only to one tenant (no leakage) | unit | `cd backend && npx jest billing/overrideIsolation` | ⬜ |
| REQ-gtm-onboarding | OnboardingBackwashWorker chunks 30 days into 5-day windows | unit | `cd backend && npx jest queues/onboardingBackwashWorker` | ⬜ |
| REQ-gtm-onboarding | Onboarding wizard step 4 polls and reports per-platform progress | integration | `cd backend && npx jest onboarding/backwashProgress` | ⬜ |
| REQ-gtm-onboarding | "Darb's read on your fleet" report renders all 9 sections (UI-SPEC §3.4.3) | snapshot | `cd backend && npx jest onboarding/reportRender` | ⬜ |
| REQ-gtm-onboarding | Frontend report renders white background (per feedback_invoices_white_background) | component | `cd frontend && npx vitest admin/DarbsReadReport` | ⬜ |
| Tenant scope (all new routes) | lint:tenant exits clean across new agent + decisions + admin routes | lint | `cd backend && npm run lint:tenant` (extend scope) | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/decisions/cardProjector.test.ts`
- [ ] `backend/src/__tests__/decisions/approveFlow.test.ts`
- [ ] `backend/src/__tests__/decisions/dismissFlow.test.ts`
- [ ] `backend/src/__tests__/agent/monitor/monitoringSmoke.test.ts`
- [ ] `backend/src/__tests__/agent/monitor/neverExecutes.test.ts`
- [ ] `backend/src/__tests__/agent/monitor/dismissSuppression.test.ts`
- [ ] `backend/src/__tests__/agent/monitor/promptRegression.test.ts` + 10 gold-set fixtures
- [ ] `backend/src/__tests__/agent/scheduler/monitorTier.test.ts`
- [ ] `backend/src/__tests__/billing/billingService.test.ts`
- [ ] `backend/src/__tests__/billing/overrideIsolation.test.ts`
- [ ] `backend/src/__tests__/queues/onboardingBackwashWorker.test.ts`
- [ ] `backend/src/__tests__/onboarding/backwashProgress.test.ts`
- [ ] `backend/src/__tests__/onboarding/reportRender.test.ts`
- [ ] `frontend/src/__tests__/decisions/DecisionsList.test.tsx`
- [ ] `frontend/src/__tests__/admin/DarbsReadReport.test.tsx`
- [ ] Extend `lint:tenant` script scope to include the new files (`src/agent/monitor/ src/services/decisions/ src/services/billing/ src/services/onboarding/ src/routes/decisions.ts src/routes/admin/`)

---

## Eval Harness — Gold-Set Fixtures

10 gold-set fixtures live in `backend/src/__tests__/agent/monitor/promptRegression.test.ts`. Each fixture seeds a known anomaly state, runs the monitor agent, and asserts:
- minProposals (≥ N proposals expected)
- requiredToolNames (these tools must appear in proposed `PendingAgentAction.toolName`)
- forbiddenToolNames (e.g., suspendDriver/applyPenalty must NOT appear in v1)
- proposalShouldMention (key strings the reasoning must contain)

Fixture coverage:
1. 3-late-clockins → warn
2. GPS-stale > 10 min → ping
3. 3+ order rejections cluster → warn
4. Cash mismatch > KD 5 → reminder
5. Performance regression (week-over-week) → warn
6. Repeated dismissed action (suppression test)
7. Empty state (no anomalies → no proposals)
8. Multi-anomaly courier (rate-limit: ≤1 proposal per courier per tier per run)
9. Disabled tenant (no proposals)
10. Edge: courier deleted mid-run (graceful skip)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner lands on `/decisions` after sign-in (Cmd+1 navigates to first card) | REQ-decisions-proposal-inbox | UX flow + auth state interaction not feasible to fully automate | 1) Seed dev DB with proposals 2) Sign in as owner 3) Verify URL = `/decisions` 4) Press Cmd+1, focus moves to first card |
| Approve flow: dismissed-then-re-proposed scenario over 8 days | REQ-agent-propose-confirm | Time-dependent (7-day suppression window) | Manual time-travel test in dev with `fakeTimers` or just walk through with clock-shifted env var |
| Design partner #1 sees KD 100 not KD 200 in `/admin/billing` | REQ-pricing-model | Production-tenant-only data | After production deploy, sign in as super-admin to design partner #1's tenant, verify billing card shows KD 100 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (full suite)
- [ ] Eval harness 10 gold-set fixtures all GREEN before phase verify
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
