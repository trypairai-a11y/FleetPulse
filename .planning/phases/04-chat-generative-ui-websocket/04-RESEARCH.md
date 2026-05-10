# Phase 4: Chat / Generative UI + WebSocket — Research

**Researched:** 2026-05-10
**Domain:** Conversational LLM UX, generative-UI rendering, real-time chat-token streaming, scheduled job authoring (briefings + standing-rule templates), per-user searchable chat history, "Pin to Home" UX, action-from-chat propose-and-confirm flow
**Confidence:** HIGH on transport choice, stack composition, generative-UI rendering pattern, chat-history search architecture; MEDIUM on third-party realtime fallback (only relevant if user explicitly rejects SSE-first); LOW on no major area (all open questions are decision-shaped, not unknown-shaped)

## Summary

Phase 4 is the **chat surface that replaces ~50 pre-built analytics pages**. Phase 1 already shipped the agent runtime (`backend/src/agent/runtime.ts::runAgent`), the `chat` agent registration, the 12 read tools, and the 3 propose tools. Phase 2 already shipped propose-and-confirm via `PendingAgentAction` + `/api/decisions/*`. Phase 4 layers six things on top: (1) a global ⌘K palette that opens chat from anywhere; (2) generative-UI rendering — chat agent emits a typed `view` payload alongside text, the React layer renders the right component (KPI strip / line chart / bar chart / table / mini-map / comparison cards / action card / draft message); (3) inline action-proposal flow — when chat triggers a `requiresApproval: true` tool, the chat panel renders an inline confirm card that wires to the same `/api/decisions/:id/approve` endpoint Phase 2 ships; (4) scheduled jobs — `ScheduledJob` model + BullMQ Job Schedulers fire a saved chat prompt against `runAgent("chat", ...)` on cron, persisting the answer as a "briefing" `PinnedView`; (5) per-user searchable conversation history — `ChatThread` + `ChatMessage` Prisma models with PostgreSQL full-text search via `tsvector` GIN index (Prisma `fullTextSearch` preview feature is already enabled in `schema.prisma`); (6) Pin-to-Home using the existing `PinnedView` model from Phase 1 (CRUD already exists in `agent/pinnedView.ts`).

**The transport decision is the load-bearing one.** Both backend and frontend deploy on Vercel today (`backend/vercel.json` exists). Vercel serverless functions cannot host long-lived WebSocket servers as of May 2026 — Fluid Compute enables in-flight streaming responses but does NOT enable bidirectional WebSocket servers `[VERIFIED: Vercel Knowledge Base, Ably docs, Vercel Community May 2026]`. The PRD calls for "WebSocket for agent streaming (chat tokens) and live floor map subscriptions" (CON-realtime-protocols), but on closer inspection chat-token streaming is unidirectional (server→client), which is the exact niche SSE was designed for. **Recommendation: ship Phase 4 chat token streaming over SSE (the Anthropic SDK natively emits SSE; `messages.stream()` is the canonical helper). Do NOT add a WebSocket dependency in Phase 4.** Defer the real WebSocket decision to Phase 7 (Live Floor) where the bidirectionality question is actually asked (the dispatcher needs to filter the map by clicking pill counters, which still works fine over SSE-+-HTTP-POSTs but the floor-map use case may benefit from WebSocket once we have ≥3 dispatchers concurrently subscribed). This satisfies REQ-realtime-streaming as written ("Keep SSE for notifications; add WebSocket for agent streaming") **only if we re-read it as transport-equivalent**, which is honest since SSE is RFC 8895-compliant streaming. The plan checker should explicitly call this out as a deferral, not a silent re-interpretation.

**Primary recommendation:** Ship `cmdk`-driven ⌘K palette (replaces the existing custom `AskDarbPalette.tsx`), refactor `/api/ai/chat` to a streaming SSE route that calls `runAgent("chat", ...)` with `stream: true` on the underlying Anthropic call, add `ChatThread` + `ChatMessage` + `ScheduledJob` Prisma models, add a generative-UI envelope to the chat agent's output schema (text + optional `view` block), add a `Pin to Home` button on every generated view, and add a BullMQ Job Scheduler that fires saved chat prompts on cron. **Do not introduce `socket.io`, `ws`, Pusher, Ably, or the Vercel AI SDK in Phase 4.** Each adds dependency surface, ops surface, or both, for a feature (server-to-client token streaming) where Vercel-native SSE is already a perfect fit.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ⌘K global palette open/close + keyboard shortcut | Frontend (Next.js client component) | — | Pure client interaction; `cmdk` library handles keyboard navigation; no server involvement |
| Chat input → backend round-trip | Frontend `lib/api` (existing axios client) | Backend `/api/ai/chat` (existing — to be made streaming) | Existing axios pattern; new route swaps to SSE response |
| Token streaming (server→client) | Backend SSE route `/api/ai/chat/stream` (NEW) | Anthropic SDK `messages.stream()` | Anthropic SDK natively yields SSE; Vercel Fluid Compute supports SSE responses out of box |
| Chat agent tool-loop (read + propose tools) | Backend `agent/runtime.ts::runAgent("chat", ...)` (existing) | Backend `agent/registry.ts` | Phase 1 / 2 substrate is reused; Phase 4 only adds streaming wrapper around the existing call |
| Generative-UI envelope (text + `view` block) | Backend chat prompt (`prompts/chat.md` MOD) + a new `view_descriptor` tool | Frontend `<ChatViewRenderer/>` component | Agent emits a typed view spec; frontend dispatches to the right renderer (KPI / chart / table / map) |
| Per-user chat history persistence | Backend `services/chatHistoryService.ts` (NEW) → `ChatThread` + `ChatMessage` Prisma rows | Backend `/api/chat/threads` route (NEW) | Server is source of truth; client renders from server state; tenantScope + userScope enforced |
| Chat history search | Backend Prisma `fullTextSearch` query against `ChatMessage.content` | PostgreSQL `tsvector` GIN index | `fullTextSearch` preview feature already enabled in `schema.prisma`; one new GIN index |
| Pin-to-Home | Backend `agent/pinnedView.ts::createPinnedView` (EXISTING — Phase 1 ships CRUD) | Backend `/api/pinned-views` route (NEW thin wrapper) | Phase 1 already shipped pin CRUD primitives; Phase 4 just exposes them via HTTP and wires the button |
| "Home" tile rendering | Frontend `/decisions` (existing) gains a "Pinned" sidebar OR new `/home` page | Backend `GET /api/pinned-views` | Per ROADMAP open question, "owner default landing route" is `/decisions` v `/home`. Phase 4 ships the pin row and renders pinned tiles in a dedicated section of `/decisions`; if founder picks `/home`, the same component moves |
| Inline action proposal in chat | Frontend `<ChatActionCard/>` component | Backend `/api/decisions/:id/approve` (existing — Phase 2) | Tool returns `{status: "pending_approval", pendingActionId}` from the existing registry gate; frontend renders the same card UI as `/decisions` inline; click Approve hits the same Phase 2 route |
| Scheduled jobs (pinned briefings + standing-rule templates) | Backend `queues/scheduledJobsWorker.ts` (NEW) using BullMQ Job Schedulers | Backend `services/scheduledJobsService.ts` + `ScheduledJob` model | BullMQ `JobScheduler` is the documented primitive for cron-style repeating jobs in 2026 (replaces deprecated `repeat` API); persists job in queue + DB |
| Briefing rendering (the morning answer) | Backend cron worker calls `runAgent("chat", { userMessage: savedPrompt })`; pins resulting `view` to `PinnedView` of type `briefing` | Frontend renders briefings via existing `<ChatViewRenderer/>` | One pipeline for both ad-hoc chat and scheduled briefings — keeps surface small |
| WebSocket (deferred) | — | — | Phase 4 ships SSE only. WebSocket deferred until Phase 7 has a concrete bidirectional use case |

## Standard Stack

### Core (already pinned by CON-stack-backend-pinned, CON-stack-frontend, and Phase 1/2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `^0.80.0` (verified `backend/package.json`) | Claude API client; native `messages.stream()` SSE support | Already wired in `agent/runtime.ts`; Phase 4 just calls `.stream()` instead of `.create()` for the chat agent path `[VERIFIED: Context7 /anthropics/anthropic-sdk-typescript]` |
| `@prisma/client` | `^5.22.0` | DB access with `fullTextSearch` preview feature ALREADY ENABLED | `schema.prisma` already has `previewFeatures = ["postgresqlExtensions", "fullTextSearch"]` — zero schema-engine config changes needed `[VERIFIED: backend/prisma/schema.prisma]` |
| `bullmq` | `^5.73.4` | Scheduled jobs via Job Scheduler primitive (replaces deprecated `repeat` API as of BullMQ 5.x) | Already used by 8 workers; Phase 4 adds `scheduledJobsWorker.ts` with `JobScheduler` API `[CITED: docs.bullmq.io/guide/job-schedulers]` |
| `ioredis` | `^5.4.1` | BullMQ + Pub/Sub for `eventBus` | Already wired |
| `zod` | `^3.23.8` | Tool input validation + generative-UI envelope schema | Existing `defineTool` pattern; Phase 4 reuses for chat agent's view-descriptor tool |
| `node-cron` | `^4.2.1` (installed but `agent/scheduler.ts` uses `setInterval` instead) | Available; not needed in Phase 4 (we use BullMQ Job Scheduler) | Stay on BullMQ for durable cron; `setInterval` is fine for Phase 1/2 in-memory use cases but scheduled jobs need DB durability and per-tenant fan-out |

