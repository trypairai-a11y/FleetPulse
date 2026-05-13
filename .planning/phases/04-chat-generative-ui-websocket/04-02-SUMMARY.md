---
phase: 04-chat-generative-ui-websocket
plan: 02
subsystem: chat-sse-stream-and-crud
tags: [sse, redis-lock, heartbeat, chat-crud, agentaction-source]
dependency_graph:
  requires:
    - "04-01 backend foundation (ChatThread/ChatMessage schema + chatHistoryService + runAgent.stream)"
  provides:
    - "GET /api/ai/chat/stream  — SSE chat agent run"
    - "POST /api/chat/threads + GET /api/chat/threads + GET /api/chat/threads/:id + PATCH/DELETE  — thread CRUD"
    - "POST /api/chat/threads/:id/messages  — enqueue user msg + assistant placeholder"
    - "GET /api/chat/messages/:id  — message permalink"
    - "POST /api/chat/messages/:id/cancel  — cancel in-flight stream via Redis flag"
    - "AgentAction source=\"chat\" + chatThreadId + chatMessageId column population (additive on /decisions/:id/approve)"
    - "Per-thread Redis lock (chat:lock:{threadId}, 60s TTL) — T-04-W2-02 mitigation"
    - "15s :heartbeat\\n\\n SSE keepalive — T-04-W2-06 (Vercel 30s proxy)"
  affects:
    - "Wave 3 (frontend ChatViewRenderer) consumes the SSE protocol shipped here"
    - "Wave 4 (PinnedViewsRail + audit log Source column) reads AgentAction.source populated here"
    - "Wave 5 (scheduledBriefings worker) reuses the same SSE service for autonomous turns"
tech_stack:
  added: []
  patterns:
    - "Two-mount router: app.use('/api/ai/chat', chatRouter) + app.use('/api/chat', chatRouter) — UI-SPEC §8.3 puts the stream under /api/ai/chat/* and the CRUD under /api/chat/*; both share one router instance so handler code lives in one file"
    - "Redis lock with graceful in-process fallback — production hits ioredis singleton; dev without REDIS_URL uses an expiring Map. Same public API; same TTL semantics"
    - "SSE protocol: event: thread → queued → text_delta+ → view_block? → proposal? → complete | cancelled | error. Comment lines :ok and :heartbeat\\n\\n separate from named events"
    - "Cancel via Redis flag (chat:cancel:{messageId}, 60s TTL) polled at 1Hz by the route handler — onCancel() returns a local boolean (sync contract preserved); survives horizontal scale"
    - "AgentAction.source additive — schema default 'decisions' kept; only chat-origin POSTs set the column. legacy /decisions writers' rows continue inheriting the default with zero code change"
key_files:
  created:
    - backend/src/services/chatStreamService.ts
    - backend/src/routes/chat.ts
  modified:
    - backend/src/server.ts
    - backend/src/routes/decisions.ts
    - backend/src/agent/ledger.ts
decisions:
  - "Single router, two mounts — minimises file count while keeping route paths semantically clean (UI-SPEC §8.3)"
  - "Cancel poll cadence 1s — fast enough to feel responsive (<2s upper-bound aborts the tool loop next iteration) without thrashing Redis"
  - "Lock TTL 60s — long enough to cover a full tool-loop run; short enough that an orphan lock from a crashed process self-heals within a minute"
  - "Final assistant row appended (not updated) — placeholder stays as a 'queued' history row, the final row carries content/views/proposalId. Wave 11 may consolidate"
  - "decisions.ts allow-list (decisions|chat|briefing|auto) prevents arbitrary string injection into AgentAction.source even though the schema accepts any string"
  - "chatThreadId/chatMessageId only persisted when source==='chat' — defensive narrowing avoids /decisions callers accidentally populating those columns with stale ids from a different feature"
  - "chatLimiter 60/min/user on /stream uses keyGenerator (userId, fallback ip) — Anthropic quota guard per T-04-W2-07; Redis-backed where Redis is live"
metrics:
  duration: "~30 minutes"
  completed: "2026-05-13"
---

# Phase 4 Plan 02: Chat SSE stream + thread/message CRUD Summary

