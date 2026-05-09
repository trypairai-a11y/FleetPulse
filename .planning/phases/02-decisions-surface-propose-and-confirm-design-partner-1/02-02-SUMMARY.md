---
phase: 02-decisions-surface-propose-and-confirm-design-partner-1
plan: 02
subsystem: decisions-api-and-projector
tags: [phase-2, wave-2, decisions-api, audit-api, propose-and-confirm, optimistic-lock, race-safe]
dependency_graph:
  requires:
    - 02-00-wave-0-red-tests
    - 02-01-wave-1-spine-extensions
    - phase-1-agent-runtime
    - phase-1-tool-registry
    - phase-1-writeAgentAction
    - phase-1-upsertAgentMemory
  provides:
    - GET-/api/decisions (CON-decisions-card-shape projections)
    - GET-/api/decisions/pending-count
    - GET-/api/decisions/:id
    - POST-/api/decisions/:id/approve (race-safe, re-invokes registry for live tools)
    - POST-/api/decisions/:id/dismiss (writes dismissed:* AgentMemory key)
    - POST-/api/decisions/:id/undo (5-minute window)
    - GET-/api/audit/agent-actions (paginated audit ledger)
    - GET-/api/audit/agent-actions/:id (full row + approver + run)
    - POST-/api/audit/agent-actions/:id/rollback (admin-only, draftCourierMessage soft-rollback)
    - cardProjector-and-evidenceCollector-services
  affects:
    - backend/src/services/decisions/cardProjector.ts
    - backend/src/services/decisions/evidenceCollector.ts
    - backend/src/routes/decisions.ts
    - backend/src/routes/audit.ts
    - backend/src/server.ts
    - backend/jest.config.js
    - backend/src/__tests__/mocks/auth.ts
tech_stack:
  added: []
  patterns:
    - "Optimistic-lock claim via prisma.pendingAgentAction.updateMany({where:{id, resolvedAt:null}}). The where-clause auto-narrows on the second concurrent writer (resolvedAt is non-null after the first update), updateMany returns count=0, and the route returns 409. This is the race-safe path the test 'concurrent approve race' pins down."
    - "Re-invoke pattern for live tool approval: ctx.userId is set when calling toolRegistry.invoke from the approve route, which falls through the registry's gate (requiresApproval && !ctx.userId) and runs tool.execute. Same pattern as Phase 1's queue.ts:103-194 — Wave 2 just adds the audit-row write + the 4-arg shape required by the spy assertion in approveFlow.test.ts."
    - "Audit-only execute branch in /api/decisions/:id/approve. PHASE_2_LIVE_TOOLS = Set([draftCourierMessage]). For tools NOT in the set (flagForReview, proposeCashReminder, Phase-8 hints), the approve route writes the AgentAction row with outcome='success' but skips toolRegistry.invoke — preserving the propose-and-confirm contract while making the operator's confirm visible in the audit log for training."
    - "Modifications clamped to tool.editableParams allow-list (T-02-10 mitigation). Anything the approver puts in req.body.modifications outside that list is silently dropped — a malicious approver cannot rewrite tenantId, driverId, or any field the monitor never drafted."
    - "Soft rollback for draftCourierMessage in audit.ts: notification.updateMany sets type='AGENT_DRAFT_ROLLED_BACK' keyed by metadata.drafterRunId == agentRunId, preserving the original notification body in the audit trail rather than deleting. Tenant-scope is the dominant filter."
    - "Mock authMiddleware made conditional on req.user existence so route tests can compose their own pre-router middleware (decisions tests inject custom tenantId='tenant-A' to assert race safety + audit-row scoping). Existing routes/* tests still get the default identity since they don't inject pre-router."
    - "jest.config.js moduleNameMapper extended with 2-level patterns ('^\\.\\./\\.\\./config$') so src/services/decisions/* tests hit the mock prisma. 3-level paths (src/agent/tools/{read,action}/*) intentionally unmapped — Phase 1 read-tool tests fall through to the real Prisma client (Postgres reachable on dev) and we don't want to disturb that prior equilibrium."
key_files:
  created:
    - backend/src/services/decisions/cardProjector.ts
    - backend/src/services/decisions/evidenceCollector.ts
    - backend/src/routes/decisions.ts
    - backend/src/routes/audit.ts
    - .planning/phases/02-decisions-surface-propose-and-confirm-design-partner-1/02-02-SUMMARY.md
  modified:
    - backend/src/server.ts
    - backend/jest.config.js
    - backend/src/__tests__/mocks/auth.ts