### Frontend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `cmdk` | **NEW — `^1.1.1`** (latest as of 2025-08-27 publish per `npm view`) | Battle-tested ⌘K command palette | The shadcn `<Command/>` primitive is built on `cmdk`; React 18-safe; uses `useId` + `useSyncExternalStore` `[VERIFIED: npm view cmdk version=1.1.1, time.modified=2025-08-27]` `[CITED: cmdk.paco.me]` |
| `next` | `14.2.35` | App Router + SSR shell | Existing |
| `react` | `^18` | Client components | Existing |
| `recharts` | `^3.8.1` (verified) | KPI / line / bar / area chart rendering for generative-UI views | Already installed (used by `/overview` charts in recent commit) `[VERIFIED: npm view recharts version=3.8.1, modified=2026-03-25]` |
| `lucide-react` | `^0.577.0` | Icons (Send, Paperclip, Pin, X, ArrowUp, Sparkles) | Existing |
| `axios` (via `@/lib/api`) | `^1.13.6` | HTTP for non-streaming endpoints | Existing |
| `@tanstack/react-query` | `^5.99.0` | Cache layer for chat threads list, pinned-views | Already installed; Phase 4 should use it for thread list + pinned views (read-mostly, cache-friendly); follow the `useSSE` hook pattern for the streaming chat itself (NOT react-query) |
| `react-leaflet` | `^5.0.0` | Mini-map view type | Already installed; one of the generative-UI view types |

**No third-party realtime services.** No `pusher-js`, no `ably`, no `socket.io-client`. SSE is built into the browser via `EventSource` and the existing `useSSE.ts` hook handles reconnection + exponential backoff `[VERIFIED: frontend/src/hooks/useSSE.ts]`.

**Why not the Vercel AI SDK?** `ai@^6.0.x` is a credible alternative — it gives you `useChat()` hook, native streaming, structured-output helpers, and tool calling abstractions `[CITED: ai-sdk.dev/docs/introduction]`. **Recommendation: do NOT adopt in Phase 4.** Reasons:
1. Phase 1's `runAgent` tool-loop is already structurally equivalent to AI SDK's tool-runner. Adding an abstraction layer over an abstraction layer is technical debt.
2. AI SDK's `useChat()` ties you to its `Message` shape; we already have a custom `Turn` type and a propose-and-confirm flow that returns `pendingActionIds` — not a clean fit.
3. AI SDK 6 deprecated its HTTP+SSE transport in favor of a pluggable transport interface — exactly the kind of churn we want to avoid in a fast-following pivot.
4. We get all the value (token streaming, tool use, structured output) directly from `@anthropic-ai/sdk`'s `messages.stream()` with ~50 lines of glue code.

### Alternatives Considered (load-bearing decisions)

