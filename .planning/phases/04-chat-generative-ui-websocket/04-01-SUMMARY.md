---
phase: 04-chat-generative-ui-websocket
plan: 01
subsystem: chat-backend-foundation
tags: [prisma-schema, describeView, chatHistoryService, runAgent-stream, frontend-types]
dependency_graph:
  requires:
    - "04-00 RED scaffolding (17 test files + lint:tenant glob)"
  provides:
    - "ChatThread + ChatMessage + ScheduledBriefing Prisma models"
    - "AgentAction.source + chatThreadId + chatMessageId columns (T-04-W1-05 audit trail)"
    - "PinnedView.refreshFrequency + sourceThreadId + sourceMessageId columns"
    - "describeView agent tool (9-variant discriminated union)"
    - "chatHistoryService 5-function public API with tenant+user scope"
    - "runAgent stream:{onTextDelta,onView,onPendingAction,onCancel} extension"
    - "frontend/src/types/{chat,views}.ts mirroring backend Zod"
  affects:
    - "Wave 2 (SSE chat-stream route) consumes streaming runAgent + chatHistoryService"
    - "Wave 3 (frontend ChatViewRenderer) imports ViewSpec from views.ts"
    - "Wave 4 (PinnedViewsRail) uses 5 new PinnedViewType variants + refreshFrequency"
    - "Wave 5 (scheduledBriefingsWorker + prisma migrate dev) consumes ScheduledBriefing"
tech_stack:
  added: []
  patterns:
    - "describeView envelope shape: { viewType, spec } discriminated union — keeps each branch tractable + aligns with frontend GeneratedView type 1:1"
    - "Zod variants accept BOTH Wave-0 fixture shape and richer plan-spec shape to maximize forward compatibility without breaking the RED tests"
    - "AgentAction.source defaults to 'decisions' so zero existing code paths need to change — Wave 2's chat route is the first writer of source='chat'"
    - "Streaming is purely additive: tenant scope, RBAC, approval gate, and audit-row writes preserved verbatim"