decisions:
  - "Tag values are capitalized labels per the test contract — 'Warn', 'Penalty', 'Suspend', 'Cash reminder', 'Promote', 'Review', 'Other' — not the lowercase set the plan's prose suggested. The cardProjector RED test (line 57) asserts `expect(card.tag).toBe('Warn')`, which is the source of truth. UI-SPEC §3.1.2's Tag Colour Map table also shows capitalized labels. The §4.5 lowercase type alias was a doc inconsistency. The TS export `export type DecisionTag = 'Penalty' | 'Suspend' | 'Warn' | 'Cash reminder' | 'Promote' | 'Review' | 'Other'` matches the test verbatim."
  - "Auth mock changed from unconditional overwrite to fill-in-if-missing. The plan's Wave 0 RED tests for approve/dismiss compose their own pre-router middleware to set req.user with tenantId='tenant-A' and userId='user-42'. The existing mocks/auth.ts unconditionally overwrote that to test-tenant-id/test-user-id — so my approve route saw the wrong tenantId and the agentAction.create assertion failed. Two ways out: change the mock (1 file) or change every Wave 0 test (3 files, plus risk of contradicting the test contract). I changed the mock, with the safety guard `if (!req.user)` so the existing routes/* tests that depend on the default identity still work (verified: 31/31 routes tests pass after the change)."
  - "jest.config.js moduleNameMapper extended for 2-level config imports only. My services/decisions/* files import from '../../config'. The existing pattern '^../config$' uses regex `..` (any 2 chars) so it matches `../config` (1 level) and incidentally `xx/config`, but NOT `../../config` (different length). I added `^\\.\\./\\.\\./config(?:/.*)?$` patterns to the mapper. Critically, I did NOT extend it to cover 3-level paths because the Wave 1 tools/read/* tools (courierProfile, violationsList, cashOutstanding) tests pass against the real Postgres (via real prisma) — adding a 3-level mapper redirected them to the mock which is missing aiScore + violation delegates and broke the tests. Targeted 2-level mapping leaves the pre-existing equilibrium intact."
  - "Audit endpoint read access extended to ACCOUNTANT + VIEWER roles per UI-SPEC §11 Q3 default. The Phase-2 audit log is intentionally a read-mostly surface for cash + supervisor staff, not just owner/admin. The rollback endpoint stays admin-only (rbac('ADMIN','OPS_MANAGER')) per the same spec. Verified by the lint check: `grep -v '^[[:space:]]*//' src/routes/audit.ts | grep -c 'rbac(\"ADMIN\", *\"OPS_MANAGER\")'` returns 1."
  - "Phase-2 rollback ships only for draftCourierMessage. The audit rollback endpoint accepts any AgentAction id but explicitly rejects with 400 + 'Rollback for {toolName} ships in a later phase' when toolName !== 'draftCourierMessage'. This keeps the rollback API forward-compatible — Phase 8 will add per-tool rollback handlers (applyPenalty, suspendDriver, recordCashSettlement) without changing the route surface. The current implementation soft-rollbacks the spawned Notification rows by mutating type to AGENT_DRAFT_ROLLED_BACK rather than deleting (preserves audit trail)."
metrics:
  duration_minutes: 38
  completed: 2026-05-09T20:23:00Z
  tasks_completed: 3
  files_created: 4
  files_modified: 3
  commits:
    - "2bd4a77 — Task 1 (cardProjector + evidenceCollector services + jest mapper extension)"
    - "886380a — Task 2 (decisions.ts router with 6 endpoints + auth mock conditional fill-in)"
    - "5f8c155 — Task 3 (audit.ts router with 3 endpoints + server.ts mounts)"
---

# Phase 2 Plan 02: Wave 2 Decisions API + Audit API Summary