| Decision Point | Chosen | Alternative | Tradeoff |
|----------------|--------|-------------|----------|
| Realtime transport for chat tokens | **SSE** via Anthropic SDK `messages.stream()` + Express SSE response | WebSocket (`ws` or `socket.io`) | SSE is unidirectional and Vercel-native; chat tokens are server-to-client only; cancel/abort works via HTTP DELETE on a session id. WebSocket adds a separate always-on backend (Render/Railway), or a third-party service (Pusher/Ably $49-99/month) `[VERIFIED: Vercel KB, Ably docs]`. **For Phase 4 in particular, SSE is genuinely sufficient** — the bidirectionality argument applies to Phase 7's live floor (multi-client subscriptions to the same data stream), not to one-user-streaming-tokens. |
| Realtime transport in CON-realtime-protocols | **SSE-only in Phase 4; revisit WebSocket in Phase 7** | Strict literal reading: ship WebSocket in Phase 4 | The PRD wrote "Add WebSocket for agent streaming" because WebSocket is the well-known pattern. Closer reading of the actual data flow shows token streaming is one-way. Treating CON-realtime-protocols as transport-class-equivalent (any persistent server-push) keeps us Vercel-native and unblocks Phase 4 without making Phase 7's decision premature. **PROPOSAL: surface this to the founder in `/gsd-discuss-phase`.** |
| Vercel WebSocket hosting | **N/A — defer** | Move backend to Render or Railway always-on | Backend currently deploys on Vercel (`backend/vercel.json` present). Moving to Render is a multi-day infrastructure change; not in Phase 4 scope. |
| Generative-UI rendering | **Server emits typed `view` block; client switches on `view.type`** | Server emits HTML; client `dangerouslySetInnerHTML` | XSS risk + no interaction (can't wire Pin button, action handlers). Typed JSON envelope keeps interaction live and is testable. |
| Generative-UI library | **Recharts** (already installed) for charts; raw HTML/Tailwind tables and KPI strips | shadcn-charts, Tremor, Visx | Recharts is already in use; no new dep. Recent `/overview` commit uses Recharts. |
| Generative-UI emission shape | **A `view_descriptor` tool the chat agent calls** | Free-form JSON in the assistant's text content + parsed by the client | The tool path is type-safe (Anthropic SDK validates against `inputSchema`), invariably-shaped, and uses the same approval-gate substrate. Free-form JSON in text is fragile (LLM may emit prose around it). |
| Chat history search | **Postgres `tsvector` + GIN + Prisma `fullTextSearch`** | Vector embeddings (pgvector), Meilisearch, Typesense | FTS is sufficient for keyword recall ("yesterday's question about Hawally"). Vector adds infra weight (embedding pipeline + new column type) for marginal recall lift on a small per-user corpus. Defer vector search to Phase 11/12 if needed. `pg_trgm` extension is already enabled in `schema.prisma` for fuzzy match `[VERIFIED: backend/prisma/schema.prisma:previewFeatures]`. |
| Scheduled job primitive | **BullMQ `JobScheduler`** | `node-cron` direct, `setInterval` | BullMQ Job Scheduler persists schedules to Redis; survives process restarts; per-tenant fan-out; integrates with existing 8 workers `[CITED: docs.bullmq.io/guide/job-schedulers]`. `node-cron` is in-memory only (lost on restart), `setInterval` is for in-process Phase 1/2 ticks but unsuitable for owner-authored briefings. |
| ⌘K palette implementation | **`cmdk` library + custom Tailwind styling** | Build from scratch (current approach in `AskDarbPalette.tsx`) | The existing `AskDarbPalette.tsx` is ~240 lines of custom keyboard/state code. `cmdk` is the canonical primitive (used by shadcn, Linear, Raycast, GitHub). 80% less code, battle-tested fuzzy search, free a11y. |
| Per-user history visibility | **Per-user, tenant-scoped (rows scoped by `userId` AND `tenantId`)** | Per-tenant shared (any user sees any user's history) | PRD §5.3 explicitly says "Conversation history is per-user". Tenant scope adds defense in depth — even if a userId leaks, queries scope by tenantId via `tenantScope` middleware. |

**Verification:** Verified `@anthropic-ai/sdk@^0.80.0`, `bullmq@^5.73.4`, `recharts@^3.8.1`, `cmdk` not yet installed, `fullTextSearch` preview feature ALREADY enabled, `pg_trgm` extension ALREADY installed, both backend and frontend deploy on Vercel.

**Installation (one new package):**

```bash
cd frontend && npm install cmdk@^1.1.1
# Backend: zero new packages — Anthropic SDK + BullMQ + Prisma fullTextSearch + Recharts on the frontend cover everything.

# Schema migration (additive, zero destructive ops):
cd backend && npx prisma migrate dev --name 20260512000000_chat_history_scheduled_jobs
```

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                     CLIENT (Browser)                                   │
│                                                                                         │
│   ⌘K opens         /decisions (with        /chat/[threadId]?    (any page)              │
│  cmdk palette  →   pinned tiles row)  →    pinned briefings              ↓              │
│       │                  ↑                  permalink view              <PinButton/>    │
│       │                  │                                                              │
│       └─────── token stream (SSE) ───────────────────────────────┐                      │
│                                                                  │                      │
│       AskDarbPalette (NEW: cmdk-based)                           │                      │
│       ├─ EventSource(/api/ai/chat/stream?threadId=...)           │                      │
│       ├─ ChatViewRenderer (switch on view.type)                  │                      │
│       │   ├─ KpiStrip / LineChart / BarChart / Table             │                      │
│       │   │  / MiniMap / ComparisonCards / ActionCard / Draft   │                      │
│       │   └─ <PinButton onClick=POST /api/pinned-views/>         │                      │
│       └─ ChatActionCard (when assistant turn carries pending)    │                      │
│           └─ on Approve → POST /api/decisions/:id/approve        │                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                            │ HTTP (axios) + EventSource (SSE)
                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Express + Prisma + BullMQ)                         │
│                                                                                         │
│   ┌────────────────────────────────────────────────────┐                               │
│   │ /api/ai/chat/stream         (NEW — SSE)            │                               │
│   │   GET /?threadId=…&q=…                             │                               │
│   │     ├─ persists user msg → ChatMessage             │                               │
│   │     ├─ runAgent("chat", { history, userMessage })  │                               │
│   │     │   underlying Anthropic call uses .stream()   │                               │
│   │     ├─ pipes text deltas into SSE response         │                               │
│   │     ├─ when tool returns view_descriptor:          │                               │
│   │     │   pushes "data: {type:'view',...}\n\n"       │                               │
│   │     ├─ when tool requires_approval:                │                               │
│   │     │   pushes "data: {type:'pending', id:…}\n\n"  │                               │
│   │     └─ on stream end persists assistant msg        │                               │
│   │                                                     │                               │
│   │ /api/chat/threads            (NEW)                  │                               │
│   │   GET /                  (list, paginated)          │                               │
│   │   GET /search?q=…        (FTS via tsvector + GIN)   │                               │
│   │   GET /:id               (one thread + msgs)        │                               │
│   │   POST /                 (start new thread)         │                               │
│   │   DELETE /:id            (soft delete)              │                               │
│   │                                                     │                               │
│   │ /api/pinned-views           (NEW thin wrapper)      │                               │
│   │   GET /                                             │                               │
│   │   POST /                                            │                               │
│   │   DELETE /:id                                       │                               │
│   │   PATCH /:id/order                                  │                               │
│   │                                                     │                               │
│   │ /api/scheduled-jobs         (NEW)                   │                               │
│   │   GET /                                             │                               │
│   │   POST /                 ({ promptText, cronExpr,   │                               │
│   │                            type: "briefing"          │                               │
│   │                            | "standing_rule_v3"     │                               │
│   │                            (template-only in v1) }) │                               │
│   │   PATCH /:id/toggle                                 │                               │
│   │   DELETE /:id                                       │                               │
│   └────────────────────────────────────────────────────┘                               │
│      authMiddleware → tenantScope → userId scope (existing)                            │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────┐   │
│   │             agent/  module (Phase 1+2; Phase 4 EXTENDS)                       │   │
│   │                                                                                  │   │
│   │  index.ts ── chat agent already registered in Phase 1                           │   │
│   │  runtime.ts ── ADDS optional `stream: true` mode that yields SSE chunks         │   │
│   │      (key change: replace .messages.create() with .messages.stream() inside    │   │
│   │       the tool-loop when called with stream:true)                               │   │
│   │  registry.ts ── unchanged                                                        │   │
│   │  ledger.ts / memory.ts / pinnedView.ts ── unchanged primitives                  │   │
│   │  tools/                                                                          │   │
│   │    ├─ read/      (12 existing — chat agent calls these)                         │   │
│   │    ├─ action/    (3 existing propose tools — chat can also propose)             │   │
│   │    └─ view/                                                                      │   │
│   │        └─ describeView.ts   (NEW — emits view_descriptor envelope)              │   │
│   │  prompts/                                                                        │   │
│   │    └─ chat.md  (MOD: instructs the agent on the view_descriptor pattern)         │   │
│   └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────┐   │
│   │               queues/  (BullMQ; Phase 4 adds JobScheduler workers)            │   │
│   │   notificationWorker.ts (existing)  …                                          │   │
│   │   ── NEW for Phase 4 ────────────────────────────────────────────────────── │   │
│   │   scheduledJobsWorker.ts                                                      │   │
│   │     uses BullMQ JobScheduler for "every morning at 6, summarise yesterday"    │   │
│   │     each run calls runAgent("chat", { userMessage: scheduledJob.prompt })     │   │
│   │     persists output as a "briefing" PinnedView so it appears on Home          │   │
│   └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│   services/chatHistoryService.ts (NEW)  ── persist + search + delete ChatMessage      │
│   services/scheduledJobsService.ts (NEW) ── CRUD + bullmq scheduler glue              │
│                                                                                         │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL 15 + Redis 7                                          │
│                                                                                         │
│  ChatThread (NEW)                                                                       │
│  ChatMessage (NEW — has tsvector GIN index on `content`)                                │
│  ScheduledJob (NEW)                                                                    │
│  PinnedView (existing — extended with viewType="briefing" support; no schema change)   │
│  PendingAgentAction (existing — chat-proposed actions land here, same flow as Phase 2) │
│  AgentRunLog (existing — every chat turn writes one row)                               │
│  AgentMemory (existing — chat queries dismissed:* like the monitor does)               │
│                                                                                         │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (delta vs Phase 2)

```
backend/src/
├── agent/                                    # existing
│   ├── runtime.ts                            # MOD: add streaming mode (options.stream → use messages.stream())
│   ├── prompts/chat.md                       # MOD: instruct agent on view_descriptor + when to call propose tools
│   └── tools/
│       └── view/                             # NEW
│           ├── index.ts                      # registers describeView tool
│           └── describeView.ts               # describes a "view" the client should render
├── routes/
│   ├── ai.ts                                 # MOD: keep existing /chat (non-streaming) for back-compat;
│   │                                         #      add /api/ai/chat/stream (SSE)
│   ├── chat.ts                               # NEW: /api/chat/threads CRUD + /search
│   ├── pinnedViews.ts                        # NEW: /api/pinned-views CRUD
│   └── scheduledJobs.ts                      # NEW: /api/scheduled-jobs CRUD + toggle
├── services/
│   ├── chatHistoryService.ts                 # NEW: persist + search + delete chat messages
│   └── scheduledJobsService.ts               # NEW: CRUD + BullMQ scheduler bind/unbind
├── queues/
│   └── scheduledJobsWorker.ts                # NEW: BullMQ JobScheduler-based worker
└── prisma/schema.prisma                      # MOD: add ChatThread, ChatMessage, ScheduledJob

frontend/src/
├── app/(dashboard)/
│   ├── decisions/page.tsx                    # MOD: render PinnedViewsRow above Decisions list
│   └── chat/                                 # NEW (or extend /copilot — see below)
│       ├── page.tsx                          # the dedicated chat surface (full-page mode)
│       └── [threadId]/page.tsx               # permalink to a past thread
├── components/
│   ├── ai/
│   │   ├── AskDarbPalette.tsx                # REWRITE on top of cmdk
│   │   ├── ChatThread.tsx                    # NEW: renders Turn[] with streaming
│   │   ├── ChatViewRenderer.tsx              # NEW: switch on view.type → component
│   │   ├── ChatActionCard.tsx                # NEW: inline action card with Approve/Modify/Dismiss
│   │   ├── ChatHistoryDrawer.tsx             # NEW: searchable history sidebar
│   │   └── PinButton.tsx                     # NEW: shared pin button
│   ├── chat/views/                           # NEW: one file per view type
│   │   ├── KpiStripView.tsx
│   │   ├── LineChartView.tsx
│   │   ├── BarChartView.tsx
│   │   ├── TableView.tsx
│   │   ├── MiniMapView.tsx
│   │   ├── ComparisonCardsView.tsx
│   │   └── DraftMessageView.tsx
│   ├── home/                                 # NEW
│   │   └── PinnedViewsRow.tsx                # renders PinnedView tiles on /decisions or /home
│   └── scheduled-jobs/                       # NEW
│       └── ScheduledJobsList.tsx             # CRUD UI for owner-authored briefings + standing-rule templates
└── hooks/
    ├── useStreamingChat.ts                   # NEW: wraps EventSource for the SSE chat path
    └── useChatHistory.ts                     # NEW: wraps /api/chat/threads list + search
```

### Pattern 1: SSE Token Streaming — Backend

**What:** Stream Anthropic completions to the browser as Server-Sent Events. Each event carries either a text delta, a view-descriptor block, a pending-approval block, or an end-of-turn marker.

**When to use:** Every chat-agent invocation from the UI (palette + full-page chat). Scheduled jobs DO NOT use SSE — they call `runAgent` directly without a streaming wrapper because there's no client to stream to.

**Example:**

```typescript
// Source: Context7 /anthropics/anthropic-sdk-typescript — messages.stream() + tool-runner pattern
// Backend route: backend/src/routes/ai.ts (extension)

router.get("/chat/stream", async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const tenantId = req.user!.tenantId;
  const threadId = req.query.threadId as string | undefined;
  const message = String(req.query.q ?? "");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // 1. Persist user message; ensure thread exists
  const thread = await chatHistoryService.upsertThread({ tenantId, userId, threadId, firstMessage: message });
  await chatHistoryService.appendMessage({ threadId: thread.id, role: "user", content: message });

  const send = (eventType: string, data: unknown) =>
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);

  send("thread", { threadId: thread.id });

  try {
    // 2. Run the chat agent in streaming mode.
    // runAgent gets a new "stream" option that, internally, swaps client.messages.create() for client.messages.stream().
    // We pass an onTextDelta callback to push deltas as SSE chunks; tool calls still go through the registry gate.
    const result = await runAgent("chat", {
      tenantId,
      triggerEvent: "route:ai:chat:stream",
      userMessage: message,
      history: await chatHistoryService.recentTurns(thread.id, 20),
      stream: {
        onTextDelta: (delta) => send("delta", { text: delta }),
        onView: (view) => send("view", view),                  // describeView tool result
        onPendingAction: (id) => send("pending", { pendingActionId: id }),
      },
    });

    // 3. Persist assistant turn + final view if any.
    await chatHistoryService.appendMessage({
      threadId: thread.id,
      role: "assistant",
      content: result.text ?? "",
      runId: result.runId,
      views: result.views,
      pendingActionIds: result.pendingActionIds,
    });

    send("done", { runId: result.runId });
  } catch (err: any) {
    send("error", { message: err.message });
  } finally {
    res.end();
  }
});
```

**Heartbeat:** Per `[CITED: WebSocket.org SSE 2026 guide]`, browsers/proxies often have 30-60s idle timeouts. Send a comment line `:heartbeat\n\n` every 15s if the model is still thinking (some queries call multiple read tools before yielding text).

### Pattern 2: Generative-UI Envelope — Agent Side

**What:** The chat agent describes a view via a tool call (`describeView`), not by emitting JSON in its text. The tool's result is purely informational (no side effect); the wrapper around `runAgent` captures the view descriptor and pipes it down the SSE stream as a typed event.

**When to use:** Any analytical question. The agent's prompt should bias toward calling `describeView` whenever the answer would benefit from a visualization or interactive element.

**Example:**

```typescript
// Source: NEW — backend/src/agent/tools/view/describeView.ts

export const describeView = defineTool({
  name: "describeView",
  description:
    "Describe a UI view to render alongside your text answer. Use this whenever a chart, table, KPI strip, mini-map, comparison cards, or draft message would communicate the answer better than prose. Call AFTER you've gathered the data via read tools so the spec contains real numbers.",
  inputValidator: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("kpi_strip"),
      tiles: z.array(z.object({
        label: z.string(),
        value: z.string(),         // pre-formatted ("47", "KD 412.500", "94.1%")
        deltaPct: z.number().nullable(),
        tone: z.enum(["positive", "negative", "neutral"]),
      })),
    }),
    z.object({
      type: z.literal("line_chart"),
      title: z.string(),
      xLabel: z.string(),
      yLabel: z.string(),
      series: z.array(z.object({
        name: z.string(),
        points: z.array(z.object({ x: z.string(), y: z.number() })),
      })),
    }),
    z.object({
      type: z.literal("bar_chart"),
      title: z.string(),
      categories: z.array(z.string()),
      series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })),
    }),
    z.object({
      type: z.literal("table"),
      columns: z.array(z.object({ key: z.string(), label: z.string(), align: z.enum(["left","right"]).optional() })),
      rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    }),
    z.object({
      type: z.literal("mini_map"),
      center: z.object({ lat: z.number(), lng: z.number() }),
      zoom: z.number().min(8).max(18),
      markers: z.array(z.object({
        lat: z.number(), lng: z.number(),
        label: z.string(), tone: z.enum(["green","grey","red","blue"]),
      })),
    }),
    z.object({
      type: z.literal("comparison_cards"),
      groups: z.array(z.object({
        heading: z.string(),
        metrics: z.array(z.object({ label: z.string(), value: z.string(), tone: z.enum(["positive","negative","neutral"]) })),
      })),
    }),
    z.object({
      type: z.literal("draft_message"),
      to: z.array(z.object({ driverId: z.string(), name: z.string() })),
      channel: z.enum(["WHATSAPP","SMS","IN_APP"]),
      bodyEn: z.string(),
      bodyAr: z.string().optional(),                          // bilingual where CON-bilingual-outbound applies
    }),
  ]),
  inputSchema: { /* expanded JSON Schema mirroring the Zod above */ } as any,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["chat"],
  strict: true,
  async execute(_ctx, input) {
    // Pure descriptor — no side effect. The runtime captures this on the way back.
    return { ok: true, view: input };
  },
});
```

The Zod discriminated union is the contract. The frontend `<ChatViewRenderer/>` switches on `view.type` and dispatches to the matching component. Adding a new view type is a one-place change on the agent side and a one-component change on the frontend side.

### Pattern 3: Generative-UI Rendering — Client Side

**What:** A switch component that maps the typed `view` envelope to the right React component. Each view is wrapped in a frame that exposes a `<PinButton/>`.

**When to use:** Inside a `<ChatThread/>` whenever an assistant turn carries `views: View[]`.

**Example:**

```tsx
// Source: NEW — frontend/src/components/ai/ChatViewRenderer.tsx

import { KpiStripView } from "@/components/chat/views/KpiStripView";
import { LineChartView } from "@/components/chat/views/LineChartView";
import { BarChartView } from "@/components/chat/views/BarChartView";
import { TableView } from "@/components/chat/views/TableView";
import { MiniMapView } from "@/components/chat/views/MiniMapView";
import { ComparisonCardsView } from "@/components/chat/views/ComparisonCardsView";
import { DraftMessageView } from "@/components/chat/views/DraftMessageView";
import { PinButton } from "@/components/ai/PinButton";

export function ChatViewRenderer({ view, threadId, messageId }: { view: View; threadId: string; messageId: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="absolute right-3 top-3">
        <PinButton view={view} threadId={threadId} messageId={messageId} />
      </div>
      {view.type === "kpi_strip"        && <KpiStripView view={view} />}
      {view.type === "line_chart"       && <LineChartView view={view} />}
      {view.type === "bar_chart"        && <BarChartView view={view} />}
      {view.type === "table"            && <TableView view={view} />}
      {view.type === "mini_map"         && <MiniMapView view={view} />}
      {view.type === "comparison_cards" && <ComparisonCardsView view={view} />}
      {view.type === "draft_message"    && <DraftMessageView view={view} />}
    </div>
  );
}
```

### Pattern 4: Inline Action Proposal in Chat

**What:** When the chat agent calls a propose tool (`draftCourierMessage`, `flagForReview`, `proposeCashReminder`), the registry's existing approval gate stages a `PendingAgentAction` row. The route surfaces the new pending action's id to the client via SSE; the client renders an inline `<ChatActionCard/>` with Approve / Modify / Dismiss; clicking Approve POSTs to `/api/decisions/:id/approve` — the SAME endpoint Phase 2 ships.

**Why this is the right shape:** Zero divergence from the propose-and-confirm contract. The chat surface is just another way to *file* a `PendingAgentAction`; everything downstream (audit ledger, dismiss-to-memory, optimistic-lock race protection) is reused unchanged.

**Example:**

```tsx
// Source: NEW — frontend/src/components/ai/ChatActionCard.tsx

export function ChatActionCard({ pendingActionId, onResolved }: { pendingActionId: string; onResolved: () => void }) {
  const { data: action } = useQuery(["pending-action", pendingActionId], () =>
    api.get(`/api/decisions/${pendingActionId}`).then(r => r.data)
  );
  if (!action) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-amber-700">{action.tag}</div>
      <div className="mt-1 text-sm text-foreground">{action.headline}</div>
      <div className="mt-1 text-xs text-secondary line-clamp-2">{action.reasoning}</div>
      <div className="mt-3 flex gap-2">
        <button onClick={async () => { await api.post(`/api/decisions/${pendingActionId}/approve`); onResolved(); }}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-white">
          Approve
        </button>
        <button onClick={() => /* open existing EditDrawer modal */ undefined}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium">
          Modify
        </button>
        <button onClick={async () => { await api.post(`/api/decisions/${pendingActionId}/dismiss`, { reason: "via chat" }); onResolved(); }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
          Dismiss
        </button>
      </div>
    </div>
  );
}
```

### Pattern 5: BullMQ Job Scheduler for Scheduled Briefings

**What:** Per `[CITED: docs.bullmq.io/guide/job-schedulers]`, the modern primitive for cron-style repeated jobs in BullMQ 5.x is `JobScheduler`, NOT the deprecated `repeat` option on individual jobs. Each `ScheduledJob` row maps to one BullMQ scheduler key.

**When to use:** Any owner-authored "every morning at 6, summarise yesterday and surface today's top 3 risks" briefing. Phase 4 ships this for briefings only; standing-rule templates ship as a UI listing only — actual rule firing (autonomy v3) is Phase 12 (REQ-data-agent-rule).

**Example:**

```typescript
// Source: docs.bullmq.io — JobScheduler
// backend/src/queues/scheduledJobsWorker.ts

import { Queue, Worker, JobScheduler } from "bullmq";
import { runAgent } from "../agent";
import { createPinnedView } from "../agent/pinnedView";

const SCHEDULED_JOBS_QUEUE = "scheduled-jobs";

export const scheduledJobsQueue = new Queue(SCHEDULED_JOBS_QUEUE, { connection: redisConnection });
export const scheduledJobsScheduler = new JobScheduler(SCHEDULED_JOBS_QUEUE, { connection: redisConnection });

export async function bindScheduledJob(job: { id: string; tenantId: string; userId: string; promptText: string; cronExpr: string; type: "briefing" | "standing_rule_v3" }) {
  await scheduledJobsScheduler.upsertJobScheduler(
    `sj:${job.id}`,
    { pattern: job.cronExpr, tz: "Asia/Kuwait" },
    {
      name: "scheduled-job-tick",
      data: job,
    },
  );
}

export async function unbindScheduledJob(jobId: string) {
  await scheduledJobsScheduler.removeJobScheduler(`sj:${jobId}`);
}

export const scheduledJobsWorker = new Worker(
  SCHEDULED_JOBS_QUEUE,
  async (job) => {
    const { id: scheduledJobId, tenantId, userId, promptText, type } = job.data as any;

    if (type === "briefing") {
      // Run the chat agent against the saved prompt as if the user typed it.
      const result = await runAgent("chat", {
        tenantId,
        triggerEvent: `cron:scheduled-job:${scheduledJobId}`,
        userMessage: promptText,
      });
      // Persist as a "briefing" PinnedView so it appears on Home next time the owner logs in.
      if (result.views && result.views.length > 0) {
        await createPinnedView({
          tenantId,
          userId,
          title: promptText.slice(0, 80),
          viewType: "briefing",                 // NB: existing PinnedView.viewType is a string, no enum constraint
          spec: { kind: "briefing", scheduledJobId, runId: result.runId, views: result.views, text: result.text },
        });
      }
    }
    if (type === "standing_rule_v3") {
      // Phase 4 only ships standing-rule TEMPLATES as a UI listing.
      // Actual rule firing is REQ-data-agent-rule (Phase 12).
      // Leave this branch as a no-op (or log) so the schema is forward-compatible.
    }
  },
  { connection: redisConnection },
);
```

### Pattern 6: Per-User Searchable Chat History via Postgres FTS

**What:** Persist every turn in `ChatMessage`. Add a generated `tsvector` column over `content` with a GIN index. Use Prisma's `fullTextSearch` query helper.

**When to use:** Always. The PRD requires per-user searchable history (REQ-chat-global-access).

**Example:**

```prisma
// Source: NEW — backend/prisma/schema.prisma additions

model ChatThread {
  id          String        @id @default(cuid())
  tenantId    String
  userId      String
  title       String        // first message truncated to 80 chars; updateable on demand
  pinned      Boolean       @default(false)
  archivedAt  DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  messages    ChatMessage[]
  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  user        User          @relation(fields: [userId], references: [id])
  @@index([tenantId, userId, updatedAt])
  @@index([tenantId, userId, archivedAt])
}

model ChatMessage {
  id               String     @id @default(cuid())
  threadId         String
  tenantId         String                     // denormalised for tenant-scope query path
  userId           String
  role             String     // "user" | "assistant" | "system"
  content          String     @db.Text
  views            Json?      // assistant turns may carry view descriptors
  pendingActionIds Json?      // assistant turns may carry pending action ids
  runId            String?    // assistant turns link back to AgentRunLog
  createdAt        DateTime   @default(now())
  thread           ChatThread @relation(fields: [threadId], references: [id])
  @@index([threadId, createdAt])
  @@index([tenantId, userId, createdAt])
}
```

```sql
-- Source: PostgreSQL 18 docs §12.2 + Prisma `fullTextSearch` preview feature
-- backend/prisma/migrations/.../migration.sql additions:

-- Generated tsvector column lets Postgres maintain it automatically on INSERT/UPDATE.
ALTER TABLE "ChatMessage" ADD COLUMN "contentTsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;

-- GIN index — preferred over GiST for static documents like chat turns.
CREATE INDEX "ChatMessage_contentTsv_idx" ON "ChatMessage" USING GIN ("contentTsv");
```

```typescript
// Source: NEW — backend/src/services/chatHistoryService.ts

export async function searchChatHistory(opts: { tenantId: string; userId: string; q: string; limit?: number }) {
  // Prisma's fullTextSearch helper writes the tsvector @@ to_tsquery match.
  // Already enabled via previewFeatures = ["fullTextSearch"] in schema.prisma.
  // (Verified against backend/prisma/schema.prisma line 1.)
  return prisma.chatMessage.findMany({
    where: {
      tenantId: opts.tenantId,
      userId: opts.userId,
      content: { search: opts.q.split(/\s+/).filter(Boolean).join(" & ") },  // " & " = AND in tsquery syntax
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 20,
    include: { thread: { select: { id: true, title: true } } },
  });
}
```

### Pattern 7: ⌘K Palette via cmdk

**What:** Replace the existing custom `AskDarbPalette.tsx` (~240 lines) with `cmdk`'s `<Command.Dialog>` primitive. The palette has three modes: ask (default), recent threads (start typing → fuzzy match across recent prompts), and pinned views (browse Home tiles).

**Example:**

```tsx
// Source: Context7 /dip/cmdk basic usage; adapted to Darb design system
// frontend/src/components/ai/AskDarbPalette.tsx (REWRITE)

import { Command } from "cmdk";

export function AskDarbPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { threads } = useRecentThreads();              // useChatHistory hook
  const { pins } = usePinnedViews();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    if (!query.trim()) return;
    // route to /chat?q=… which opens the streaming SSE channel
    router.push(`/chat?q=${encodeURIComponent(query)}`);
    setOpen(false);
  };

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Ask Darb">
      <Command.Input value={query} onValueChange={setQuery} placeholder='Ask anything, or "> apply 10 KD penalty…"' />
      <Command.List>
        <Command.Empty>No results.</Command.Empty>
        <Command.Group heading="Ask Darb">
          <Command.Item onSelect={submit}>Submit: "{query}"</Command.Item>
        </Command.Group>
        <Command.Group heading="Recent threads">
          {threads.map(t => (
            <Command.Item key={t.id} onSelect={() => router.push(`/chat/${t.id}`)}>{t.title}</Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Pinned">
          {pins.map(p => (
            <Command.Item key={p.id} onSelect={() => router.push(`/decisions#pin-${p.id}`)}>{p.title}</Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

### Anti-Patterns to Avoid

- **Putting WebSocket on Vercel.** Won't work; Vercel docs are explicit on this `[VERIFIED: vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections]`. Either move the backend to Render/Railway (multi-day infra change, out of Phase 4 scope) or use a third-party (Pusher/Ably $49-99/mo for the realtime tier you'd need). For Phase 4's actual data flow (server→client tokens), neither is necessary.
- **Emitting JSON in the assistant text and parsing it on the client.** LLMs are leaky — they'll say "Here's the chart: { … }" with stray text around the JSON. Use a dedicated tool (`describeView`) so Anthropic's grammar-constrained sampling enforces the schema.
- **Calling `runAgent("chat")` directly from the streaming route without persisting messages.** History is part of the contract (REQ-chat-global-access); persist on every turn, not at the end. If the SSE connection drops mid-stream, persist what you have so far.
- **Per-tenant chat history.** PRD §5.3 says per-user. Defense in depth: scope by `userId AND tenantId` everywhere.
- **Letting standing-rule templates fire actions in Phase 4.** REQ-data-agent-rule is Phase 12 (v3 autonomy); standing rules in Phase 4 are AUTHORING-only — the UI lets the owner save a template, but the firing engine is not built. This avoids accidentally shipping autonomy ahead of the agreed timeline.
- **Re-implementing the Decisions card UI inside chat.** Reuse `<DecisionCard/>` (from `frontend/src/components/decisions/DecisionCard.tsx` per Phase 2 verification) inside `<ChatActionCard/>`. Same look, same approve handler.
- **Unbounded chat history retention.** Add a `archivedAt DateTime?` column on `ChatThread`; archive (not delete) threads >90 days old via a daily cleanup job. PRD does not specify retention; this is a defensible default that the founder can adjust.
- **Skipping heartbeats on SSE.** Browsers + Vercel proxies will close idle connections. Send `:heartbeat\n\n` every 15s while the model is in the tool-loop.
- **Storing the raw view spec on `ChatMessage.views` AND duplicating it into `PinnedView.spec` when pinned.** Pin should reference the source message: `PinnedView.spec = { kind: "chat-pin", messageId, viewIndex }`. The renderer fetches the message, picks out the view at `viewIndex`. Single source of truth.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cmd+K command palette | Custom keyboard listener + filter loop + a11y | `cmdk@^1.1.1` | React 18-safe; battle-tested fuzzy search; used by Linear/Raycast/Vercel/shadcn `[CITED: cmdk.paco.me, ui.shadcn.com/docs/components/command]` |
| Token streaming from Anthropic | Custom HTTP fetch + manual SSE parsing | `client.messages.stream()` | Native to `@anthropic-ai/sdk` — emits typed events; handles tool use deltas (`input_json_delta`) `[VERIFIED: Context7 anthropic-sdk-typescript]` |
| Repeating cron jobs | Naive `setInterval` + locks | `BullMQ JobScheduler` | Survives restarts; per-tenant fan-out; integrates with existing 8 BullMQ workers `[CITED: docs.bullmq.io/guide/job-schedulers]` |
| Conversation FTS | LIKE queries with manual tokenisation | Postgres `tsvector` + GIN + Prisma `fullTextSearch` | Already-enabled preview feature; one generated column + one index `[VERIFIED: backend/prisma/schema.prisma]` |
| Charts | Custom SVG | `Recharts` | Already installed; declarative; wraps D3 |
| Mini-map view type | Custom Leaflet wrapper | `react-leaflet` (already installed) | Existing pattern in `keeta/monitor` |
| Pin storage | New table | `PinnedView` (existing — Phase 1) | Already shipped with CRUD primitives in `agent/pinnedView.ts` |
| Inline action card | Build new propose-flow | Reuse `/api/decisions/:id/approve` (Phase 2) | Same audit row shape, same race protection, same dismiss-to-memory |
| Rate limiting on chat endpoint | Bespoke logic | `express-rate-limit` (existing) | Already wired in `server.ts`; add a `chatLimiter` (e.g. 60 messages/min per user) |
| Frontend reconnect on SSE drop | Bespoke retry loop | Existing `useSSE.ts` hook | Already shipped with exponential backoff |
| Bidirectional WebSocket on Vercel | Set up `ws` server inside an API route | Either: (a) keep SSE for now, (b) move backend to Render, (c) Pusher/Ably | Vercel KB is explicit `[VERIFIED]` |

