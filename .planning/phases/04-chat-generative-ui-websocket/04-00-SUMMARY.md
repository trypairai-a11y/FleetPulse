---
phase: 04-chat-generative-ui-websocket
plan: 00
subsystem: chat-red-scaffold
tags: [red-tests, fixtures, eslint-tenant, cmdk, sse]
dependency_graph:
  requires: []
  provides:
    - "backend RED suite for chat surfaces"
    - "frontend RED suite for chat UI"
    - "13-entry gold-set fixture for chat eval"
    - "9-variant chat-views fixture for renderer tests"
    - "cmdk@^1.1.1 frontend dependency"
    - "lint:tenant glob coverage for 7 new chat backend paths"
  affects:
    - "Wave 1+ — RED tests turn GREEN as the schema, services, routes, hooks, and components ship"
tech_stack:
  added:
    - "cmdk@^1.1.1 (frontend dependency for Wave 3 palette rewrite)"
  patterns:
    - "Each test file carries a `@wave N` header naming the wave that flips it GREEN"
    - "RED state = module-not-found OR `it.todo` (whichever keeps Jest/Vitest discovery alive)"
    - "Gold-set fixture is a flat JSON array of 13 entries — extensible without contract changes"
key_files:
  created:
    - backend/src/__tests__/agent/__fixtures__/goldSet.json
    - backend/src/__tests__/agent/tools/view/describeView.test.ts
    - backend/src/__tests__/agent/runtimeStreaming.test.ts
    - backend/src/__tests__/routes/chatStream.test.ts
    - backend/src/__tests__/routes/chatThreads.test.ts
    - backend/src/__tests__/routes/pinnedViews.test.ts
    - backend/src/__tests__/routes/scheduledBriefings.test.ts
    - backend/src/__tests__/queues/scheduledBriefingsWorker.test.ts
    - backend/src/__tests__/services/chatHistoryService.test.ts
    - backend/src/__tests__/ai/goldSet.test.ts
    - backend/src/__tests__/ai/tenantScopeLeak.test.ts
    - backend/src/__tests__/ai/chatActionProposal.test.ts
    - frontend/src/__tests__/fixtures/chat-views.ts
    - frontend/src/__tests__/ai/AskDarbPalette.test.tsx
    - frontend/src/__tests__/ai/ChatViewRenderer.test.tsx
    - frontend/src/__tests__/ai/ChatActionCard.test.tsx
    - frontend/src/__tests__/decisions/PinnedViewsRail.test.tsx
    - frontend/src/__tests__/scheduled-jobs/ScheduledBriefingsList.test.tsx
    - frontend/src/__tests__/hooks/useStreamingChat.test.ts
  modified:
    - backend/package.json (extended lint:tenant glob with 7 Phase 4 paths)
    - frontend/package.json (cmdk@^1.1.1 dependency)
    - frontend/package-lock.json (cmdk install)
decisions:
  - "90-day chat history retention locked in chatHistoryService.test.ts archive case"
  - "standing_rule_v3 deferral to Phase 12 locked in scheduledBriefingsWorker.test.ts no-op case"
  - "SSE-only transport (no WebSocket) locked in chatStream.test.ts + runtimeStreaming.test.ts contracts"
  - "chat-origin AgentAction.source='chat' field locked in chatActionProposal.test.ts"
  - "Zustand decision deferred to Wave 3 executor (default path remains React Context)"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-12"
---

# Phase 4 Plan 00: Wave 0 RED Scaffolding Summary

Phase 4 (Chat / Generative UI / SSE) safety net is in place. 17 new test files, 1 JSON gold-set fixture, 1 TypeScript view fixture, cmdk@^1.1.1, and a 7-path extension of the `lint:tenant` glob landed — zero production code touched.

## File Counts

| Surface | RED Tests | Fixtures | Total Files |
| ------- | --------- | -------- | ----------- |
| Backend | 11        | 1 JSON   | 12          |
| Frontend| 6         | 1 TS     | 7           |
| Config  | 0         | 0        | 2 (frontend + backend package.json) |
| **Total** | **17**  | **2**    | **21**      |

## Backend Test Tally