**One-liner:** /api/decisions/* (6 endpoints) + /api/audit/agent-actions/* (3 endpoints) ship the propose-and-confirm lifecycle on top of Phase 1's PendingAgentAction + AgentAction + AgentMemory primitives, with race-safe optimistic-lock approve, dismiss-to-AgentMemory for 7-day suppression, 5-minute undo window, and Phase-2-scoped soft rollback for draftCourierMessage. cardProjector + evidenceCollector services drive the CON-decisions-card-shape projection that Wave 3's frontend will consume.

## What Was Built

### 1. cardProjector + evidenceCollector services

**`backend/src/services/decisions/cardProjector.ts`** ships `projectPendingAction(pa, ctx)` mapping a PendingAgentAction row to DecisionCardData per CON-decisions-card-shape (UI-SPEC §3.1.2 + §4.5).

| Mapping | Output |
| ------- | ------ |
| toolName → DecisionTag | `draftCourierMessage` → "Warn" (default), "Cash reminder" (intent=CASH_REMINDER), "Promote" (intent=PROMOTE_TOP_PERFORMER); `flagForReview` → "Review"; `proposeCashReminder` → "Cash reminder"; legacy triage tools `proposeCoachingMessage` → "Warn", `snoozeAlert` → "Other", `proposeAppealDecision` → "Review"; Phase-8 hints `applyPenalty` → "Penalty", `suspendDriver` → "Suspend" |
| toolIsLive | true ONLY for `draftCourierMessage` in Phase 2 (PHASE_2_LIVE_TOOLS = Set([draftCourierMessage])). The UI uses this to disable the Approve button on Phase-8 cards with the tooltip "Action tool ships in Phase 8 — your approval is recorded for training." |
| state | derived: resolvedAt==null → "pending"; resolvedAt!=null + resolution=="approved" → "approved"; otherwise → "dismissed" |
| driverName | tenant-scoped lookup `prisma.driver.findFirst({where:{id:subjectId, tenantId:ctx.tenantId}})` when subjectType==="Driver"; falls back to "(unknown)" if the driver row is missing or the subject is non-Driver |
| headline | `${driverName} — ${first 90 chars of reasoning before period or newline}…` |
| evidence[] | delegates to evidenceCollector — see below |
| approvedAt/approvedById/dismissedAt/dismissalReason | only populated for terminal states |

**`backend/src/services/decisions/evidenceCollector.ts`** ships `collectEvidence(pa)` returning per-anomaly Evidence[]. All Prisma reads tenant-scoped (lint:tenant verifies):

| Trigger | Source | Filter | Cap |
| ------- | ------ | ------ | --- |
| `draftCourierMessage` intent=`WARN_LATE_CLOCKIN` | `AttendanceRecord` | tenantId+driverId, status="LATE", date>=now-7d | 3 |
| `draftCourierMessage` intent=`WARN_ORDER_REJECTIONS` | `OrderLog` | tenantId+driverId, date>=now-2h | 5 |
| `draftCourierMessage` intent=`WARN_GPS_STALE` | `CourierOnlineSession` | tenantId+driverId, isOnline=true, latest | 1 |
| `draftCourierMessage` intent=`CASH_REMINDER` | `CashRecord` | tenantId+driverId, pendingDues>0, latest | 1 |
| `draftCourierMessage` intent=`COACHING_PERFORMANCE` | `AttendanceRecord` (LATE) | as above | 3 |
| `proposeCashReminder` | `CashRecord` | as above | 1 |
| `flagForReview` | placeholder for the subjectType (Shift/CashRecord/Order/Violation/Driver) | n/a | 1 |
| Other (legacy triage, Phase-8 hints, GENERIC, PROMOTE_TOP_PERFORMER) | n/a | n/a | 0 |

Evidence shape: `{ type, label, entityType, entityId, href? }` per UI-SPEC §4.5.

### 2. /api/decisions/* router (6 endpoints)

**`backend/src/routes/decisions.ts`** — Express Router, `router.use(authMiddleware, tenantScope)` at the top.

| Endpoint | RBAC | Behaviour |
| -------- | ---- | --------- |
| `GET /` | implicit (auth+tenantScope) | Paginated `DecisionCardData[]` + 8-chip counts (`all`, `pending`, `high-conf`, `this-week`, `penalty`, `cash`, `warn`, `suspend`, `promote`). Filter chip narrows where; sort options: priority (default), newest, confidence. Pagination capped at 100 (T-02-13). |
| `GET /pending-count` | implicit | `{ count }` of `tenantId + resolvedAt:null` rows for the sidebar badge. |
| `GET /:id` | implicit | Single permalink card. 404 cross-tenant via `where:{id, tenantId}` (T-02-12 — never reveal existence across tenants). |
| `POST /:id/approve` | ADMIN/OPS_MANAGER/SUPERVISOR | findFirst → 404 if missing → 409 if resolvedAt!=null → optimistic-lock `updateMany {where:{id, resolvedAt:null}}` → if count!=1 then 409 (race-safe T-02-14) → for live tools, re-invoke `toolRegistry.invoke(toolName, {tenantId, agentId, runId, actorRole, userId}, finalInput, {})` → write `AgentAction` via `writeAgentAction({proposer:'Darb', approverUserId, agentRunId, toolName, originalProposal, modificationsBeforeApproval, outcome, reasoning, errorMessage, subjectType, subjectId})` → `publishEvent('agent_action_resolved', {pendingActionId, agentActionId, resolution:'approved', isLive})`. |
| `POST /:id/dismiss` | ADMIN/OPS_MANAGER/SUPERVISOR | 400 if reason missing/empty → findFirst → 404 → 409 if resolved → optimistic-lock claim → `upsertAgentMemory({tenantId, key:'dismissed:{toolName}:{subjectType}:{subjectId}', value:{reason, dismissedBy, dismissedAt, originalProposal, pendingActionId}, confidence:0.95, source:'user_correction', agentRunId})` → publishEvent. The `dismissed:*` key is what the monitor's listAgentMemory(prefix='dismissed:') call (Phase 1 Wave 1 monitor.md Step 1) reads on every tick to apply the 7-day suppression. |
| `POST /:id/undo` | ADMIN/OPS_MANAGER/SUPERVISOR | findFirst → 404 → 409 if not yet approved or resolution!='approved' → finds the most-recent matching AgentAction row → 409 if elapsed > 5 min ("Use /api/audit/agent-actions/:id/rollback") → marks AgentAction.outcome='rolled_back' + rolledBackAt + rolledBackById + rollbackReason='user-undo' → reverts PendingAgentAction.resolvedAt + resolution + resolvedBy → publishEvent. |

### 3. /api/audit/agent-actions/* router (3 endpoints)

**`backend/src/routes/audit.ts`** — Express Router, `router.use(authMiddleware, tenantScope)`.

| Endpoint | RBAC | Behaviour |
| -------- | ---- | --------- |
| `GET /agent-actions` | ADMIN/OPS_MANAGER/SUPERVISOR/ACCOUNTANT/VIEWER | Paginated AgentAction[] with filters: dateFrom, dateTo, toolName, outcome, approverId, subjectType, subjectId. orderBy createdAt desc. ACCOUNTANT + VIEWER read access per UI-SPEC §11 Q3 default. |
| `GET /agent-actions/:id` | same | Full row + joined approver(id, name, email) + agentRun(id, agentId, model, startedAt, finishedAt, promptTokens, completionTokens). 404 cross-tenant. |
| `POST /agent-actions/:id/rollback` | ADMIN/OPS_MANAGER only | 400 on empty reason. 409 on outcome != "success" or already rolled-back. Phase-2 only `draftCourierMessage` is rollback-safe; other tools 400 with `"Rollback for {toolName} ships in a later phase"`. Soft rollback: `notification.updateMany` sets type='AGENT_DRAFT_ROLLED_BACK' keyed by `metadata.drafterRunId == audit.agentRunId`, preserving the audit trail. Then writes rolledBackAt + rolledBackById + outcome='rolled_back' on the AgentAction. publishEvent for SSE. |

### 4. server.ts mounts

```ts
import decisionsRouter from "./routes/decisions";
import auditRouter from "./routes/audit";
// ...
app.use("/api/decisions", decisionsRouter);
app.use("/api/audit", auditRouter);
```

Mounted immediately after `/api/ai/cos`.

### 5. Test infrastructure adjustments

- **`backend/src/__tests__/mocks/auth.ts`** — change `req.user = {...}` to `if (!req.user) req.user = {...}`. The Wave 0 RED tests inject their own pre-router middleware with custom tenantId/userId; the unconditional overwrite was defeating that intent. Existing routes/* tests still get the default identity.
- **`backend/jest.config.js`** — add 2-level moduleNameMapper for `"../../config"` paths (needed for `src/services/decisions/*` to hit mocks/config in tests). 3-level paths intentionally unmapped to preserve the Wave 1 read-tools-against-real-prisma equilibrium.

## Test File Status at End of Wave 2

| Test File | Status at Wave 2 End | Wave 1 End |
| --------- | -------------------- | ---------- |
| `decisions/cardProjector.test.ts` | GREEN (4/4) | RED |
| `decisions/approveFlow.test.ts` | GREEN (6/6 — incl. concurrency race) | RED |
| `decisions/dismissFlow.test.ts` | GREEN (3/3) | RED |
| Phase 1 + Wave 1 baseline (14 agent suites, routes, middleware, etc.) | GREEN (preserved) | GREEN |

**Aggregate (backend test:agent):** 14/14 suites, 59/59 tests still GREEN — zero regression.

**Aggregate (backend full suite):** 26 passed, 5 failed (31 total). 177 passed, 0 failed (177 total). The 5 still-RED suites are the Wave 4/5 deferred files: billing/* (3 — Wave 4), onboarding/* (2 — Wave 4), and queues/onboardingBackwashWorker (Wave 4). Wave 2 increased passes by 3 suites + 13 tests with zero regressions.

## API Surface Tally (Wave 2)

| Method + Path | Owner | RBAC |
| ------------- | ----- | ---- |
| GET /api/decisions | decisions.ts | auth+tenantScope |
| GET /api/decisions/pending-count | decisions.ts | auth+tenantScope |
| GET /api/decisions/:id | decisions.ts | auth+tenantScope |
| POST /api/decisions/:id/approve | decisions.ts | ADMIN/OPS_MANAGER/SUPERVISOR |
| POST /api/decisions/:id/dismiss | decisions.ts | ADMIN/OPS_MANAGER/SUPERVISOR |
| POST /api/decisions/:id/undo | decisions.ts | ADMIN/OPS_MANAGER/SUPERVISOR |
| GET /api/audit/agent-actions | audit.ts | ADMIN/OPS_MANAGER/SUPERVISOR/ACCOUNTANT/VIEWER |
| GET /api/audit/agent-actions/:id | audit.ts | same |
| POST /api/audit/agent-actions/:id/rollback | audit.ts | ADMIN/OPS_MANAGER |

**Total:** 9 new endpoints. All tenant-scoped via `authMiddleware + tenantScope`.

## Tag Mapping Reference

| toolName | input.intent | DecisionTag | Live in Phase 2? |
| -------- | ------------ | ----------- | ---------------- |
| draftCourierMessage | WARN_LATE_CLOCKIN | Warn | yes |
| draftCourierMessage | WARN_ORDER_REJECTIONS | Warn | yes |
| draftCourierMessage | WARN_GPS_STALE | Warn | yes |
| draftCourierMessage | COACHING_PERFORMANCE | Warn | yes |
| draftCourierMessage | CASH_REMINDER | Cash reminder | yes |
| draftCourierMessage | PROMOTE_TOP_PERFORMER | Promote | yes |
| draftCourierMessage | GENERIC | Other | yes |
| flagForReview | n/a | Review | no (audit-only) |
| proposeCashReminder | n/a | Cash reminder | no (Phase 8 wires Cash Workbench) |
| proposeCoachingMessage | n/a | Warn | (legacy triage) |
| proposeAppealDecision | n/a | Review | (legacy triage) |
| snoozeAlert | n/a | Other | (legacy triage) |
| applyPenalty | n/a | Penalty | no (Phase 8) |
| suspendDriver | n/a | Suspend | no (Phase 8) |

## Race-Safety Strategy (T-02-14 mitigation)

The "concurrent approve race" test in `approveFlow.test.ts` (line 166-193) sends two simultaneous POST requests for the same PendingAgentAction id and asserts exactly one returns 200 + one returns 409. This is the canonical optimistic-lock race.

The implementation:

```ts
const claim = await prisma.pendingAgentAction.updateMany({
  where: { id: pa.id, resolvedAt: null },
  data: { resolvedAt: new Date(), resolution: "approved", resolvedBy: userId },
});
if (claim.count !== 1) {
  return res.status(409).json({ error: "Decision already resolved by another writer" });
}
```

Both writers race on the `WHERE resolvedAt IS NULL` predicate. Postgres serialises the two `UPDATE` statements: the first succeeds (count=1, resolvedAt becomes NOW()), the second's WHERE no longer matches (resolvedAt is now non-null) → count=0 → my route returns 409. The same pattern guards `/dismiss` and any other lifecycle write.

The early `findFirst → resolvedAt non-null → 409` bail is a courtesy short-circuit for the common-case "user clicks twice in 5 seconds" pattern. The optimistic-lock claim is the actual race-safety primitive.

## 5-Minute Undo Window Decision

The undo endpoint in `decisions.ts` enforces a 5-minute window from `AgentAction.createdAt`. Older approvals must use `POST /api/audit/agent-actions/:id/rollback` (admin-only). Rationale (UI-SPEC §5.4 + T-02-15):

1. **5 min ≈ "I just clicked Approve by mistake"** — covers the realistic operator-mistake horizon without requiring a heavy audit trail.
2. **Phase-2 toast pattern** (UI-SPEC §5.4) shows an Undo button for 5 seconds; the server-side window (5 min) is intentionally larger to handle the case where the user reaches for Undo after a slow network round-trip. The UI-side 5s vs server-side 5m gap also gives Phase 8 room to extend the toast without re-deploying the server.
3. **Owner-authorised rollback** lives at `/api/audit/agent-actions/:id/rollback` (admin-only). This means a 1-hour-old "I just realised that warning was wrong" recovery requires admin sign-off — appropriate friction for after-the-fact reversals.

## Verification Commands

```bash
cd backend
npx jest src/__tests__/decisions/    # 13/13 GREEN (3 suites)
npm run test:agent                   # 14/14 suites, 59/59 tests still GREEN
npm test                             # 26 passed, 5 failed (Wave 4/5 RED), 177 tests passing
npx tsc --noEmit                     # 0 errors in non-test code
npm run lint:tenant                  # 0 errors
grep -v '^[[:space:]]*//' src/routes/audit.ts \
  | grep -c 'rbac("ADMIN", *"OPS_MANAGER")'   # → 1