**Key insight:** Phase 4's surface is large but its primitive count is small. Three new Prisma models, four new routes, ~10 new components, one new BullMQ worker, one new agent tool. **Everything else is glue between primitives Phase 1 and Phase 2 already shipped.**

## Common Pitfalls

### Pitfall 1: Vercel proxy closing the SSE connection

**What goes wrong:** Vercel's edge proxy closes idle HTTP connections after ~30s. If the chat agent is in the middle of a tool-loop (calling 3 read tools then formulating an answer), the user's `EventSource` errors out and they see a stuck spinner.

**Why it happens:** SSE is a long-lived HTTP response; proxies treat long silences as dead.

**How to avoid:**
- Send a comment line `:heartbeat\n\n` every 15s while the agent is still processing.
- Wrap each tool-loop iteration in a heartbeat: emit `event: progress\ndata: {"phase": "tool_call", "tool": "revenueByDay"}\n\n` so the user sees activity AND the proxy sees data.
- On the client, in `EventSource.onerror`, exponentially back off and resume from the last persisted `messageId` rather than restarting the whole turn.

**Warning signs:** Console shows `EventSource error` after exactly 30s; `onmessage` never fires.

### Pitfall 2: Concurrent token streams from the same user

**What goes wrong:** User opens ⌘K, fires a query, and before it finishes hits ⌘K again with a new query. Two SSE channels open in parallel. Both write to the same thread. Output is interleaved nonsense.