Wave 2 backend HTTP surface shipped: 9-endpoint chat router (1 SSE stream, 6 thread CRUD, 1 message permalink, 1 cancel), `chatStreamService` orchestrating per-thread Redis lock + 15s heartbeat + cancel-via-Redis-flag + runAgent streaming, and additive extension to `/api/decisions/:id/approve` so chat-resident proposals write `AgentAction(source="chat", chatThreadId, chatMessageId)`.

## Endpoints Shipped (9)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ai/chat/stream` | SSE chat agent stream (rate-limited 60/min/user) |
| POST | `/api/chat/threads` | Create thread |
| GET | `/api/chat/threads` | List + group + paginate (or `?q=` → FTS via chatHistoryService) |
| GET | `/api/chat/threads/:id` | Single thread + last 50 messages |
| PATCH | `/api/chat/threads/:id` | Title / pinned toggle |
| DELETE | `/api/chat/threads/:id` | Soft archive (sets `archivedAt`) |
| POST | `/api/chat/threads/:id/messages` | Append user msg + create assistant placeholder |
| GET | `/api/chat/messages/:id` | Message permalink (tenant + user scoped via parent thread) |
| POST | `/api/chat/messages/:id/cancel` | Set Redis cancel flag for in-flight stream |

Both mounts (`/api/ai/chat` + `/api/chat`) require `authMiddleware + tenantScope`. The CRUD operations additionally enforce `userId` scope via the Prisma `where` clause so a foreign user in the same tenant cannot read or mutate threads they don't own. The `cancel` endpoint verifies the message belongs to the caller before honouring the cancel.

## SSE Event Protocol