| Test File                                         | Wave | `it()` | `it.todo` | Notes |
|---------------------------------------------------|------|--------|-----------|-------|
| agent/tools/view/describeView.test.ts             | 1    | 12     | 0         | RED — module not yet shipped |
| agent/runtimeStreaming.test.ts                    | 1    | 1      | 7         | Stream callback contract |
| routes/chatStream.test.ts                         | 2    | 1      | 12        | SSE event contract |
| routes/chatThreads.test.ts                        | 2    | 1      | 12        | CRUD + FTS + cross-user negative |
| routes/pinnedViews.test.ts                        | 1    | 1      | 10        | 9-viewType extension |
| routes/scheduledBriefings.test.ts                 | 5    | 1      | 9         | Cron whitelist + DOS mitigation |
| queues/scheduledBriefingsWorker.test.ts           | 5    | 1      | 7         | JobScheduler bind/unbind + standing_rule_v3 no-op |
| services/chatHistoryService.test.ts               | 1    | 1      | 10        | 90-day retention locked |
| ai/goldSet.test.ts                                | 2    | 7      | 8         | Fixture shape pre-flight + agent eval |
| ai/tenantScopeLeak.test.ts                        | 2    | 2      | 8         | T-04-W0-02 sentinel mitigation |
| ai/chatActionProposal.test.ts                     | 2    | 1      | 10        | T-04-W0-04 audit-source mitigation |

Totals: **29 runtime cases** (17 RED + 12 baseline shape pre-flight), **93 it.todo**.

Backend full suite after this plan: **244 passing** baseline preserved (Phase 1+2+3), **12 failing** (Phase 4 RED — expected), **3 skipped**, **93 todo**. **50 test suites** total.

## Frontend Test Tally

| Test File                                                          | Wave | Status |
|--------------------------------------------------------------------|------|--------|
| ai/AskDarbPalette.test.tsx                                         | 3    | RED (cmdk rewrite pending) |
| ai/ChatViewRenderer.test.tsx                                       | 3    | RED (component not shipped) |
| ai/ChatActionCard.test.tsx                                         | 3    | RED (component not shipped) |
| decisions/PinnedViewsRail.test.tsx                                 | 4    | RED (component not shipped) |
| scheduled-jobs/ScheduledBriefingsList.test.tsx                     | 5    | RED (component not shipped) |
| hooks/useStreamingChat.test.ts                                     | 3    | RED (hook not shipped) |

Frontend full suite after this plan: **51 passing** baseline (Phase 1+2+3) preserved, **6 new RED files**.

## Founder-Level Decisions Locked in Test Contracts

The following four decisions were ratified by writing them as test assertions before any implementation exists. Future waves cannot silently undo them without flipping the corresponding test RED.

1. **90-day chat-history retention.** `chatHistoryService.test.ts` includes the `archiveOldChats sets archivedAt for threads inactive >90 days` case. Any wave that changes the retention window will need to update this test.
2. **`standing_rule_v3` is a no-op until Phase 12.** `scheduledBriefingsWorker.test.ts` asserts `tick() for a standing_rule_v3 briefing is a no-op (defer to Phase 12)`.
3. **SSE-only transport.** `chatStream.test.ts` (`emits :heartbeat ping every 15s during tool-loop`, `sets Content-Type: text/event-stream and Cache-Control: no-cache`) plus `runtimeStreaming.test.ts` (`RunAgentInput.stream callbacks compile-check`) together lock the Vercel-compatible SSE transport. WebSocket reintroduction would flip both files RED.
4. **Chat-origin AgentAction audit row.** `chatActionProposal.test.ts` asserts `AgentAction row written with source='chat'` plus `chatThreadId` + `chatMessageId` populated. T-04-W0-04 (Repudiation) mitigation.

## Gold-Set Fixture (13 entries)