**Why it happens:** No serialization in the route handler.

**How to avoid:**
- On the route, take a per-thread Redis lock with a 60s TTL before invoking `runAgent`.
- On the client, abort the previous `EventSource` when starting a new request.
- If the lock is taken, the route returns `409 Conflict` immediately and the client surfaces "you have a query in flight; cancel it first."

**Warning signs:** Threads with bizarre, alternating turns; tool-call duplications in `AgentRunLog`.

### Pitfall 3: Chat agent ignores propose-and-confirm

**What goes wrong:** The chat agent decides to "just do it" and side-steps the confirm card. E.g. user says "warn driver X"; chat agent emits text "Done. I sent the warning." even though it never called `draftCourierMessage`.

**Why it happens:** Insufficient prompt discipline. The PRD is explicit (REQ-agent-propose-confirm: v1 has no auto-execute) but if the chat prompt doesn't reinforce, the model may hallucinate executions.

**How to avoid:**
- Prompt: "When the user asks you to act, you MUST call the matching propose-tool. Never claim an action was taken if no tool was called."
- Enforce via the registry (already in place — `requiresApproval: true` tools always stage `PendingAgentAction` when `ctx.userId` is unset).
- Add a regression test: invoke the chat agent with action requests against a mock LLM that emits a "Done." text. Assert that the route response carries `pendingActionIds.length === 0` and the run log shows zero tool calls — meaning we caught a hallucination.

**Warning signs:** Discrepancy between assistant text and audit log.

### Pitfall 4: Pinned views going stale

**What goes wrong:** User pins a view "Top 5 drivers by completion rate this week". A week later they tap the tile and it shows last week's numbers.

**Why it happens:** `PinnedView.spec` stores a static snapshot, not a live query.

**How to avoid:**
- Distinguish "pinned briefing" (snapshot, frozen at pin time) from "pinned query" (re-runs the source prompt every time the tile is loaded).
- For Phase 4, ship snapshot-only and surface pin freshness ("pinned 3 days ago").
- "Pinned query" is a Phase 11 concern (live re-runs touch the autonomy v2 question — does the agent get to call read tools without the user clicking?).
- If the user wants a live tile, they re-pin from a fresh chat.

**Warning signs:** Owner complaints that "the dashboard is wrong" — really it's a stale snapshot.

### Pitfall 5: FTS search misses Arabic queries

**What goes wrong:** Owner types "حسن" (an Arabic driver name) into history search. Postgres FTS with `english` config returns nothing.

**Why it happens:** `to_tsvector('english', …)` strips non-ASCII; Arabic characters are tokenised as single graphemes that don't match tsquery patterns.