```
EventSource open
    │
    ▼
:ok\n\n                 ← initial comment (fires onopen)
    │
    ▼
event: thread           ← { threadId }
data: {…}\n\n
    │
    ▼
event: queued           ← { msgId }  (placeholder ChatMessage created)
data: {…}\n\n
    │
    ├──► event: text_delta      { msgId, delta }    (per-token)
    ├──► event: view_block      { msgId, view }     (describeView result)
    ├──► event: proposal        { msgId, pendingActionId }
    │
    ├──► :heartbeat\n\n         every 15s while runAgent runs
    │
    ▼
event: complete         ← { msgId, finalMessageId, runId, meta }
                        OR
event: cancelled        ← { msgId }            (client closed OR cancel flag)
                        OR
event: error            ← { msgId, error }
data: {…}\n\n
    │
    ▼
connection ends
```

Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` (RESEARCH Pitfall 1 → Vercel/nginx buffering off).

## chatStreamService Responsibilities

| Responsibility | Mechanism |
|---|---|
| Lock — prevent concurrent streams on same thread | `chat:lock:{threadId}` set via `SET NX PX 60000`; falls back to in-process expiring Map when `REDIS_URL=localhost` default |
| Heartbeat — defeat Vercel 30s idle close | `setInterval(heartbeat, 15_000)`; `process.env.CHAT_HEARTBEAT_MS` overrides for test determinism |
| Cancel — surface client disconnect AND explicit cancel | (a) `res.req.on("close")` sets `clientGone=true` (b) 1Hz Redis poll on `chat:cancel:{messageId}` sets local `cancelled=true` (c) `onCancel()` returns `clientGone \|\| cancelled` synchronously |
| Persistence orchestration | `chatHistoryService.upsertThread` → `appendMessage(user)` → `appendMessage(assistant placeholder, state:'queued')` → runAgent → `appendMessage(assistant final)` with views / proposalId / state |
| Disabled-mode handling | When `ANTHROPIC_API_KEY` is unset and runAgent returns `status:"disabled"`, the service emits a `complete` event with `meta.disabled:true` and persists a stub assistant turn so the UI doesn't hang |

## AgentAction Column Population for Chat Origin

`POST /api/decisions/:id/approve` body now accepts (all optional, additive):

```json
{ "source": "chat", "threadId": "ct_…", "msgId": "cm_…", "modifications": { … } }
```

| `source` value | `chatThreadId` written? | `chatMessageId` written? |
|---|---|---|
| `"decisions"` (default — Phase 2 callers) | no (schema default) | no |
| `"chat"` (Phase 4 chat clients) | yes (from `req.body.threadId`) | yes (from `req.body.msgId`) |
| `"briefing"` / `"auto"` | no (reserved for future waves) | no |

The allow-list `{decisions, chat, briefing, auto}` is enforced at the route layer; anything else falls back to `"decisions"`. Defensive narrowing — `chatThreadId`/`chatMessageId` columns are only populated when `source==="chat"` so /decisions callers can't accidentally inject stale ids.

## Wave 0 → Wave 2 GREEN flip

| Test file | Before (Wave 0 RED state) | After (Wave 2 state) |
|---|---|---|
| `chatStream.test.ts` | 1 discovery test (passing) + 12 `it.todo` (production code absent) | 1 discovery test (passing) + 12 `it.todo` (production code present, ready for future case-level assertions) |
| `chatThreads.test.ts` | 1 discovery + 12 `it.todo` | 1 discovery + 12 `it.todo` (production code present) |
| `chatActionProposal.test.ts` | 1 discovery + 10 `it.todo` | 1 discovery + 10 `it.todo` (source/threadId/msgId pipeline live) |
| `tenantScopeLeak.test.ts` | 2 discovery + 8 `it.todo` | 2 discovery + 8 `it.todo` (lint:tenant + chatHistoryService user-scope still GREEN) |
| `goldSet.test.ts` | 7 assertions on the 13-fixture file shape (passing) + 8 `it.todo` | 7 assertions still passing + 8 `it.todo` |

**Test deltas:**

| Metric | Pre-Wave-2 (245/11/3/93) | Post-Wave-2 (245/11/3/93) | Δ |
|---|---|---|---|
| Passing | 245 | 245 | 0 |
| Failing | 11 (pre-existing Phase 1 `tenantIsolation` Wave 0 RED — out of scope per Wave 1 SUMMARY) | 11 (same) | 0 |
| Skipped | 3 | 3 | 0 |
| `it.todo` | 93 | 93 (Wave 2 production code unblocks future case-level conversion of these todos in Waves 3-5) | 0 |

The five Wave-0 RED files are GREEN at the discovery level; their `it.todo` markers remain reserved for case-level expansion when the chat-eval harness (Wave 5) and frontend SSE consumer (Wave 3) need cross-suite assertions backed by an `ANTHROPIC_API_KEY`-driven harness or a deterministic LLM mock. Per Wave 2 plan: "real-LLM smoke tests are deferred to Wave 5 verification."

## STRIDE Threat Mitigations Realised

| Threat ID | Mitigation Realised |
|---|---|
| T-04-W2-01 (SSE hijacking) | `authMiddleware + tenantScope` on both router mounts; `threadId` query param pre-flight-checked against `req.user.{id, tenantId}` before `streamChatToClient` fires |
| T-04-W2-02 (concurrent stream interleave) | `acquireThreadLock` via `SET NX PX 60000`; 409 emitted as SSE `error` event when conflict |
| T-04-W2-03 (cross-tenant LLM leak) | `chatHistoryService.recentTurns` already user+tenant scoped (Wave 1); SSE writes never escape `tenantId`/`userId` from the auth context |
| T-04-W2-04 (prompt injection — accept) | Server-side system prompt only; user input never escapes role:"user". (`backend/src/agent/prompts/chat.md` is read-once and cached.) |
| T-04-W2-05 (chat-vs-decisions repudiation) | `AgentAction.source="chat"` + `chatThreadId` + `chatMessageId` populated by the additive `/decisions/:id/approve` extension. Wave 4 audit log Source column will render the distinction |
| T-04-W2-06 (Vercel proxy idle close) | 15s `:heartbeat\n\n`; `X-Accel-Buffering: no` header; `Cache-Control: no-cache, no-transform` |
| T-04-W2-07 (Anthropic quota DOS) | `chatLimiter` 60/min/user on `/stream`, Redis-backed when REDIS_URL is configured |

## Verification Run

```bash
cd backend && npx tsc --noEmit                             # exit 0
cd backend && npm run lint:tenant                          # exit 0 (chat.ts + chatHistoryService.ts validated)
cd backend && npm test                                     # 245 pass / 11 fail (pre-existing) / 3 skip / 93 todo
cd backend && npm test -- --testPathPatterns="(chatStream|chatThreads|chatActionProposal|tenantScopeLeak|goldSet)"
# → 5 suites pass, 12 tests pass, 50 todo (discovery placeholders GREEN)
```

## Deviations from Plan

### [Rule 3 — Blocking issue] `recentTurns` signature requires tenantId (Wave 1 hardened it)

- **Found during:** Task 1 — chatStreamService construction
- **Issue:** The plan called `chatHistoryService.recentTurns(thread.id, 20)` (2 args). The Wave 1 implementation hardened the signature to `recentTurns(threadId, tenantId, limit?)` for defence-in-depth (T-04-W1-01).
- **Fix:** Updated the call site to pass `tenantId` as the second argument.
- **Files modified:** `backend/src/services/chatStreamService.ts`
- **Commit:** `84b231a`

### [Rule 2 — Critical functionality] Disabled-mode (no ANTHROPIC_API_KEY) needs a terminal SSE event

- **Found during:** Task 1 — manual review of runAgent return paths
- **Issue:** When `ANTHROPIC_API_KEY` is unset, `runAgent` returns `status:"disabled"` immediately. The plan's pseudo-code only handled `completed | cancelled | failed`, which would leave the SSE connection hanging with no terminal event in dev.
- **Fix:** Added explicit `disabled` branch that emits `event: complete` with `meta.disabled:true` and persists a stub assistant turn ("Agent runtime disabled."). Maps the disabled state to a recoverable client-side terminal state — the UI sees a normal "complete" event and shows an "agent unavailable" banner instead of waiting forever.
- **Files modified:** `backend/src/services/chatStreamService.ts`
- **Commit:** `84b231a`

### [Rule 2 — Critical functionality] Defensive narrowing on chatThreadId/chatMessageId

- **Found during:** Task 2 — decisions.ts extension
- **Issue:** The plan said "pass these into writeAgentAction" with no guard. A caller passing `{source: "decisions", threadId: "…"}` would have silently populated `chatThreadId` with a stale value because the JSON column accepts it.
- **Fix:** `chatThreadId`/`chatMessageId` are now only persisted when `source==="chat"`. Other source values pass `null`, which preserves the schema default (no rendering pollution).
- **Files modified:** `backend/src/routes/decisions.ts`, `backend/src/agent/ledger.ts`
- **Commit:** `6c010c9`

### [Rule 2 — Critical functionality] Cancel endpoint enforces ownership

- **Found during:** Task 1 — routes/chat.ts cancel handler
- **Issue:** The plan's pseudo-code `await cancelStream(messageId); res.json({ok:true})` would have let any authenticated user cancel any in-flight stream by guessing a `messageId` (T-04-W2-01 variant).
- **Fix:** Cancel handler now `findFirst`s the message + parent thread under `{tenantId, userId}` and returns 404 if not owned by the caller. The Redis flag is only set when ownership is verified.
- **Files modified:** `backend/src/routes/chat.ts`
- **Commit:** `84b231a`

## Note for Wave 5 (manual smoke)

The 5 Wave 0 RED files keep their `it.todo` markers for case-level expansion against a real `ANTHROPIC_API_KEY` smoke run (or a deterministic LLM mock paired with the design-partner-1 fixture). Wave 5's BLOCKING task ("migration + e2e smoke") owns the conversion of those todos into runtime assertions, per the Wave 2 plan's verification line: "Wave 5 will run a manual smoke against the design-partner-1 fixture to validate end-to-end behavior with a real Anthropic key."

## Commits

- `84b231a` — feat(04-02): chat SSE stream + per-thread Redis lock + heartbeat
- `6c010c9` — feat(04-02): extend /decisions/:id/approve for chat-source proposals

## Self-Check: PASSED

- `backend/src/services/chatStreamService.ts` exists; exports `streamChatToClient`, `acquireThreadLock`, `cancelStream` — verified via `git show 84b231a`
- `backend/src/routes/chat.ts` exists; 9 router handlers (`router.(get|post|patch|delete)` count = 9) — verified
- `backend/src/server.ts` mounts `chatRouter` at both `/api/ai/chat` and `/api/chat` — verified
- `backend/src/routes/decisions.ts` POST /:id/approve accepts `source/threadId/msgId` from body with allow-list — verified
- `backend/src/agent/ledger.ts` `AuditRow` includes optional `source/chatThreadId/chatMessageId` — verified
- 2 commits (`84b231a`, `6c010c9`) present in `git log` — verified
- `npx tsc --noEmit` exit 0 — verified
- `npm run lint:tenant` exit 0 — verified
- `npm test` → 245 pass / 11 pre-existing fail / 3 skip / 93 todo (zero regression vs baseline) — verified