```

## Hand-off Note for Wave 3

Wave 3's first act:

1. **Build `frontend/src/app/(dashboard)/decisions/page.tsx`** — DecisionsList component consuming `GET /api/decisions?status=pending&limit=25` with 30-second polling (UI-SPEC §5.3). Uses `<DecisionCard />` per CON-decisions-card-shape, `<TagPill />` colour-mapped from DecisionTag, `<EvidenceList />` for the disclosure, `<EditDrawer />` for the bodyEnglish edit (only param in editableParams for draftCourierMessage), keyboard nav per UI-SPEC §3.1.3. Wave 0's frontend RED test (`DecisionsList.test.tsx`) becomes the contract.

2. **Build `frontend/src/app/(dashboard)/decisions/audit/page.tsx`** — AuditLog DataTable consuming `GET /api/audit/agent-actions` with the filter chips (date range, tool, outcome, approver). Per-row "Rollback" button (admin-only) calling `POST /api/audit/agent-actions/:id/rollback` with the inline reason confirm.

3. **Build `frontend/src/app/(dashboard)/decisions/[id]/page.tsx`** — single-card permalink consuming `GET /api/decisions/:id`. Shareable link surface for ops staff to ping each other.

4. **Sidebar badge** — read `GET /api/decisions/pending-count` every 30s, render the count next to the "Decisions" sidebar item; if pending > 0 surface a primary-coloured pill, otherwise hide the badge.

5. **30-second poll adapter** — a small hook `useDecisionsList(filters)` that wraps SWR or React Query against `/api/decisions` with 30s revalidation. Wave 4's chat surface upgrades this to SSE; Wave 3's poll is intentionally simple per UI-SPEC §5.3.

6. **Optimistic UI** — Approve/Dismiss flip the card state immediately; on 4xx/5xx, revert + surface error toast (UI-SPEC §5.1). The 5s undo toast (UI-SPEC §5.4) calls `POST /api/decisions/:id/undo` from the client; the server side already enforces the 5-min window so the client doesn't need to validate timestamps.

7. **Cross-cutting: cardProjector evolution.** When Phase 8 ships `applyPenalty` and `suspendDriver` execute bodies, the only Wave 2 code that needs to update is the `PHASE_2_LIVE_TOOLS` set — adding new entries to that Set is what flips the toolIsLive flag from false to true. The TOOL_TO_TAG mapping is already in place. This is the cleanest extension point.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Mock authMiddleware overwrote test-injected req.user**

- **Found during:** Task 2 — approveFlow.test.ts test 3 ("writes AgentAction with proposer='Darb', approverId=req.user.userId") asserted tenantId="tenant-A" but my route saw "test-tenant-id".
- **Issue:** The test composes its own pre-router middleware: `app.use((req, _res, next) => { req.user = { userId: "user-42", tenantId: "tenant-A", role: "ADMIN" }; next(); }); app.use("/api/decisions", decisionsRouter);`. But the router itself does `router.use(authMiddleware, tenantScope)` which → moduleNameMapper → mocks/auth.ts which unconditionally set `req.user = { userId: "test-user-id", tenantId: "test-tenant-id", ... }`. The tests' injected user got overwritten.
- **Fix:** Changed mocks/auth.ts to `if (!req.user) { req.user = {...} }` — fill-in defaults only when no user is set. This restores the prior default behaviour for routes/* tests (which don't inject anything pre-router) while letting decisions tests' injected user flow through.
- **Files modified:** `backend/src/__tests__/mocks/auth.ts`.
- **Commit:** Folded into 886380a (Task 2).

**2. [Rule 3 — Blocking] jest moduleNameMapper didn't cover 2-level config imports**

- **Found during:** Task 1 — cardProjector test failed with `expect(prisma.driver.findFirst).toHaveBeenCalledWith(...)` — number of calls 0. Tracing showed my code's `prisma` resolved to the real PrismaClient (Postgres on dev), not the mock — so the test's mock spy was never invoked.
- **Issue:** moduleNameMapper had `^../config$` which (regex `..`=any 2 chars) matches `../config` but not `../../config`. My services/decisions/* files are 2 levels deep so they import `../../config`.
- **Fix:** Added `"^\\.\\./\\.\\./config$"` and `"^\\.\\./\\.\\./config/(.*)$"` to the mapper. Did NOT add 3-level patterns because tools/{read,action}/* tests pass against real Postgres (they use `../../../config`); routing those to the mock breaks them (mock lacks aiScore + violation delegates).
- **Files modified:** `backend/jest.config.js`.
- **Commit:** Folded into 2bd4a77 (Task 1).

**3. [Rule 1 — Bug] toolRegistry.invoke called with 3 args, test expects 4**

- **Found during:** Task 2 — approveFlow.test.ts test 4 asserted `expect(spy).toHaveBeenCalledWith("draftCourierMessage", expect.objectContaining({...}), PENDING.input, expect.any(Object))` (4 args).
- **Issue:** My initial route code called `toolRegistry.invoke(pa.toolName, ctx, finalInput)` (3 args). The registry's signature accepts an optional 4th `opts` arg; the test pins the 4-arg shape so the spy assertion passes.
- **Fix:** Pass an explicit `{}` opts object as the 4th arg with a comment explaining the call-shape stability: `toolRegistry.invoke(pa.toolName, ctx, finalInput, {})`. The empty opts is correct semantically — the proposal-path opts (recommendation/reasoning/confidence) are only consulted when ctx.userId is unset, which isn't this code path.
- **Files modified:** `backend/src/routes/decisions.ts`.
- **Commit:** Folded into 886380a (Task 2).

**4. [Rule 3 — Blocking] AgentRunLog has no totalLatencyMs field**

- **Found during:** Task 3 — TS error: `totalLatencyMs does not exist in type AgentRunLogSelect`.
- **Issue:** I borrowed the `totalLatencyMs` field from the plan's prose without checking the schema. The actual AgentRunLog has `promptTokens`, `completionTokens`, `startedAt`, `finishedAt`, but no aggregate latency field — the timing is `finishedAt - startedAt`.
- **Fix:** Replaced `totalLatencyMs: true` with `startedAt: true, finishedAt: true, promptTokens: true, completionTokens: true` in the GET /agent-actions/:id include — the front-end can derive the duration from the timestamps.
- **Files modified:** `backend/src/routes/audit.ts`.
- **Commit:** Folded into 5f8c155 (Task 3).

**5. [Rule 3 — Blocking] Tenant lint rule false-positive on `as any` cast around where**

- **Found during:** Task 2 — `npm run lint:tenant` reported error on `prisma.agentAction.findFirst` even though `tenantId` was the first key inside the where.
- **Issue:** The lint rule `no-prisma-without-tenant.js` walks the AST: when the `where` value is an `ObjectExpression`, it scans for a `tenantId` key. But when I wrote `where: {tenantId, ...} as any` (the `as any` is a TSAsExpression in the AST), the rule sees a TSAsExpression as the value of `where` and short-circuits — `whereContainsTenantId(TSAsExpression)` returns false because it's not an ObjectExpression.
- **Fix:** Removed the `as any` cast on the undo endpoint's agentAction.findFirst call. The Prisma generated types accept the where shape natively; the cast was a leftover defensive habit not needed here.
- **Files modified:** `backend/src/routes/decisions.ts`.
- **Commit:** Folded into 886380a (Task 2).

### Rule 4 (architectural) — None

No architectural changes. Wave 2 ships pure routing + projection on top of Phase 1's primitives + Wave 1's monitor agent.

## Threat Model Compliance

| Threat | Mitigation Status |
| ------ | ----------------- |
| T-02-09 — Spoofing of approve route caller | DONE — authMiddleware verifies JWT; req.user.userId is the only source of approverId. Never read approverId from req.body. RBAC restricts to ADMIN/OPS_MANAGER/SUPERVISOR. |
| T-02-10 — Tampering modifications field | DONE — modifications clamped to `tool.editableParams` allow-list before merge into finalInput. Out-of-list keys silently dropped. The merged input still goes through tool.execute which re-validates Zod inputValidator + tenant-scoped Prisma queries. |
| T-02-11 — Repudiation: approve audit row write timing | DONE — for live tools, AgentAction is written AFTER tool.execute returns (success → outcome:'success'; failure → outcome:'failure' + errorMessage). For audit-only tools, AgentAction is written with outcome:'success' before any side effect (there is none). PendingAgentAction.resolvedAt is updated via the optimistic-lock claim BEFORE either path runs, so the audit row reflects the winning writer. |
| T-02-12 — Information disclosure: cross-tenant GET /api/decisions/:id | DONE — `where:{id, tenantId}` is the canonical filter; cross-tenant lookups return 404 (not 403, to avoid revealing existence). |
| T-02-13 — DoS via unbounded query | DONE — pagination capped at limit=100 (default 25). Prisma index on (tenantId, resolvedAt, priorityScore) per Phase 1 schema. The 8 chip-count queries fan out in parallel (Promise.all); Phase 11 caching opportunity flagged in code. |
| T-02-14 — Race: concurrent approve/dismiss | DONE — optimistic-lock via `prisma.pendingAgentAction.updateMany({where:{id, resolvedAt:null}})`. First writer count=1, second count=0 → 409. approveFlow.test.ts test 6 pins this. |
| T-02-15 — Repudiation: rollback bypassing time bounds | DONE — POST /api/decisions/:id/undo enforces 5-min window from AgentAction.createdAt. Older rollbacks must use POST /api/audit/agent-actions/:id/rollback (admin-only RBAC). |
| T-02-16 — Audit log exposes courier PII across tenants | DONE — audit endpoint is read-only and tenant-scoped via the where:{tenantId} filter. ACCOUNTANT/SUPERVISOR/VIEWER have read access; rollback restricted to ADMIN/OPS_MANAGER. AgentAction.reasoning + originalProposal redaction is enforced upstream by monitor.md's Step 6 (Phase 1 Wave 1). |

## Self-Check: PASSED

Verified all 5 created files exist and all 3 commits are reachable:

```
FOUND: backend/src/services/decisions/cardProjector.ts
FOUND: backend/src/services/decisions/evidenceCollector.ts
FOUND: backend/src/routes/decisions.ts
FOUND: backend/src/routes/audit.ts
FOUND COMMIT: 2bd4a77 (Task 1 — cardProjector + evidenceCollector + jest mapper)
FOUND COMMIT: 886380a (Task 2 — decisions.ts router + auth mock conditional)
FOUND COMMIT: 5f8c155 (Task 3 — audit.ts router + server.ts mounts)
```

## Threat Flags

None — Wave 2 ships HTTP surface that is fully covered by the threat_model section above. The 9 new endpoints all sit behind authMiddleware + tenantScope + (where appropriate) rbac, and the only outbound mutation paths (approve → tool.execute → notification.create; dismiss → upsertAgentMemory; rollback → notification.updateMany) are all tenant-scoped and audit-logged.