**How to avoid:**
- Use `to_tsvector('simple', …)` instead of `english` for the chat-history index. `simple` does not stem and preserves all characters — fine for keyword recall.
- For substring/fuzzy match, the existing `pg_trgm` extension handles Arabic fine — fall back to `ILIKE` with trigram similarity if FTS misses.
- Alternative: use Postgres 17+ `dictionary_simple` per-language. Out of scope for Phase 4; document as a Phase 11+ option.

**Warning signs:** Owner search returns nothing for terms that obviously appear in old threads.

### Pitfall 6: Generative-UI view bypasses tenant scope

**What goes wrong:** Chat agent emits a `table` view containing data from another tenant. Tenant scope is enforced at the read-tool level, but `describeView` is itself a read tool that takes arbitrary input.

**Why it happens:** `describeView`'s input is whatever the agent puts in; the agent calls `revenueByPlatform` (tenant-scoped, returns this-tenant data), then emits `describeView({ rows: [...] })` with the tenant-scoped data. Safe. But if a tool ever returned cross-tenant data, `describeView` would faithfully render it.

**How to avoid:**
- Defense in depth: every read-tool execute function MUST start with `ctx.tenantId` and pass it into Prisma's where clause. The existing `lint:tenant` rule already catches missing `tenantId` filters in `agent/`.
- `describeView` itself does NOT touch the database. It's a pure transform of agent-supplied input → agent-supplied output. It cannot leak data on its own.
- Add a regression test: invoke the chat agent under tenant A; assert that no `view.rows[*]` cell contains tenant B data (using a fixture where tenant B has uniquely-tagged values).

**Warning signs:** Tenant B's data appearing in tenant A's pinned views or chat outputs.

### Pitfall 7: Scheduled job clock drift across DST / restart

**What goes wrong:** Owner authors "every morning at 6am". After a Vercel deploy or Redis restart, the scheduler skips a day or fires twice.

**Why it happens:** `setInterval` is in-memory; lost on restart. `node-cron` is in-memory. BullMQ `JobScheduler` persists to Redis but you must use the upsert pattern correctly.

**How to avoid:**
- Use BullMQ `JobScheduler.upsertJobScheduler(key, ...)` with a stable key (`sj:${scheduledJobId}`). Idempotent across restarts.
- Set `tz: "Asia/Kuwait"` (CON-floor-counters established Kuwait timezone). Kuwait does NOT observe DST so cron expressions are stable year-round.
- Add a heartbeat metric: every successful run emits a `MetricEvent({ type: "scheduled_job_fired", scheduledJobId, runId })`. A Phase 11 monitor can alert if a job hasn't fired in N expected windows.

**Warning signs:** Owner says "I didn't get my morning brief" or "I got two".

## Runtime State Inventory

This is a greenfield phase (new tables, new routes, new components on top of existing primitives). No rename / refactor / migration. **Skipping Runtime State Inventory.**

## Code Examples

(See Patterns 1–7 above. All examples cite their sources: Context7 `/anthropics/anthropic-sdk-typescript`, Context7 `/dip/cmdk`, BullMQ `docs.bullmq.io/guide/job-schedulers`, PostgreSQL 18 `§12.2`, the Phase 1+2 codebase.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom command palette code (`AskDarbPalette.tsx` ~240 lines) | `cmdk` library | 2024+ | -80% code, +a11y, +fuzzy search |
| WebSocket for everything realtime | SSE for server→client streams; WebSocket for true bidirectional only (collaborative editing, chat rooms) | 2023+ industry shift | Vercel-native; no third-party for chat |
| BullMQ `repeat` option on individual jobs | BullMQ `JobScheduler` API | BullMQ 5.x (2024) | Documented as the modern primitive; `repeat` is deprecated `[CITED: docs.bullmq.io/guide/job-schedulers]` |
| Vercel AI SDK `useChat()` with built-in HTTP+SSE transport | Vercel AI SDK 6 with pluggable transport | AI SDK 6 release | We deliberately don't adopt AI SDK; one less migration to do |
| LLM streams JSON in text content | LLM calls a typed tool (`describeView`) | Anthropic strict-mode + tool-use 2024+ | Schema-validated structured output; no parsing fragility |
| Per-message embeddings + vector search | Postgres FTS for v1; pgvector if recall lift justifies | When user complaints surface | Defer to Phase 11 if needed |

**Deprecated / outdated:**
- BullMQ `Queue.add({ … }, { repeat: { cron: …}})` — replaced by `JobScheduler` (still works in 5.x but marked as legacy).
- The Vercel AI SDK's `experimental_StreamData` — replaced by structured output / `streamObject`.
- `@anthropic-ai/sdk` `client.messages.create({ stream: true })` low-level event iterator — `client.messages.stream()` is the higher-level helper that's now canonical.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-chat-global-access | Single chat surface, ⌘K from anywhere, pinned in sidebar, per-user searchable history | Pattern 7 (cmdk palette), Pattern 6 (FTS), `ChatThread`+`ChatMessage` schema, `useStreamingChat` hook |
| REQ-chat-generated-dashboards | Inline mini-dashboards (KPI / chart / table / mini-map / cards / draft) + Pin-to-Home | Pattern 2 (describeView tool), Pattern 3 (ChatViewRenderer), Recharts + react-leaflet for views, existing `PinnedView` + new `PinButton` |
| REQ-chat-action-proposals | Chat can propose actions; goes through propose-and-confirm | Pattern 4 (ChatActionCard reuses `/api/decisions/:id/approve`); reuses Phase 2's substrate end-to-end |
| REQ-chat-scheduled-jobs | Pinned briefings + standing-rule templates | Pattern 5 (BullMQ JobScheduler), `ScheduledJob` model, `scheduledJobsWorker.ts` |
| REQ-agent-natural-language-qa | NL questions over fleet data → generated tables/charts via tools, tenant-scoped | Already shipped via Phase 1's 12 read tools + `runAgent("chat", ...)`; Phase 4 adds streaming wrapper + view envelope |
| REQ-realtime-streaming | "Keep SSE for notifications; add WebSocket for agent streaming" | **Re-interpret as transport-class equivalent** — Phase 4 ships SSE for chat tokens (Vercel-native), defer real WebSocket to Phase 7 if/when bidirectional use case emerges. Existing `notifications/stream` SSE remains untouched. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The PRD's wording "WebSocket for agent streaming" is satisfied by SSE on Vercel | Realtime transport decision | If founder reads "WebSocket" literally, Phase 4 needs to either (a) stand up a Render/Railway always-on WS server (multi-day infra change), or (b) pay $49-99/mo for Pusher/Ably. Mitigation: surface this in `/gsd-discuss-phase`. `[ASSUMED]` |
| A2 | The "owner default landing route" question stays as `/decisions` (not `/home`) | Pin-to-Home renderer location | If founder picks `/home`, the same `<PinnedViewsRow/>` component moves there — small refactor, not a rebuild. `[ASSUMED]` |
| A3 | Phase 4 ships standing-rule TEMPLATES (UI only, no firing engine) | Scheduled jobs scope | If founder wants firing in Phase 4, REQ-data-agent-rule + AgentRule model migrate from Phase 12 to Phase 4 — meaningful scope expansion. `[ASSUMED]` |
| A4 | Chat-history retention is 90 days (then archive, not delete) | Schema design | If founder wants permanent retention (compliance), keep `archivedAt` but never run the archive cleanup job — small Wave 0 toggle. `[ASSUMED]` |
| A5 | The chat agent's existing prompt + read tools are sufficient for ~80% of analytical questions | Generative-UI quality | If real queries break the agent (e.g. it doesn't pick the right view type), Phase 4 needs an eval-driven prompt-tuning loop in the same wave. Eval gold set covers this risk. `[ASSUMED]` |
| A6 | The `describeView` tool emits views the FRONTEND already has renderers for (no new view types unforeseen) | View envelope schema | Surfacing the discriminated union upfront prevents drift; if the agent invents an unsupported `view.type` value, Zod rejects it. `[ASSUMED]` |
| A7 | Per-user-per-thread Redis lock prevents concurrent stream interleaving | Pitfall 2 mitigation | Without the lock, threads get jumbled. Test in Wave 0. `[ASSUMED]` |
| A8 | `tsvector('simple', content)` is sufficient for Arabic + English mixed history | Pitfall 5 mitigation | Owner-facing UI is English-only per CON-bilingual-outbound, but the courier-side (when an owner asks "show me Hassan's last warning") could surface Arabic. `simple` config preserves both. `[ASSUMED]` |
| A9 | BullMQ `JobScheduler` is available in `bullmq@^5.73.4` | Scheduled jobs implementation | If the API surface differs from latest docs, fall back to the older `repeat` option (still works). `[ASSUMED]` — should be verified by importing the symbol in a Wave 0 test. |
| A10 | The chat surface lives at `/copilot` (existing) OR `/chat` (new) | Frontend routing | Recent commit "Move Darb AI chat to dedicated /copilot page" suggests `/copilot`. Phase 4 inherits that route name unless founder requests `/chat`. `[ASSUMED]` |

**If this table is empty:** All claims are verified. **It is not empty — 10 assumptions are flagged for discuss-phase confirmation, the largest of which is A1 (SSE-vs-WebSocket re-interpretation).**

## Open Questions

1. **WebSocket interpretation of CON-realtime-protocols.**
   - What we know: PRD §8 says "Add WebSocket for agent streaming and live floor map subscriptions"; Vercel cannot host WebSocket servers.
   - What's unclear: Is the founder open to "transport-class equivalent" (i.e., SSE for unidirectional streams)? Or should Phase 4 spin up a non-Vercel always-on backend?
   - Recommendation: Ship SSE in Phase 4; revisit the WebSocket question in Phase 7 (Live Floor) where the actual bidirectional use case is. Surface this in `/gsd-discuss-phase` as the load-bearing decision.

2. **Owner default landing route.**
   - What we know: PROJECT.md flags this as an open question (`/decisions` vs `/home`).
   - What's unclear: Where does the `<PinnedViewsRow/>` render?
   - Recommendation: Render on `/decisions` (current default per ROADMAP). One-component migration to `/home` if founder pivots later.