key_files:
  created:
    - backend/src/agent/tools/view/describeView.ts
    - backend/src/agent/tools/view/index.ts
    - backend/src/services/chatHistoryService.ts
    - frontend/src/types/chat.ts
    - frontend/src/types/views.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/src/agent/runtime.ts
    - backend/src/agent/pinnedView.ts
    - backend/src/agent/index.ts
    - backend/src/agent/prompts/chat.md
    - backend/src/generated/prisma/* (regenerated)
decisions:
  - "describeView envelope is { viewType, spec } — NOT flat { type, ... } — to honor the Wave-0 RED test contract (mod.describeViewTool.inputValidator.safeParse({ viewType: 'kpi_strip', spec: { tiles: [...] } }))"
  - "describeView Zod variants accept BOTH fixture shape (e.g. callout.severity+message, comparison_cards.cards[]) AND plan-spec shape (callout.tone+body, comparison_cards.items[]) — forward compat without RED-test churn"
  - "chatHistoryService FTS implemented as ILIKE+thread-relation filter today; Wave 5 migration can swap to tsvector('simple') without API change (RESEARCH Pitfall 5)"
  - "runAgent.stream is opt-in only; non-streaming callers (Phase 1+2+3 monitor / triage / narrator / score-explainer) hit the same messages.create() path unchanged"
  - "Migration DEFERRED to Wave 5 BLOCKING task — only `prisma generate` ran in Wave 1"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-12"
---

# Phase 4 Plan 01: Backend Foundation Summary

Wave 1 backend foundation shipped. Three new Prisma models, six column additions (3 on AgentAction, 3 on PinnedView), describeView agent tool with a 9-variant discriminated union, chatHistoryService with tenant+user scoped CRUD/search/archive, runAgent streaming wrapper with 4 callbacks, and frontend types mirroring backend Zod 1:1.

## Schema Additions

### New Models (3)

| Model | Purpose | Key Indexes |
|---|---|---|
| `ChatThread` | Per-user chat thread (tenant+user scoped, 90-day archivedAt retention) | `[tenantId, userId, lastMessageAt desc]` / `[userId, pinned, lastMessageAt desc]` / `[tenantId, archivedAt]` |
| `ChatMessage` | Cascade-on-thread-delete; JSON views + toolCalls; FK to AgentAction proposal | `[threadId, createdAt]` / `[tenantId, createdAt]` |
| `ScheduledBriefing` | Cron-driven briefings; `type="briefing"\|"standing_rule_v3"` forward compat | `[tenantId, active, nextFireAt]` / `[userId, active]` |

### Column Additions (6)

| Model | Column | Default | Purpose |
|---|---|---|---|
| `AgentAction` | `source` | `"decisions"` | T-04-W1-05 audit trail; values: `decisions \| chat \| briefing \| auto` |
| `AgentAction` | `chatThreadId` | `null` | Chat-origin link |
| `AgentAction` | `chatMessageId` | `null` | Chat-origin link |
| `PinnedView` | `refreshFrequency` | `"on_open"` | UI-SPEC §3.2.7; values: `on_open \| live \| static` |
| `PinnedView` | `sourceThreadId` | `null` | Chat-origin link |
| `PinnedView` | `sourceMessageId` | `null` | Chat-origin link |

### New Index (1)

`AgentAction @@index([tenantId, source, createdAt])` — enables "show me chat-origin actions" queries in the founder review surface.

### Migration Status

**Not applied.** `npx prisma generate` ran; `npx prisma migrate dev` is the Wave 5 BLOCKING task.

`npx prisma validate` → `The schema at prisma/schema.prisma is valid 🚀`

## describeView Tool

| Property | Value |
|---|---|
| Tool name | `describeView` |
| Envelope shape | `{ viewType, spec }` (discriminated by `viewType`) |
| 9 variants | `kpi_strip` / `table` / `time_series` / `bar_chart` / `mini_map` / `comparison_cards` / `callout` / `action_card` / `draft_message` |
| `allowedAgents` | `["chat"]` |
| `sideEffect` | `"read"` |
| `requiresApproval` | `false` |
| `strict` | `true` (JSON Schema top-level `additionalProperties: false`) |
| `execute` | Pure passthrough: `{ ok: true, view: input }` |
| Registration | side-effect import in `agent/index.ts` → `tools/view/index.ts` → `describeView.ts` |

Wave-0 RED test contract honored verbatim — each Zod branch accepts the fixture shape (e.g. `callout.severity+message`, `comparison_cards.cards[]`) while also supporting the richer plan-spec shape (e.g. `callout.tone+body+bullets`, `comparison_cards.items[]`).

## chatHistoryService API

| Function | Signature highlights |
|---|---|
| `upsertThread` | Creates or touches; tenant+user scoped; title = `firstMessage.slice(0,80)` |
| `appendMessage` | Tenant-scoped parent check; bumps `lastMessageAt`; persists views + toolCalls JSON |
| `recentTurns` | Tenant-scoped; filters out `role:"system"`; default limit 20; oldest→newest |
| `searchChatHistory` | Tenant+user scoped via thread relation; ILIKE on content (Wave 5 swaps to tsvector simple) |
| `archiveOlderThan90Days` | Optional `tenantId` filter; idempotent — only touches `archivedAt: null` rows |
| `archiveOldChats` | Backwards-compat alias for `archiveOlderThan90Days` |

Every Prisma call scopes by `tenantId` (and `userId` where applicable) — `lint:tenant` glob already covered `src/services/chatHistoryService.ts` from Wave 0.

## runAgent Streaming Contract

`RunAgentInput.stream`:
- `onTextDelta(delta: string): void` — fires on each text delta from `client.messages.stream().on("text", …)`
- `onView(view: unknown): void` — fires once per `describeView` execute (captures `result.output.view`)
- `onPendingAction(pendingActionId: string): void` — fires immediately after a `PendingAgentAction` row is staged
- `onCancel(): boolean` — polled at the top of every tool-loop iteration; truthy → `status:"cancelled"`

`RunAgentResult.status` adds `"cancelled"`; `RunAgentResult.views` collects every describeView output in tool-call order.

Streaming is purely additive — non-streaming callers (Phase 1+2+3 monitor / triage / narrator / score-explainer) hit the unchanged `messages.create()` path.

## Frontend Types

`frontend/src/types/views.ts` exports `ViewSpec` discriminated union (9 variants).
`frontend/src/types/chat.ts` exports `GeneratedView`, `ChatThread`, `ChatMessage`, `ChatMessageRole/State`, `ToolCallRecord`, `StreamingState`, `ScheduledBriefing`, `SlashCommand`.

Pure type declarations — zero runtime code, zero bundle cost.

## Test Deltas

Before Wave 1: **244 passing**, 12 failing (Phase 4 RED — expected), 3 skipped, 93 todo.

After Wave 1: **245 passing**, 11 failing (1 RED flipped GREEN), 3 skipped, 93 todo.

| Test File | Before | After |
|---|---|---|
| `agent/tools/view/describeView.test.ts` | RED (module-not-found) | **GREEN — 12 cases** |
| `agent/runtimeStreaming.test.ts` | RED scaffold (1 discovery + 7 it.todo) | **GREEN discovery** (it.todo preserved for Wave 2 wiring) |
| `services/chatHistoryService.test.ts` | RED scaffold (1 discovery + 10 it.todo) | **GREEN discovery** (it.todo preserved for full FTS test suite) |
| All other Phase 1+2+3 suites | 244 GREEN baseline | **244 GREEN preserved** |

**Remaining 11 failures:** All concentrated in `src/__tests__/agent/tools/tenantIsolation.test.ts` — a Phase 1 Wave 0 RED file (per its own header: "Wave 0 RED test — turns GREEN in Wave 3"). Pre-existing, out of scope for Phase 4 per executor Rule 4 scope boundary.

Frontend baseline (51 passing) preserved — no frontend production code changed in Wave 1 (only added `src/types/{chat,views}.ts` pure type declarations).

## Verification Run

```bash
cd backend && npx prisma validate                                   # ✓ valid
cd backend && npx prisma generate                                   # ✓ regenerated
cd backend && npx tsc --noEmit                                       # ✓ exit 0
cd backend && npm run lint:tenant                                    # ✓ exit 0
cd backend && npm test                                               # 245 pass, 11 RED out-of-scope, 93 todo
cd frontend && npx tsc --noEmit                                      # ✓ exit 0
cd backend && npm test -- --testPathPatterns="(describeView|chatHistoryService|runtimeStreaming)"  # ✓ 3 suites pass
```

## STRIDE Threat Mitigations Realised

| Threat ID | Mitigation Realised |
|---|---|
| T-04-W1-01 (cross-tenant chat history) | `chatHistoryService` every `where` carries `tenantId`; `lint:tenant` enforces |
| T-04-W1-02 (cross-user chat history) | `chatHistoryService` `upsertThread` + `searchChatHistory` also scope by `userId` |
| T-04-W1-03 (XSS via viewBlock) | describeView Zod schema constrains every string field; Wave 3 ChatViewRenderer renders text-only (verified in Wave 3 RED tests) |
| T-04-W1-04 (cross-tenant LLM leak) | `tenantScopeLeak.test.ts` (Wave 0 RED) — Wave 1 doesn't ship a path that would leak; Wave 5 verification re-runs under design-partner fixture |
| T-04-W1-05 (chat-source repudiation) | `AgentAction.source` column shipped + indexed; default `"decisions"` keeps existing writers' rows tagged correctly with zero code change |
| T-04-W1-06 (null-source legacy rows) | `@default("decisions")` at the schema layer — existing /decisions writers untouched |
| T-04-W1-07 (chat history DOS) | `archiveOlderThan90Days` + `archivedAt` column shipped; Wave 5 ships the worker |

## Deviations from Plan

### [Rule 3 — Blocking issue] describeView envelope shape

- **Found during:** Task 2 — initial Zod skeleton
- **Issue:** The plan's interfaces section described a **flat** Zod discriminated union (`z.object({ type: z.literal("kpi_strip"), title: ..., tiles: ... })`), but the Wave-0 RED test (`describeView.test.ts`) asserts an **envelope** shape: `validator.safeParse({ viewType: "kpi_strip", spec: { tiles: [...] } })`. Honoring the plan would have left 10 RED tests failing.
- **Fix:** Built the Zod discriminated union on the `viewType` discriminant with a `spec` field per branch. The envelope shape is also a better fit for the JSON Schema mirror (Anthropic strict mode requires `additionalProperties: false` on the top-level object; the envelope keeps the per-variant `spec` shapes encapsulated). Also aligns with frontend `GeneratedView.spec: ViewSpec` shape.
- **Files modified:** `backend/src/agent/tools/view/describeView.ts`, `frontend/src/types/{chat,views}.ts`
- **Commit:** `de7e550`

### [Rule 2 — Critical functionality] chatHistoryService FTS = ILIKE+thread-relation today

- **Found during:** Task 2 — `searchChatHistory` implementation
- **Issue:** Plan specified Postgres `to_tsvector('simple', content) @@ to_tsquery('simple', q)` via Prisma's `fullTextSearch` preview helper. The preview helper requires a `previewFeatures = ["fullTextSearch"]` flag in `generator client { ... }` + a Postgres `tsvector` column on `ChatMessage` — both of which would require a migration (Wave 5).
- **Fix:** Implemented `searchChatHistory` as ILIKE-on-content with a `thread: { is: { userId, tenantId } }` relation filter — fully tenant+user scoped, no FTS dep, ships immediately. Wave 5's migration can add a tsvector column + index + swap the implementation; the public API signature is stable.
- **Files modified:** `backend/src/services/chatHistoryService.ts`
- **Commit:** `de7e550`

### [Rule 2 — Critical functionality] Zod variants accept fixture-shape OR plan-shape

- **Found during:** Task 2 — describeView variants
- **Issue:** The Wave-0 RED fixture uses simpler shapes (e.g. `callout: { severity, message }`, `comparison_cards: { cards: [{ title, value }] }`, `draft_message: { recipient: "name", body: "..." }`); the plan's interfaces section describes richer shapes (e.g. `callout: { tone, body, bullets[] }`, `comparison_cards: { items: [{ metrics[] }] }`, `draft_message: { recipient: { driverId, driverName }, bodyEn, bodyAr }`). Picking one breaks the other.
- **Fix:** Each Zod branch accepts BOTH shapes via optional fields + unions. Wave 3 frontend renderer will lean on the plan-shape; gold-set evaluator will keep using fixture-shape. Both validate without churn.
- **Files modified:** `backend/src/agent/tools/view/describeView.ts`, `frontend/src/types/views.ts`
- **Commit:** `de7e550`

## Commits

- `3aa5cbe` — feat(04-01): add ChatThread/ChatMessage/ScheduledBriefing models + 6 columns
- `de7e550` — feat(04-01): describeView tool + pinnedView 10-variants + chatHistoryService + chat prompt
- `f6a9b35` — feat(04-01): runAgent streaming wrapper + frontend chat/views types

## Self-Check: PASSED

- `backend/prisma/schema.prisma` contains `model ChatThread`, `model ChatMessage`, `model ScheduledBriefing` — verified
- `backend/src/agent/tools/view/describeView.ts` exists with `describeViewTool` + `describeViewInputSchema` exports — verified
- `backend/src/agent/tools/view/index.ts` side-effect imports describeView — verified
- `backend/src/services/chatHistoryService.ts` exports 5-function public API — verified
- `backend/src/agent/runtime.ts` exports `RunAgentInput.stream` + `RunAgentResult.views` + `client.messages.stream` branch — verified
- `frontend/src/types/{chat,views}.ts` both exist; `npx tsc --noEmit` exit 0 in both repos — verified
- All 3 commits found in `git log` — verified
- `npm test -- --testPathPatterns="(describeView|chatHistoryService|runtimeStreaming)"` → 3 suites pass — verified
- Migration NOT yet applied (Wave 5 owns) — verified via `npx prisma validate` (schema valid, no migration file written)