| ID | User Message | Language | View Types | Action? |
|----|--------------|----------|------------|---------|
| gs-01 | Why did revenue drop yesterday in Hawally? | en | kpi_strip + bar_chart + callout | — |
| gs-02 | What's our cash exposure across platforms this week? | en | kpi_strip + table | — |
| gs-03 | Which drivers were late or missed shifts today? | en | table + action_card | — |
| gs-04 | Top 5 performers this week, by completion rate | en | table + comparison_cards | — |
| gs-05 | Where is driver Mohamed Khaled right now? | en | mini_map | — |
| gs-06 | Show me Tariq's score trend for the last 30 days | en | time_series | — |
| gs-07 | Warn the worst 3 drivers from yesterday | en | table + draft_message | yes (draftCourierMessage) |
| gs-08 | Compare Talabat vs Keeta cash exposure this month | en | comparison_cards + bar_chart | — |
| gs-09 | Who's rejecting orders today? | en | table + callout | — |
| gs-10 | Pin yesterday's revenue snapshot | en | kpi_strip (pinnable) | — |
| gs-11 | أعطني ملخص اليوم (Arabic) | ar | kpi_strip | — |
| gs-12 | Delete driver record for Bader (out-of-scope) | en | callout (info) | — |
| gs-13 | Revenue from Saturn (no-data) | en | kpi_strip (empty) + callout | — |

Collective `expectsViewTypes` covers all 9 view variants — asserted by `goldSet.test.ts`.

## STRIDE Threat Mitigations Realised

| Threat ID | Mitigation Test |
|-----------|-----------------|
| T-04-W0-01 (Tampering, missing tenant scope) | backend/package.json `lint:tenant` glob extended to 7 Phase 4 paths |
| T-04-W0-02 (Information disclosure, cross-tenant leak) | `ai/tenantScopeLeak.test.ts` sentinel test |
| T-04-W0-03 (Information disclosure, cross-user chat) | `routes/chatThreads.test.ts` cross-user/cross-tenant cases |
| T-04-W0-04 (Repudiation, audit ambiguity) | `ai/chatActionProposal.test.ts` source='chat' assertion |
| T-04-W0-05 (DoS, cron runaway) | `routes/scheduledBriefings.test.ts` whitelist + invalid-cron reject cases |
| T-04-W0-07 (XSS via viewBlock) | `ai/ChatViewRenderer.test.tsx` unknown-viewType-falls-back-safely case |

## Deferred Items

- **Zustand decision deferred to Wave 3 executor.** Per orchestrator_resolutions §6 the default path remains React Context. Wave 3 executor evaluates whether chat state complexity warrants a state store and either justifies the addition or proceeds with Context.
- **Pre-existing frontend test failure in `driverFile/DriverFilePage.test.tsx`.** Verified to exist BEFORE this plan's changes via `git stash`. Out of scope per executor Rule 4 scope boundary — not touched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Removed eslint-disable comment from describeView RED test**
- **Found during:** Task 1 final verification
- **Issue:** `backend/src/__tests__/agent/tools/view/describeView.test.ts` contained an `// eslint-disable-next-line @typescript-eslint/no-var-requires` comment, but the `lint:tenant` script runs eslint with `--no-eslintrc` and no plugins → the unknown rule reference itself was flagged as an error.
- **Fix:** Removed the inline disable comment; the `require(...)` pattern is intentional in this RED scaffold (the target module does not yet exist; `try/catch` keeps Jest discovery alive).
- **Files modified:** backend/src/__tests__/agent/tools/view/describeView.test.ts
- **Commit:** f50c949

## Commits

- `50efa93` chore(04-00): install cmdk@^1.1.1 + extend lint:tenant glob for Phase 4
- `2a53db1` test(04-00): add 11 backend RED test files + 13-entry gold-set fixture
- `0ae75d9` test(04-00): add 6 frontend RED test files + 9-variant chat-views fixture
- `f50c949` fix(04-00): remove eslint-disable from describeView RED test

## Self-Check: PASSED

- 11 backend test files exist under `backend/src/__tests__/` — verified
- 1 gold-set fixture at `backend/src/__tests__/agent/__fixtures__/goldSet.json` parses with 13 entries — verified
- 6 frontend test files exist under `frontend/src/__tests__/` — verified
- 1 chat-views fixture at `frontend/src/__tests__/fixtures/chat-views.ts` exports 9 view variants — verified
- `cd backend && npm test` → 244 baseline passing, 12 new RED, 93 todo — verified
- `cd backend && npx tsc --noEmit` → 0 errors — verified
- `cd backend && npm run lint:tenant` → exit 0 — verified
- `cd frontend && npm ls cmdk` → cmdk@1.1.1 resolved — verified
- All 4 commits found in `git log` — verified