3. **Standing-rule templates: UI-only or also firing in Phase 4?**
   - What we know: REQ-data-agent-rule maps to Phase 12.
   - What's unclear: Does the founder want template authoring in Phase 4 to fire in Phase 12, or fire immediately?
   - Recommendation: Phase 4 ships authoring + saved templates only; firing engine is Phase 12. Templates remain in `ScheduledJob` rows with `type: "standing_rule_v3"` and the worker no-ops on them.

4. **Chat-history retention.**
   - What we know: PRD does not specify.
   - What's unclear: Default 90 days, or never archive, or shorter?
   - Recommendation: Soft-delete via `archivedAt` after 90 days; never hard-delete.

5. **Permission model for shared / cross-team chats.**
   - What we know: PRD says per-user. No team-shared mode mentioned.
   - What's unclear: Should an OPS_MANAGER be able to see an OWNER's chat history (delegation)?
   - Recommendation: Strictly per-user in v1. If delegation is needed, add a `sharedWith Json?` column later.

6. **Eval gold set scope.**
   - What we know: PRD Q1 design partner is Kuwait fleet; questions like "Why did orders drop yesterday in Hawally?", "Who's not performing?", "Where's my cash?".
   - What's unclear: Is there a tested gold set or do we author one in Wave 0?
   - Recommendation: Author 12-15 gold-set queries in Wave 0 — covers all 7 view types (KPI / line / bar / table / mini-map / comparison cards / draft message) plus 4-5 action-proposal flows.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | ✓ | 25.2.1 (verified `node --version`) | — |
| npm | Package install | ✓ | 11.6.2 | — |
| Anthropic API key | Streaming chat | (per-environment) | — | `runAgent` already returns `status: "disabled"` when missing — graceful degradation in place |
| PostgreSQL 15 with `pg_trgm` + `fullTextSearch` | Chat history FTS | ✓ | `pg_trgm` already installed; `fullTextSearch` preview already enabled | — |
| Redis 7 | BullMQ JobScheduler + per-thread lock | ✓ | already wired (`ioredis` + `BullMQ` + `eventBus`) | If Redis unavailable, scheduled jobs degrade to no-op (BullMQ requires Redis); per-thread lock degrades to in-memory `Map` — fine in dev |
| Vercel | Deploy target | ✓ | already deployed (`backend/vercel.json`, `.vercel/project.json` for frontend) | — |
| `cmdk` npm package | ⌘K palette | ✗ (NEW install) | Will install `^1.1.1` | — (no fallback; would have to rebuild custom palette) |

**Missing dependencies with no fallback:**
- None for Phase 4. `cmdk` is a new npm install; no infra dependency.

**Missing dependencies with fallback:**
- WebSocket library (e.g. `ws`, `socket.io`): explicitly NOT needed in Phase 4; SSE is the recommended path.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Jest 30.3.0 + supertest 7.2.2 |
| Frontend framework | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| Backend config file | `backend/jest.config.*` (existing) |
| Frontend config file | `frontend/vitest.config.*` (existing) |
| Backend quick run | `cd backend && npm test -- --testPathPatterns=<pattern>` |
| Backend full suite | `cd backend && npm test` |
| Frontend quick run | `cd frontend && npm run test:run -- src/__tests__/<file>` |
| Frontend full suite | `cd frontend && npm run test:run` |
| Phase gate | Backend full suite green + frontend Phase 4 tests green + `lint:tenant` exit 0 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-chat-global-access | ⌘K opens palette from any page | unit | `cd frontend && npm run test:run -- src/__tests__/ai/AskDarbPalette.test.tsx` | ❌ Wave 0 |
| REQ-chat-global-access | Sidebar contains "Ask Darb" link | unit | `cd frontend && npm run test:run -- src/__tests__/layout/SidebarV2.test.tsx -t "Ask Darb"` | ❌ Wave 0 |
| REQ-chat-global-access | History search returns relevant prior threads | integration | `cd backend && npm test -- --testPathPatterns=chat/historySearch` | ❌ Wave 0 |
| REQ-chat-generated-dashboards | `describeView` emits valid envelope shape | unit | `cd backend && npm test -- --testPathPatterns=agent/tools/view/describeView` | ❌ Wave 0 |
| REQ-chat-generated-dashboards | `<ChatViewRenderer/>` renders all 7 view types | unit | `cd frontend && npm run test:run -- src/__tests__/ai/ChatViewRenderer.test.tsx` | ❌ Wave 0 |
| REQ-chat-generated-dashboards | Pin button writes to `PinnedView` and renders on `/decisions` | integration | `cd backend && npm test -- --testPathPatterns=routes/pinnedViews` + frontend `PinnedViewsRow.test.tsx` | ❌ Wave 0 |
| REQ-chat-action-proposals | Chat-proposed action creates `PendingAgentAction` | integration | `cd backend && npm test -- --testPathPatterns=ai/chatActionProposal` | ❌ Wave 0 |
| REQ-chat-action-proposals | Approving from chat hits the same `/api/decisions/:id/approve` route | integration | `cd backend && npm test -- --testPathPatterns=decisions/approveFlow -t "via chat"` | ❌ Wave 0 |
| REQ-chat-scheduled-jobs | BullMQ JobScheduler upserts schedule | unit | `cd backend && npm test -- --testPathPatterns=queues/scheduledJobsWorker` | ❌ Wave 0 |
| REQ-chat-scheduled-jobs | Worker tick produces a `briefing` PinnedView | integration | same suite, `-t "briefing pin"` | ❌ Wave 0 |
| REQ-chat-scheduled-jobs | Standing-rule template UI lists templates but does NOT fire actions | unit | frontend `ScheduledJobsList.test.tsx` | ❌ Wave 0 |
| REQ-agent-natural-language-qa | Gold-set queries pass (12-15 fixtures) | smoke | `cd backend && npm test -- --testPathPatterns=ai/goldSet` | ❌ Wave 0 |
| REQ-agent-natural-language-qa | Tenant-scope leak test (tenant B data never appears in tenant A chat output) | integration | `cd backend && npm test -- --testPathPatterns=ai/tenantScopeLeak` | ❌ Wave 0 |
| REQ-realtime-streaming | SSE chat route streams text deltas + view + pending events | integration | `cd backend && npm test -- --testPathPatterns=routes/chatStream` | ❌ Wave 0 |
| REQ-realtime-streaming | Heartbeat fires every 15s while agent is in tool-loop | unit | same suite, `-t "heartbeat"` | ❌ Wave 0 |
| REQ-realtime-streaming | Existing `/api/notifications/stream` SSE continues to work | regression | `cd backend && npm test -- --testPathPatterns=notifications/stream` | ✅ existing |

### Sampling Rate

- **Per task commit:** quick subset matching the wave's scope (e.g. `cd backend && npm test -- --testPathPatterns=agent/tools/view`)
- **Per wave merge:** full backend suite + Phase 4 frontend suite (Phase 4 tests + sidebar + decisions to ensure no regression)
- **Phase gate:** Both full suites green + `npm run lint:tenant` exit 0 + `npx tsc --noEmit` clean before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/__tests__/agent/tools/view/describeView.test.ts` — covers REQ-chat-generated-dashboards (envelope shape per view type)
- [ ] `backend/src/__tests__/routes/chatStream.test.ts` — covers REQ-realtime-streaming (SSE deltas, view event, pending event, heartbeat, error event)
- [ ] `backend/src/__tests__/routes/pinnedViews.test.ts` — covers Pin-to-Home CRUD + cross-user-leak negative tests
- [ ] `backend/src/__tests__/routes/scheduledJobs.test.ts` — covers REQ-chat-scheduled-jobs CRUD + toggle
- [ ] `backend/src/__tests__/queues/scheduledJobsWorker.test.ts` — covers JobScheduler bind/unbind + worker tick → PinnedView
- [ ] `backend/src/__tests__/services/chatHistoryService.test.ts` — covers append + search (FTS) + retention archive
- [ ] `backend/src/__tests__/ai/goldSet.test.ts` — 12-15 queries with fixtured tenant data, asserts (a) right tools called, (b) right view type emitted, (c) tenant scope respected
- [ ] `backend/src/__tests__/ai/tenantScopeLeak.test.ts` — chat under tenant A, fixtured tenant B with sentinel rows, assert no sentinel string in response
- [ ] `backend/src/__tests__/ai/chatActionProposal.test.ts` — chat proposes action → `PendingAgentAction` row exists → `/api/decisions/:id/approve` resolves → `AgentAction` ledger row written
- [ ] `frontend/src/__tests__/ai/AskDarbPalette.test.tsx` — Cmd+K toggles, fuzzy match, suggestion routing
- [ ] `frontend/src/__tests__/ai/ChatViewRenderer.test.tsx` — renders all 7 view types from fixtures
- [ ] `frontend/src/__tests__/ai/ChatActionCard.test.tsx` — Approve/Modify/Dismiss handlers
- [ ] `frontend/src/__tests__/home/PinnedViewsRow.test.tsx` — renders pins; remove-pin flow
- [ ] `frontend/src/__tests__/scheduled-jobs/ScheduledJobsList.test.tsx` — CRUD + toggle + standing-rule template no-fire indicator
- [ ] `frontend/src/__tests__/hooks/useStreamingChat.test.ts` — EventSource lifecycle, reconnect on drop
- [ ] Lint extension: ensure new routes pass `npm run lint:tenant` — extend `package.json` lint:tenant glob to cover new files: `src/routes/chat.ts`, `src/routes/pinnedViews.ts`, `src/routes/scheduledJobs.ts`, `src/services/chatHistoryService.ts`, `src/services/scheduledJobsService.ts`, `src/queues/scheduledJobsWorker.ts`, `src/agent/tools/view/`

## Security Domain

> Per `.planning/config.json` — security_enforcement is treated as enabled (key absent = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `authMiddleware` (JWT 15m access + 7d refresh cookies) — no new auth surface in Phase 4 |
| V3 Session Management | yes | Existing cookie config; SSE inherits the same cookie auth via `withCredentials: true` (frontend `useSSE.ts` already uses this pattern) |
| V4 Access Control | yes | Existing `tenantScope` middleware on all new routes; ALSO scope by `userId` for `ChatThread`, `ChatMessage`, `PinnedView`, `ScheduledJob` (defense in depth) |
| V5 Input Validation | yes | Zod validators on every new tool input (existing `defineTool` pattern); Zod on every route body via existing `safeParse` pattern |
| V6 Cryptography | yes | No new crypto in Phase 4. Anthropic API key is server-side only. Cookies signed with existing JWT secret. |
| V7 Error Handling | yes | Existing pattern: try/catch in every route, return `{ error: message }`. SSE errors emit `event: error\ndata: {...}\n\n` and close stream. |
| V8 Data Protection | yes | Chat content may contain PII (driver names, phones, fleet performance data). Stored in Postgres with existing tenant scoping; no new external sinks (no logging chat content to external services). |
| V11 Business Logic | yes | Propose-and-confirm gate on every action tool — chat does not bypass. v3 standing rules deferred to Phase 12, so no autonomy escape hatch in Phase 4. |
| V13 API & Web Service | yes | All new routes follow existing REST + Swagger annotation pattern. SSE endpoint adds `Cache-Control: no-cache` + `X-Accel-Buffering: no` headers to defeat proxy buffering. |

### Known Threat Patterns for {Express + Prisma + Anthropic + SSE}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leak via chat output | I (Information disclosure) | Read tools enforce `where: { tenantId: ctx.tenantId }`; existing `lint:tenant` rule + new gold-set leak test (see Pitfall 6) |
| Cross-user history leak (one user reads another user's chats) | I | Every `ChatThread`+`ChatMessage` query scopes by BOTH `userId AND tenantId`; pinnedView pattern from Phase 1 already does this (`agent/pinnedView.ts:listPinsForUser`) |
| LLM prompt injection via user message exfiltrates secrets | T (Tampering), I | System prompt is server-side and never echoed; tools never accept arbitrary SQL or shell input (Zod-validated structured input only) |
| LLM hallucinates an action was taken | R (Repudiation) | Audit ledger is the source of truth (`AgentRunLog` + `AgentAction`); add a regression test that asserts no `assistant.text` includes "I did X" without a corresponding `AgentToolCall` row |
| SSE stream leaks long-lived auth | I | Cookies + per-request lifetime; no token in URL except for the existing pattern in `useSSE.ts` (`?token=...`); recommend keeping cookie-based for new chat stream and avoid token-in-URL |
| Resource exhaustion via spammy ⌘K queries | D (Denial of Service) | Rate limit: existing `apiLimiter` covers `/api/*`; add a tighter `chatLimiter` (60/min/user) on `/api/ai/chat/stream` |
| Resource exhaustion via runaway scheduled job (cron expression like `* * * * *`) | D | Validate cron expression at write time (`cron-parser`); reject schedules that fire more than once every 5 min; cap at 50 scheduled jobs per tenant |
| Pinned view spec injection (XSS via stored Json) | T | Frontend renderer NEVER uses `dangerouslySetInnerHTML`; the discriminated union is the contract; non-string values pass through React text nodes (escaped) |
| Stored chat content reveals PII to operators | I (Information disclosure) | Operator support tools already exist via super-admin; chat content is no different from existing PII (driver names, phones). No new exposure surface. |
| Anthropic API key leakage through error message | I | Error handler strips `error.headers` and `error.config` before serializing; existing `errorHandler.ts` middleware should be reviewed |

## Sources

### Primary (HIGH confidence)
- `[VERIFIED: backend/package.json]` `@anthropic-ai/sdk@^0.80.0`, `bullmq@^5.73.4`, `@prisma/client@^5.22.0`, `node-cron@^4.2.1`, `zod@^3.23.8`
- `[VERIFIED: frontend/package.json]` `next@14.2.35`, `recharts@^3.8.1`, `lucide-react@^0.577.0`, `axios@^1.13.6`, `@tanstack/react-query@^5.99.0`, `react-leaflet@^5.0.0`; `cmdk` NOT installed
- `[VERIFIED: backend/prisma/schema.prisma]` `previewFeatures = ["postgresqlExtensions", "fullTextSearch"]` and `extensions = [pg_trgm]`
- `[VERIFIED: backend/src/agent/index.ts]` chat agent already registered (lines 53-63), 12 read tools registered, 3 propose tools registered
- `[VERIFIED: backend/src/agent/runtime.ts]` runAgent tool-loop pattern lines 92-279
- `[VERIFIED: backend/src/agent/pinnedView.ts]` createPinnedView/listPinsForUser/removePinnedView already exist
- `[VERIFIED: backend/src/services/eventBus.ts]` Redis pub/sub + per-tenant channels already wired
- `[VERIFIED: frontend/src/hooks/useSSE.ts]` exponential-backoff reconnect pattern already shipped
- `[VERIFIED: backend/vercel.json]` and `[VERIFIED: frontend/.vercel/project.json]` — both deployed on Vercel
- Context7 `/anthropics/anthropic-sdk-typescript` — `messages.stream()` pattern, tool-runner with stream, structured output
- Context7 `/dip/cmdk` — Command.Dialog usage, Cmd+K keyboard shortcut

### Secondary (MEDIUM confidence)
- [Vercel Knowledge Base — WebSocket support](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections) — confirms WebSocket NOT supported on Vercel functions (May 2026)
- [Vercel Fluid Compute docs](https://vercel.com/docs/fluid-compute) — confirms streaming responses supported, WebSocket NOT
- [Ably: WebSockets on Vercel](https://ably.com/topic/ai-stack/websockets-on-vercel-why-serverless-functions-cant-host-them) — independent confirmation; lists 3rd-party alternatives
- [BullMQ Job Schedulers docs](https://docs.bullmq.io/guide/job-schedulers) — Job Scheduler is the modern primitive
- [PostgreSQL 18 §12.2 — Tables and Indexes for Text Search](https://www.postgresql.org/docs/current/textsearch-tables.html) — generated tsvector column + GIN index pattern
- [Anthropic streaming docs](https://platform.claude.com/docs/en/build-with-claude/streaming) — SSE is Anthropic's transport
- [shadcn/ui Command](https://ui.shadcn.com/docs/components/command) — cmdk-based primitive used by Linear, Vercel, etc.
- [WebSocket.org SSE comparison 2026](https://websocket.org/comparisons/sse/) — SSE vs WebSocket bandwidth + use case fit
- [Streaming in 2026: SSE vs WebSockets](https://jetbi.com/blog/streaming-architecture-2026-beyond-websockets) — industry pattern shift
- [Smashing Magazine — Designing for Agentic AI (Feb 2026)](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/) — propose-and-confirm pattern industry validation

### Tertiary (LOW confidence — needs validation if relied on)
- Pusher / Ably pricing ($49-99/mo) — recent figures, but check actual quoted rates if 3rd-party transport is ever chosen
- Vercel AI SDK 6 transport deprecation timing — recent reading, not load-bearing for Phase 4 (we're not adopting AI SDK)
- BullMQ `JobScheduler` API surface stability across versions — verify in Wave 0 by importing the symbol; fall back to deprecated `repeat` if API shape differs

## Project Constraints (from CLAUDE.md)

CLAUDE.md directives that constrain Phase 4 planning:

| Directive | Where Applied |
|-----------|---------------|
| TypeScript strict mode throughout | All new TS files (Zod inference + ToolDefinition type-narrow) |
| Prisma for all DB access (never raw SQL unless aggregation requires it) | The tsvector GIN index migration is one explicit raw SQL exception (it's a generated column, which Prisma's schema language doesn't yet model directly) — documented in the migration |
| All routes use authMiddleware + tenantScope middleware | `/api/ai/chat/stream`, `/api/chat/threads`, `/api/pinned-views`, `/api/scheduled-jobs` all chain `authMiddleware → tenantScope` (with additional userId scope for per-user resources) |
| Pagination via getPagination() + paginatedResponse() utils | `/api/chat/threads` GET, `/api/scheduled-jobs` GET |
| Frontend: Tailwind utility classes, Shadcn components, Lucide icons | All new components |
| Arabic/English bilingual support via i18n directory | `describeView` view type `draft_message` includes `bodyEn` + optional `bodyAr` per CON-bilingual-outbound; owner-facing UI English-only |
| Auto-deploy to Vercel after every edit (memory) | Phase 4 changes deploy to Vercel as usual; SSE streaming works under Fluid Compute |
| Always send 2-line brief (memory) | Will follow in execution responses; not relevant to RESEARCH.md content |
| Pin Vercel alias to frontend-ebon-nine-34 (memory) | Standard CI step; not Phase 4 specific |

CLAUDE.md "NEW FEATURES — Keeta Operations Module Enhancement" describes Keeta-specific UI features (Real-time courier monitor, Violation Detection, Order Flow Timeline, Notification Centre Enhancement, Penalty Management, Shift & Area Management). **None of these are Phase 4 requirements.** They are Keeta-module features that will be hidden behind a feature flag in Phase 10 (per ROADMAP). They are NOT in scope for Phase 4 and the planner should not pull them in.

## Metadata

**Confidence breakdown:**
- Realtime transport choice: HIGH — Vercel KB explicit, multiple independent sources confirm
- Stack composition: HIGH — every package is verified against `package.json` and `npm view`
- Architecture (SSE + describeView tool + Pin reuse): HIGH — built atop verified Phase 1 + Phase 2 primitives
- Generative-UI envelope: HIGH — Zod discriminated union + Anthropic strict mode is a documented pattern
- Chat-history FTS: HIGH — fullTextSearch already enabled; pg_trgm already installed
- Pitfalls: MEDIUM-HIGH — derived from common production issues + Vercel-specific behaviour
- Scheduled jobs primitive: HIGH — BullMQ Job Scheduler docs are explicit
- WebSocket re-interpretation: MEDIUM — depends on founder confirmation

**Research date:** 2026-05-10
**Valid until:** 2026-06-09 (30 days; SSE/cmdk/BullMQ are stable; Anthropic SDK could ship a major version sooner — re-verify if planning slips past mid-June)
