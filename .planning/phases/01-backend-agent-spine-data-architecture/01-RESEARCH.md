# Phase 1: Backend Agent Spine + Data Architecture - Research

**Researched:** 2026-05-09
**Domain:** Anthropic SDK tool-use orchestration, Prisma schema design, Express middleware composition, multi-tenant data plumbing
**Confidence:** HIGH (codebase patterns) / HIGH (Anthropic SDK) / MEDIUM (open scope decisions noted in Open Questions)

## Summary

Phase 1 is **less greenfield than the roadmap suggests.** A scan of the codebase shows that a v2-style agent runtime already exists at `backend/src/services/agents/` — including a `toolRegistry` with Zod validation + RBAC + approval gates, an `agentRuntime` agentic loop with persisted run logs, an `agentScheduler` with cron + event triggers, four registered agents (`triage`, `reconciliation`, `narrator`, `chat`), three Prisma models (`AgentRunLog`, `AgentToolCall`, `PendingAgentAction`), and Redis-backed event bus. **The phase is therefore a relocation + extension job, not a from-scratch build.** [VERIFIED: codebase grep at `backend/src/services/agents/`]

What's missing per the PRD/REQUIREMENTS:

1. The **5 new Prisma models** the PRD names — `AgentAction` (auditable proposal/approval ledger per CON-audit-row-shape), `AgentMemory`, `PinnedView`, `PerformanceSnapshot`, `MetricEvent` — none of these exist yet. The existing `AgentRunLog` + `PendingAgentAction` are run-log + approval-queue tables; they are NOT the audit-log-as-the-product table the PRD's CON-audit-row-shape demands. [VERIFIED: `grep -n "model AgentAction\|model AgentMemory\|model PinnedView\|model PerformanceSnapshot\|model MetricEvent" backend/prisma/schema.prisma` returns zero matches]
2. The **11 PRD-named read tools** (`revenueByDay`, `revenueByPlatform`, `revenueByZone`, `courierLeaderboard`, `courierProfile`, `violationsList`, `cashOutstanding`, `attendanceForPeriod`, `liveFleetStatus`, `gpsTrack`, `searchOrders`) — only `revenueByDay` and `courierLeaderboard` exist (in legacy `aiChiefOfStaffService`); the others must be added to the registry.
3. **Module relocation** to `backend/src/agent/` (the PRD's path) instead of `backend/src/services/agents/` (current path). This is a directory rename plus a one-time consolidation of the legacy `aiChiefOfStaffService.ts` and `aiChatService.ts` (both still register their own ad-hoc tool sets) into the canonical registry.
4. A **tenant-scope automated check** (lint or test). The existing `prismaExtensions.ts` has a runtime warn-or-throw guard; success criterion 4 demands a static check that catches missing tenant scoping at build/CI time.

**Primary recommendation:** Treat Phase 1 as five orthogonal workstreams that each fit in a wave: (a) 5 new Prisma models + migration, (b) module relocation `services/agents/` -> `agent/` with a thin re-export shim for backwards compat, (c) 11 read tools registered (most wrap existing aggregation services like `aiScoringService`/`americanaPerformanceService`/`kpiComputeService` rather than reimplementing aggregations), (d) consolidate legacy tools (`aiChiefOfStaffService` + `aiChatService` move their tool definitions into the registry), (e) tenant-scope CI guard (lint rule preferred — fast, no DB needed, works in pre-commit). Bare Anthropic SDK is the right framework choice; LangGraph and a custom orchestrator are both unnecessary given how much already works.

## User Constraints

> No `CONTEXT.md` exists for this phase yet — `/gsd-discuss-phase` has not been run. The constraints below are derived directly from `.planning/PROJECT.md` and `.planning/intel/constraints.md` (verbatim). Until `/gsd-discuss-phase` produces locked decisions, the planner should treat these as the authoritative scope.

### Locked Decisions (from PROJECT.md / intel/constraints.md / CLAUDE.md — already accepted into the planning corpus)

- **CON-stack-backend-pinned:** Express 4 + TypeScript (strict) + Prisma 5 (PostgreSQL 15) + Redis 7 + BullMQ. JWT auth + RBAC + tenantScope middleware. SSE for notifications. **No deviation.**
- **CON-stack-agent-runtime:** Anthropic Claude Sonnet 4.6 via the Anthropic SDK (`@anthropic-ai/sdk`), organised into a dedicated `agent/` module. **No LangGraph, no LangChain, no custom orchestrator.**
- **CON-tenant-scope-everywhere:** All agent read tools, action tools, memory entries, pinned views, metric events MUST be tenant-scoped via the existing `tenantScope` middleware pattern. Verified by an automated check.
- **CON-audit-row-shape:** Every fired action writes a row to `AgentAction` with: proposer (always "Darb"), approver (human user id), originalProposal, modificationsBeforeApproval, outcome, reasoning. Audit log IS the product / training corpus.
- **CON-action-confirm-card:** Every action tool emits a confirm card. v1 has no exceptions. (Phase 1 ships only read tools — but the registry shape must already accommodate this for Phase 8.)
- **DEC-promote-agent-to-spine:** Promote `aiChiefOfStaffService` from a service to a dedicated `agent/` module with tool registry, action ledger, memory, pinned views, rules.
- **DEC-add-metric-events:** Add `MetricEvent` table + lightweight in-product analytics so the agent can "see itself."
- **DEC-audit-log-is-the-product:** The audit log is the product; every action audited in `AgentAction` (proposer/approver/proposal/modifications/outcome/reasoning).

### Claude's Discretion (planner may decide)

- Tool registry shape (TypeScript discriminated union vs. Zod-driven `defineTool` helper). Existing code already uses the Zod pattern — recommend keeping it.
- Whether `AgentMemory` is one-row-per-key (SETs/UPDATEs) or append-only (recompute most-recent-by-key). Recommend append-only for "training corpus" semantics; latest-by-key view is a Prisma query, not a schema decision.
- `PerformanceSnapshot` granularity (daily-only vs. daily + hourly). Recommend daily-only in Phase 1; hourly is YAGNI.
- Tenant-scope automated check: ESLint rule vs. test-based vs. Prisma extension throw-mode. Recommend ESLint custom rule (covered in Recommended Approach §3).

### Deferred Ideas (OUT OF SCOPE — explicitly Phase 1 non-goals)

- All **action tools** (`draftCourierMessage`, `sendCourierMessage`, `applyPenalty`, `suspendDriver`, `reassignShift`, `flagForReview`, `createTrainingTask`, `recordCashSettlement`, `escalateToHumanSupervisor`, `generatePayrollAdjustment`) — Phase 8.
- The **continuous-monitoring loop** that fills the inbox — Phase 2.
- The **Decisions UI** at `/decisions` — Phase 2.
- The **chat surface** at `⌘K` — Phase 4.
- The **mobile GPS beacon** — Phase 5.
- The **`AgentRule` model** (standing rules) — Phase 12.
- The **two forecast tools** (`forecastDemand`, `forecastSupplyGap`) — Phase 11/12.
- **WebSocket infrastructure** — Phase 4 (SSE continues to work in Phase 1).
- **Trust graduation v2** auto-execute action classes — Phase 11.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-data-agent-action | `AgentAction` Prisma model — every proposal/approval/outcome (acts as both audit log and training data). Fields per CON-audit-row-shape. | Prisma model design in Recommended Approach §4. The existing `AgentRunLog` is for *agent runs* (one row per LLM invocation); `AgentAction` is for *fired actions* (one row per approved+executed action) — these are distinct tables. |
| REQ-data-agent-memory | `AgentMemory` Prisma model — per-tenant key/value notes the agent maintains. | Prisma model design in Recommended Approach §4. Append-only, with an index on (tenantId, key, createdAt DESC) for "latest-by-key" reads. |
| REQ-data-pinned-view | `PinnedView` Prisma model — saved generated views per user. | Prisma model design in Recommended Approach §4. Stores view spec (table/chart/map/etc.) as `Json` payload. |
| REQ-data-performance-snapshot | `PerformanceSnapshot` Prisma model — daily snapshot per driver for trend analysis. | Prisma model design in Recommended Approach §4. Replaces per-request recompute pattern in `aiScoringService`. |
| REQ-data-metric-event | `MetricEvent` Prisma model — in-product analytics event log. | Prisma model design in Recommended Approach §4. Lean shape — `event` (string), `userId`, `tenantId`, `properties` (Json), `createdAt`. Indexed on (tenantId, event, createdAt). |
| REQ-agent-read-tools | 11 read tools registered in tool registry, tenant-scoped, returning compact JSON. | Read-tool data-source map in Recommended Approach §5. Most tools wrap existing aggregation services. |
| REQ-tenant-scoped-everything | Every new agent route + tool query enforces tenantId scoping; automated check catches violations. | Tenant-scope enforcement strategy in Recommended Approach §3 — recommends ESLint custom rule + existing `prismaExtensions` runtime guard + a Jest integration test. |

## Project Constraints (from CLAUDE.md)

Extracted directives that the planner MUST honor:

- **TypeScript strict mode** throughout — no `any` slip-ins on new code.
- **Prisma for all DB access** — never raw SQL unless aggregation requires it. The legacy `aiChiefOfStaffService` uses `$queryRawUnsafe` with hand-built platform clauses — this is one of the patterns Phase 1 should clean up. Existing `agents/tools/` uses `prisma.x.findMany`, `groupBy` — that's the target shape.
- **All routes use `authMiddleware` + `tenantScope` middleware.** The existing pattern is `router.use(authMiddleware, tenantScope);` at the top of every route file (see `routes/kpis.ts`, `routes/drivers.ts`).
- **Pagination via `getPagination()` + `paginatedResponse()` utils.**
- **Error handling:** try/catch in every route, return `{ error: message }`.
- **TypeScript strict mode** — `tsconfig.json` has `"strict": true`.
- **Multi-tenant root entity is `Tenant`** — every new model MUST have `tenantId` + index + relation to Tenant.
- **Currency is KWD with 3 decimals.** Use `Decimal @db.Decimal(10, 3)` for any monetary field (the existing pattern in `CashRecord`, `OrderLog`, etc.).
- **Platform-specific code lives under platform-named directories** (`keeta/`, `talabat/`, `deliveroo/`, `americana/`). The agent module is cross-platform; it should NOT be platform-namespaced.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tool registry (definitions, RBAC gate, approval gate, audit row write) | API / Backend | Database (Prisma writes) | Pure server-side concern; the registry never reaches a client. |
| Agentic loop (Anthropic SDK tool-use orchestration) | API / Backend | — | Server-side LLM call; tokens stream out via SSE/WS later but the loop itself is server-only. |
| Read-tool data fetch (the 11 tools) | API / Backend | Database (Prisma reads, `groupBy`, `aggregate`) | Tenant-scoped DB reads; never delegated to a client. |
| `AgentAction` audit row write | API / Backend | Database | Single transaction at action-execute time; no client involvement. |
| `AgentMemory` upsert | API / Backend | Database | Server-only — agent writes during a tool call. |
| `PinnedView` create/list | API / Backend | Database | Read by the Frontend Server (Next.js) at render time, but stored + queried server-side. |
| `PerformanceSnapshot` daily compute | API / Backend (BullMQ worker) | Database | Cron-driven background job; not on the request path. (Wave 0 / future hookup, not Phase 1 critical path — see Open Questions.) |
| `MetricEvent` event ingestion | API / Backend | Database | Tiny POST endpoint or in-process emitter; no client orchestration. |
| Tenant-scope CI guard (lint/test) | Build tooling (Node tooling, ESLint, Jest) | — | Static analysis; runs on developer machines + CI. |

**Why this matters:** every Phase 1 capability sits in the API/Backend tier. There is **no Frontend Server, Browser/Client, or CDN work** in Phase 1. The planner should reject any task that lands a file outside `backend/`. The single exception is documentation under `.planning/`.

## Architecture Patterns

### System Architecture Diagram (Phase 1 scope)

```
┌────────────────────┐
│  Express Request   │ (any future agent-touching route)
│  authMiddleware    │
│  tenantScope       │ ──► AsyncLocalStorage(tenantId, userId)
└────────┬───────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ backend/src/agent/                       (relocated from         │
│                                          backend/src/services/agents/) │
│                                                                   │
│  ┌────────────────┐    ┌──────────────────┐                      │
│  │ toolRegistry   │◄───┤ agentRuntime     │                      │
│  │  - register()  │    │  - runAgent()    │  Anthropic SDK       │
│  │  - invoke()    │    │  - tool-use loop │  (Sonnet 4.6)        │
│  │  - RBAC + Zod  │    │  - max 8 iters   │                      │
│  │  - approval    │    └──────────────────┘                      │
│  │    gate        │                                              │
│  └────┬───────────┘                                              │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────┐            │
│  │ tools/                                            │            │
│  │   read/                                           │            │
│  │     revenueByDay, revenueByPlatform, ...  (×11)   │            │
│  │   (write/ deferred to Phase 8 — registry shape    │            │
│  │    accommodates them)                             │            │
│  └────┬──────────────────────────────────────────────┘            │
└───────┼──────────────────────────────────────────────────────────┘
        │
        ▼ (Prisma — tenantId-scoped queries)
┌──────────────────────────────────────────────────────────────────┐
│  prismaExtensions  (runtime tenant-guard + AuditLog mirror)      │
│                                                                   │
│  Existing tables (40+ models — read-only for Phase 1)            │
│   Driver, Shift, OrderLog, CashRecord, Violation,                │
│   AiScore, Alert, KeetaDailyMetrics, TalabatDailyMetrics,        │
│   DeliverooDailyMetrics, AmericanaDailyOrders,                   │
│   CourierOnlineSession, LocationLog, ...                         │
│                                                                   │
│  NEW Phase 1 models (writes) ────────────────────────────────────│
│   AgentAction          ◄── audit-row-shape, action ledger        │
│   AgentMemory          ◄── per-tenant key/value notes            │
│   PinnedView           ◄── per-user saved generated views        │
│   PerformanceSnapshot  ◄── daily per-driver score snapshot       │
│   MetricEvent          ◄── lightweight analytics event log       │
└──────────────────────────────────────────────────────────────────┘
        │
        ▲
        │ (Phase 1 ships read-only; writes to new models happen
        │  inside tool execute() handlers and inside the AgentAction
        │  ledger writer when a write tool is approved — but no
        │  write tools ship in Phase 1.)
```

The diagram shows that Phase 1 does NOT add a new request entry surface beyond what already exists — `aiChiefOfStaffService` already mounts `/api/ai/cos`. The phase is about *consolidating* the registry and *adding* the data plumbing, not about new HTTP surface area.

### Recommended Project Structure

```
backend/src/
├── agent/                            # ◄── NEW (relocated from services/agents/)
│   ├── index.ts                      # public exports + registerAgent() bootstrap
│   ├── runtime.ts                    # was agentRuntime.ts — runAgent(), tool-use loop
│   ├── scheduler.ts                  # was agentScheduler.ts — cron + event triggers
│   ├── registry.ts                   # was toolRegistry.ts — defineTool, invoke()
│   ├── ledger.ts                     # ◄── NEW — AgentAction writer (audit-row-shape)
│   ├── memory.ts                     # ◄── NEW — AgentMemory upsert + read helpers
│   ├── tools/
│   │   ├── read/                     # ◄── NEW subfolder (11 tools — Phase 1)
│   │   │   ├── revenueByDay.ts
│   │   │   ├── revenueByPlatform.ts
│   │   │   ├── revenueByZone.ts
│   │   │   ├── courierLeaderboard.ts
│   │   │   ├── courierProfile.ts
│   │   │   ├── violationsList.ts
│   │   │   ├── cashOutstanding.ts
│   │   │   ├── attendanceForPeriod.ts
│   │   │   ├── liveFleetStatus.ts
│   │   │   ├── gpsTrack.ts
│   │   │   └── searchOrders.ts
│   │   ├── write/                    # ◄── Phase 8 placeholder; do not ship
│   │   │   └── (empty in Phase 1)
│   │   └── _legacy/                  # was services/agents/tools/ — preserves backward compat
│   │       ├── triage.ts             # registerTriageTools() — keep registering
│   │       ├── reconciliation.ts     # registerReconciliationTools() — keep registering
│   │       └── narrator.ts           # registerNarratorTools() — keep registering
│   └── prompts/                      # was services/agents/prompts/
│       ├── chat.md
│       ├── narrator.md
│       ├── reconciliation.md
│       └── triage.md
├── services/agents/                  # ◄── DELETED after relocation; or replaced with re-export shim
│   └── index.ts                      # re-exports `from '../../agent'` for one release cycle
└── routes/
    └── aiChiefOfStaff.ts              # ◄── REFACTOR — calls agent/runtime instead of legacy service
```

The legacy `services/aiChiefOfStaffService.ts` and `services/aiChatService.ts` get **deleted** in Phase 1 once their callers move to `agent/runtime.ts` (one route, `aiChiefOfStaff.ts`, plus any internal callers).

### Pattern 1: `defineTool` (Zod-validated, RBAC-gated, audit-mirrored)

**What:** A function that pairs an Anthropic-SDK-shaped JSON Schema with a Zod validator and a tenant-scoped execute handler. Already implemented; Phase 1 just adds new tools that follow the pattern.

**When to use:** every tool the agent can call. Same pattern for read and write; only `requiresApproval`, `sideEffect`, and `requiredRole` differ.

**Example (existing pattern, lifted from `services/agents/tools/triage.ts`):**

```typescript
// Source: backend/src/services/agents/toolRegistry.ts and tools/triage.ts (codebase, verified)
import { z } from "zod";
import { prisma } from "../../config";
import { defineTool, toolRegistry } from "../registry";

export const revenueByDay = defineTool({
  name: "revenueByDay",
  description:
    "Return total completed orders, gross delivery revenue (KD, 3 decimals), " +
    "and per-courier average grouped by day for a date range. Use for trend " +
    "questions and morning briefings. Tenant-scoped. Returns at most 90 days.",
  inputSchema: {
    type: "object" as const,
    properties: {
      dateFrom: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      dateTo:   { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      platform: { type: "string", enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"], description: "Optional platform filter." },
      zone:     { type: "string", description: "Optional zone filter (Hawally, Avenues, ...)." },
    },
    required: ["dateFrom", "dateTo"],
    additionalProperties: false,    // [VERIFIED: docs.anthropic.com — required for strict mode]
  },
  inputValidator: z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    platform: z.enum(["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"]).optional(),
    zone:     z.string().min(1).max(100).optional(),
  }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],   // every agent can read
  async execute(ctx, input) {
    // tenantId is on ctx.tenantId — no other source.
    const rows = await prisma.orderLog.groupBy({
      by: ["date"],
      where: {
        tenantId: ctx.tenantId,
        date: { gte: new Date(input.dateFrom), lte: new Date(input.dateTo) },
        ...(input.platform ? { platform: input.platform } : {}),
        // zone filter would join Driver — keep this in courier-scoped variant
      },
      _sum: { orderCount: true, totalAmount: true },
      _count: { id: true },
      orderBy: { date: "asc" },
    });
    // Return shape Claude can reason about (tight, named keys).
    return rows.map((r) => ({
      day: r.date.toISOString().slice(0, 10),
      completedOrders: r._sum.orderCount ?? 0,
      grossRevenueKd: Number(r._sum.totalAmount ?? 0).toFixed(3),
      orderLogRows: r._count.id,
    }));
  },
});

toolRegistry.register(revenueByDay);
```

[VERIFIED: pattern lifted directly from `backend/src/services/agents/tools/triage.ts:15-62` and `backend/src/services/agents/toolRegistry.ts:160-180`]

### Pattern 2: AgentAction ledger write (the audit-row-shape contract)

**What:** A function called from the action-execution path (Phase 8) that writes the canonical CON-audit-row-shape row. Phase 1 ships the writer + table even though no action tools call it yet — Phase 2 starts using it for inbox approvals.

**When to use:** every time the registry executes a tool whose `sideEffect === "write"` AND `requiresApproval === true` AND `ctx.userId` is set (meaning a human approved it).

**Example (sketch):**

```typescript
// Source: derived from CON-audit-row-shape in .planning/intel/constraints.md
// File: backend/src/agent/ledger.ts
import { prisma } from "../config";

export interface AuditRow {
  tenantId: string;
  approverUserId: string;          // CON-audit-row-shape: human user id
  agentRunId: string;              // FK to AgentRunLog (existing table)
  toolName: string;                // tool whose execute fired
  originalProposal: unknown;       // input as the AGENT first proposed it
  modificationsBeforeApproval?: unknown; // diff if the human edited
  outcome: "success" | "failure" | "rolled_back";
  reasoning: string;               // agent's natural-language justification
  errorMessage?: string;
  modelName: string;               // claude-sonnet-4-6
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  subjectType?: string;            // "Driver" | "CashRecord" | "Shift" | ...
  subjectId?: string;
}

export async function writeAgentAction(row: AuditRow): Promise<void> {
  await prisma.agentAction.create({
    data: {
      tenantId: row.tenantId,
      proposer: "Darb",                                  // CON-audit-row-shape
      approverId: row.approverUserId,
      agentRunId: row.agentRunId,
      toolName: row.toolName,
      originalProposal: row.originalProposal as object,
      modificationsBeforeApproval: row.modificationsBeforeApproval as object | null,
      outcome: row.outcome,
      reasoning: row.reasoning,
      errorMessage: row.errorMessage,
      modelName: row.modelName,
      promptTokens: row.promptTokens ?? 0,
      completionTokens: row.completionTokens ?? 0,
      latencyMs: row.latencyMs ?? 0,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
    },
  });
}
```

### Anti-Patterns to Avoid

- **`prisma.$queryRawUnsafe` for tenant-scoped data.** The legacy `aiChiefOfStaffService.ts` does this with hand-built platform clauses (`safePlatformClause`). It bypasses the runtime tenant-guard and is one source of risk in CON-tenant-scope-everywhere. **Replace with `prisma.<model>.groupBy({...})` in every Phase 1 read tool.**
- **Reading `tenantId` from `req.body` or input parameters.** Always read from `ToolContext.tenantId` (set by the runtime from the JWT in the originating request). The PRD's threat model assumes a malicious agent prompt could otherwise smuggle a foreign tenant id.
- **Building a tool that returns >100KB of JSON.** Anthropic's docs recommend "tight, semantic responses." The existing `aiChiefOfStaffService` truncates `JSON.stringify(result).slice(0, 12000)` — don't rely on that; design tool responses to fit within ~10KB by default. Use `limit` + cursor inputs.
- **Embedding model id as a magic string.** `MODEL = "claude-sonnet-4-6"` is currently a per-file constant. Move to a single `agent/config.ts` so the Phase 11 model upgrade (if needed) is one-line.
- **Putting forecast tools in Phase 1.** REQ-agent-read-tools text says "13 tools" but the *roadmap success criterion 2* says "9 Phase-1 read tools" and the orchestrator's hand-off in `<additional_context>` says 11 names. The two forecast tools (`forecastDemand`, `forecastSupplyGap`) are deferred to Phase 11/12. **Phase 1 ships exactly 11.** [VERIFIED: ROADMAP.md Phase 1 success criterion 2 + REQ-agent-read-tools requirement text]
- **Adding `AgentRule` in Phase 1.** That's Phase 12. Don't pre-empt the schema.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool-use agentic loop | A custom while-loop reading `stop_reason` | `agent/runtime.ts` (existing in-codebase implementation, derived from canonical Anthropic SDK pattern) | Already battle-tested with 4 agents in production-shape code. Re-implementing wastes a wave. |
| JSON-Schema validation of tool inputs | A bespoke validator | Zod + `inputValidator` in `defineTool` | Already wired; provides type inference for `execute(ctx, input)` automatically. |
| Tenant-scoping at the data layer | A new middleware or wrapper | Existing `prismaExtensions.ts` + `requestContext.ts` (AsyncLocalStorage) + add a static lint rule | Runtime guard already exists; the Phase 1 gap is a *static* check (success criterion 4). |
| Cron-driven cluster of tenants | Bull or BullMQ scheduled job from scratch | Existing `agent/scheduler.ts` (was `agentScheduler.ts`) — already does per-15-min triage, hourly narrator, per-tenant subscribe | The pattern works; just relocate. |
| Per-tenant pub/sub for events | A new Redis pubsub | Existing `services/eventBus.ts` (Redis pubsub with in-process fallback) | Already integrated with SSE. |
| Driver scoring (for `courierProfile` and `courierLeaderboard`) | A new compute path | Existing `services/aiScoringService.ts::AiScoringService.scoreAllDrivers` writes to `AiScore` table; tools read from `AiScore` | The `AiScore` table is already populated daily by a worker (`performanceTierWorker`). Tools wrap, not reimplement. |
| Daily per-driver performance trend | Recompute on every tool call | New `PerformanceSnapshot` model + a daily writer (Phase 1 ships the schema; the writer can land in Phase 1 Wave 0 or be deferred to Phase 3 — see Open Questions) | The PRD explicitly cites this as the fix for "the current pattern of recomputing on every read." |
| Anthropic prompt token tracking | Manual estimation | `response.usage.input_tokens` / `response.usage.output_tokens` (already used in `agent/runtime.ts:166-167`) | The SDK exposes it; the existing runtime already accumulates it into `AgentRunLog.promptTokens` / `completionTokens`. |
| Anthropic strict-mode tool input enforcement | Custom validation | `strict: true` flag on every tool definition + `additionalProperties: false` in JSON Schema | [CITED: platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use] Grammar-constrained sampling guarantees `input` matches schema; eliminates a whole class of "Claude returned wrong type" failures. |

**Key insight:** `~80% of Phase 1's "code" is relocation + extension`, not net-new construction. The agent module already has a working tool-use loop, registry, RBAC gate, approval queue, scheduler, event bus, and 12+ registered tools across 3 agents. The PRD's "promote to spine" mostly means: rename folder, write 11 new tools wrapping existing aggregations, add 5 new Prisma models, delete the legacy `aiChiefOfStaffService.ts`/`aiChatService.ts` once their tools are absorbed into the registry.

## Runtime State Inventory

> Phase 1 is **partly a relocation** (`backend/src/services/agents/` -> `backend/src/agent/`) and **partly a deletion** (`aiChiefOfStaffService.ts`, `aiChatService.ts`). The grep audit alone won't catch these runtime risks.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no databases store the string `"services/agents"` or `"aiChiefOfStaffService"` as a key, collection name, or user-facing identifier. The existing `AgentRunLog.agentId` stores logical agent ids (`"triage"`, `"reconciliation"`, `"narrator"`, `"chat"`) which are unaffected by the directory rename. | None. |
| Live service config | The Anthropic API key is read from `env.ANTHROPIC_API_KEY` (`config/env.ts`). No service config references the old service path. The Anthropic console / API itself is path-agnostic. | None. |
| OS-registered state | `setInterval` handles in `agentScheduler.ts` (lines 133, 136, 139). After relocation, the scheduler's `startAgentScheduler()` exporter must continue to be called from `server.ts:73-75`. | Verify `import "./services/agents"` and `import { startAgentScheduler } from "./services/agents/agentScheduler"` in `server.ts` are updated to `./agent` and `./agent/scheduler`. |
| Secrets/env vars | `ANTHROPIC_API_KEY` — name unchanged. `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` — none reference agent paths. | None. |
| Build artifacts | `backend/src/generated/prisma/` is a Prisma-generated client. After adding 5 new models, `prisma generate` and `prisma migrate dev --name 20260509_phase1_agent_models` must run, regenerating this directory. The `postinstall` script already runs `prisma generate && prisma migrate deploy` so Vercel deploys handle this. | One migration commit; `prisma/migrations/20260509_phase1_agent_models/migration.sql` will be added. |

**Imports referencing the old service paths** (caught by grep, but listed here so they're not surprises in execution):

```bash
$ grep -rn "aiChiefOfStaffService" backend/src/ | wc -l    # ~3 references
$ grep -rn "aiChatService" backend/src/ | wc -l            # ~1-2 references
$ grep -rn "services/agents" backend/src/ | wc -l          # ~3 references (server.ts + index re-exports)
```

These need straightforward find/replace at execution time. **Nothing in this category is a "runtime gotcha" beyond standard refactoring discipline.**

## Common Pitfalls

### Pitfall 1: Misreading `AgentRunLog` as the AgentAction audit log

**What goes wrong:** A planner sees `AgentRunLog`, `AgentToolCall`, and `PendingAgentAction` already exist and decides "the audit table is done." Then `AgentAction` (the CON-audit-row-shape table) gets dropped from the migration.

**Why it happens:** They sound similar; both are agent-related ledgers.

**How to avoid:**

| Table | One-row-per | Captures | Phase |
|-------|-------------|----------|-------|
| `AgentRunLog` (existing) | LLM invocation | tokens, status, model, runtime metadata | already shipped |
| `AgentToolCall` (existing) | tool invocation inside a run | tool name, input, output, durationMs | already shipped |
| `PendingAgentAction` (existing) | un-resolved write proposal | tool name, input, recommendation, confidence, resolvedBy | already shipped |
| **`AgentAction` (NEW — Phase 1)** | **fired-and-approved write action** | **proposer, approver, originalProposal, modificationsBeforeApproval, outcome, reasoning** | **THIS phase** |

The CON-audit-row-shape contract is met *only* by `AgentAction`. The other three tables are operational — they tell us "the agent ran" and "a proposal is waiting"; they do NOT tell the founder "what did Darb do for me last week, and why?"

**Warning signs:** A plan that says "audit log done" but no `AgentAction` model is in the migration.

### Pitfall 2: Forgetting the JWT path on the agent runtime

**What goes wrong:** The existing `runAgent` accepts `tenantId: string` as input, not from a request. Phase 1 needs to keep working with the existing event/cron triggers (no JWT) AND with new HTTP-triggered runs (chat, decisions). If the new HTTP route forgets to extract `tenantId` from `req.user.tenantId`, multi-tenant isolation breaks.

**Why it happens:** The `tenantScope` middleware sets AsyncLocalStorage but `runAgent` reads `tenantId` from its argument, not from context — a sensible decoupling but easy to mis-wire.

**How to avoid:** Every HTTP entry to the agent must be a route mounted with `router.use(authMiddleware, tenantScope)` (the standard pattern from `routes/kpis.ts:12`), and the route handler must call `runAgent({ tenantId: req.user!.tenantId, ... })`. Tested by route integration tests.

**Warning signs:** Any code that does `runAgent({ tenantId: req.body.tenantId, ... })` — that's a critical bug.

### Pitfall 3: Tool descriptions too thin

**What goes wrong:** Claude calls the wrong tool, or makes up a parameter, because the tool description didn't tell it when not to use the tool.

**Why it happens:** Authors write three-word descriptions like "Get cash records" instead of the 3-4-sentence pattern Anthropic's docs explicitly recommend.

**How to avoid:** Every tool description must include:
1. What the tool returns (data shape and units — "KD with 3 decimals", "ISO date strings", "milliseconds since epoch").
2. When to use it (the question shape it answers).
3. When NOT to use it (the question shape that needs a different tool).
4. Filtering / paging guidance ("max 50; default 20"; "lookback ≤90 days").

**Warning signs:** A `description` field shorter than 200 characters, or one that doesn't mention units.

[CITED: platform.claude.com — "Best practices for tool definitions: Aim for at least 3-4 sentences per tool description"]

### Pitfall 4: Forgetting `additionalProperties: false` under strict mode

**What goes wrong:** With `strict: true` enabled, Anthropic's grammar-constrained sampling will silently behave like non-strict if the JSON Schema lacks `additionalProperties: false`. Type guarantees break and you get the runtime errors `strict` was meant to prevent.

**Why it happens:** `strict: true` is opt-in; copying a non-strict tool definition forgets to flip the flag and forgets the schema convention.

**How to avoid:** Adopt strict mode for ALL Phase 1 tools. ESLint rule (Recommended Approach §3) enforces both `strict: true` and `additionalProperties: false` are present on every `defineTool` call.

[CITED: platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use — "Set `strict: true` on your tool definitions to enable schema validation"]

### Pitfall 5: Phase-1 sprawl into Phase 2's Decisions UI

**What goes wrong:** "Since we're adding `AgentAction`, we might as well add the `/decisions` route that reads from it." This pulls Phase 2 work into Phase 1, breaks the founder's sequential plan, and bloats the PR.

**Why it happens:** The audit table is closely associated with the inbox UI in the PRD's mental model.

**How to avoid:** The Phase 1 deliverable for `AgentAction` is **the table + the writer + a Jest test that the writer produces a CON-shape row**. No HTTP endpoint, no UI, no inbox listing. Phase 2 builds the inbox.

**Warning signs:** A plan that adds files under `frontend/`. Phase 1 has zero frontend work.

### Pitfall 6: Migration order vs. existing models

**What goes wrong:** The new migration drops a column or renames a model that another migration depends on, causing CI to fail with a confusing "shadow database" error.

**Why it happens:** Adding tables alongside the existing 40+ models is straightforward; the risk is from forgetting to declare the relation back to `Tenant`. The schema's `Tenant` model lists every relation explicitly (lines 353-413). Missing one means migrations succeed in dev but the Tenant.* fields are unusable.

**How to avoid:** Each new model MUST add itself to the `Tenant.relations` block (the bottom of the Tenant model). Migration files should be `prisma migrate dev --name 20260509_phase1_agent_models` (one combined migration is cleaner than 5 small ones for a coherent feature).

**Warning signs:** Plans that call out 5 separate migrations.

### Pitfall 7: ChatService model leak

**What goes wrong:** `aiChatService.ts` is registered in another route file (`routes/ai.ts` or similar), and deleting it breaks a chat route the planner didn't know existed.

**Why it happens:** The codebase has 49 route files; one of them imports `AiChatService`.

**How to avoid:** Before deleting `aiChatService.ts`, run:
```bash
grep -rn "AiChatService\|aiChatService" backend/src/ --include="*.ts"
```
Replace each call site with the new `agent/runtime.ts::runAgent({agentId: "chat", ...})` interface, then delete.

**Warning signs:** A plan that says "delete aiChatService.ts" without an audit step.

## Code Examples

### Example 1: A complete Phase 1 read tool (cashOutstanding)

```typescript
// Source: codebase patterns (services/agents/tools/triage.ts, reconciliation.ts) + REQ-agent-read-tools naming
// File: backend/src/agent/tools/read/cashOutstanding.ts
import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

const cashOutstanding = defineTool({
  name: "cashOutstanding",
  description:
    "List driver cash records with status PENDING or PARTIALLY_PAID. " +
    "Returns driver id + name, sales (KD, 3 decimals), collected (KD), " +
    "pending dues (KD), and age (days since the cash record's date). " +
    "Use this to answer 'who owes the fleet money?' or 'where's my cash?'. " +
    "Only covers Keeta, Talabat, Deliveroo (Americana excluded by design — " +
    "see CON-cash-platform-coverage). " +
    "Default sort: highest pending dues first. Returns at most 100 rows.",
  inputSchema: {
    type: "object" as const,
    properties: {
      minPendingKd: { type: "number", description: "Filter to records with pendingDues >= this value (KD)." },
      olderThanDays: { type: "number", description: "Filter to records older than N days." },
      driverId: { type: "string", description: "Optional: scope to one driver." },
      limit: { type: "number", description: "Default 50, max 100." },
    },
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({
    minPendingKd: z.number().min(0).optional(),
    olderThanDays: z.number().int().min(0).max(365).optional(),
    driverId: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  // strict: true,    // [CITED: docs.anthropic.com — guarantees Claude's input matches schema]
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const limit = Math.min(input.limit ?? 50, 100);
    const since = input.olderThanDays
      ? new Date(Date.now() - input.olderThanDays * 86_400_000)
      : undefined;

    const rows = await prisma.cashRecord.findMany({
      where: {
        tenantId: ctx.tenantId,                                  // ← tenant-scoped
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
        ...(since ? { date: { lte: since } } : {}),
        ...(input.driverId ? { driverId: input.driverId } : {}),
      },
      include: {
        driver: { select: { id: true, name: true, platform: true, phone: true } },
      },
      orderBy: { pendingDues: "desc" },
      take: limit,
    });

    const today = Date.now();
    const filtered = rows
      .map((r) => ({
        cashRecordId: r.id,
        driverId: r.driver.id,
        driverName: r.driver.name,
        platform: r.driver.platform,
        date: r.date.toISOString().slice(0, 10),
        salesKd: Number(r.salesAmount).toFixed(3),
        collectedKd: Number(r.collectionAmount).toFixed(3),
        pendingKd: Number(r.pendingDues).toFixed(3),
        ageDays: Math.floor((today - r.date.getTime()) / 86_400_000),
        status: r.status,
      }))
      .filter((r) => !input.minPendingKd || Number(r.pendingKd) >= input.minPendingKd);

    return filtered;
  },
});

export function registerCashOutstandingTool() {
  toolRegistry.register(cashOutstanding);
}
```

### Example 2: The Anthropic SDK agentic loop (the heart of `runtime.ts`)

```typescript
// Source: backend/src/services/agents/agentRuntime.ts (existing, lines 156-214 — verified)
// + canonical Anthropic SDK pattern from docs.anthropic.com (verified)
import Anthropic from "@anthropic-ai/sdk";
import { toolRegistry, type ToolContext } from "./registry";

const MODEL = "claude-sonnet-4-6";   // [CITED: CON-stack-agent-runtime]
const MAX_ITERATIONS = 8;            // existing default for triage

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const ctx: ToolContext = { tenantId, agentId, runId, actorRole };
const tools = toolRegistry.getAnthropicSchema(agentId, actorRole);

const messages: Anthropic.MessageParam[] = [
  { role: "user", content: initialUserContent },
];

for (let i = 0; i < MAX_ITERATIONS; i++) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages,
  });

  const toolUses = response.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );

  // [CITED: docs.anthropic.com — terminate when stop_reason is "end_turn"]
  if (response.stop_reason === "end_turn" || toolUses.length === 0) {
    finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text).join("\n");
    break;
  }

  messages.push({ role: "assistant", content: response.content });

  // Execute tool calls (parallel-safe — Promise.all)
  const toolResults = await Promise.all(toolUses.map(async (toolUse) => {
    const result = await toolRegistry.invoke(toolUse.name, ctx, toolUse.input);
    return {
      type: "tool_result" as const,
      tool_use_id: toolUse.id,
      content: JSON.stringify(result),
      is_error: result.status === "error" || result.status === "forbidden",
    };
  }));

  // [CITED: docs.anthropic.com — tool_result blocks must come FIRST in user content]
  messages.push({ role: "user", content: toolResults });
}
```

### Example 3: The tenant-scope ESLint rule (sketch)

```javascript
// Source: derived from the codebase's `prismaExtensions.ts` tenant-guard model
// File: backend/eslint-rules/no-prisma-without-tenant.js
//
// Catches: `prisma.<scopedModel>.findMany({ where: { ... } })` where the where
// clause does not literally include `tenantId:` or a binding called tenantId.

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Tenant-scoped Prisma queries must include tenantId in where" },
  },
  create(context) {
    const SCOPED = new Set([
      "Driver", "Company", "Vehicle", "Shift", "AttendanceRecord",
      "OrderLog", "CashRecord", "CashTransaction", "Violation", "Penalty",
      "Alert", "AiScore", "Notification", "AgentRunLog",
      // NEW Phase 1 models:
      "AgentAction", "AgentMemory", "PinnedView", "PerformanceSnapshot", "MetricEvent",
    ]);
    return {
      CallExpression(node) {
        // match prisma.<modelLowercase>.findMany / findFirst / findUnique / count / aggregate / groupBy / updateMany / deleteMany
        if (node.callee.type !== "MemberExpression") return;
        const op = node.callee.property?.name;
        if (!op || !["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy", "updateMany", "deleteMany"].includes(op)) return;
        const modelExpr = node.callee.object;
        if (modelExpr.type !== "MemberExpression") return;
        if (modelExpr.object?.name !== "prisma") return;
        const modelName = modelExpr.property?.name;
        if (!modelName) return;
        // Capitalize first letter to compare against SCOPED set
        const capitalized = modelName.charAt(0).toUpperCase() + modelName.slice(1);
        if (!SCOPED.has(capitalized)) return;
        const arg = node.arguments[0];
        if (!arg || arg.type !== "ObjectExpression") return;
        const whereProp = arg.properties.find((p) => p.key?.name === "where");
        if (!whereProp || whereProp.value.type !== "ObjectExpression") {
          context.report({ node, message: `prisma.${modelName}.${op} called without where filter (tenantId required)` });
          return;
        }
        const hasTenantId = whereProp.value.properties.some(
          (p) => p.key?.name === "tenantId" || (p.value?.type === "Identifier" && p.value.name === "tenantId")
        );
        if (!hasTenantId) {
          context.report({ node, message: `prisma.${modelName}.${op} where clause must include tenantId` });
        }
      },
    };
  },
};
```

This is a sketch; the actual implementation lives behind a well-known shape (a custom ESLint rule package). The rule fires at lint time, and CI fails if violated. Combined with the existing runtime guard in `prismaExtensions.ts`, the system has both pre-commit and runtime defense.

## Validation Architecture

> Phase 1 ships testable units (read tools + audit-row writer) before any UI. The validation strategy is unit + integration tests; no end-to-end browser tests yet (those start Phase 2).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `backend/jest.config.js` |
| Quick run command | `cd backend && npm test -- --testPathPattern=agent` |
| Full suite command | `cd backend && npm test` |

[VERIFIED: `backend/package.json:"test":"jest"`, `backend/jest.config.js`]

The existing test setup uses **module mocking** (`moduleNameMapper`) to swap `prisma`, `redis`, `auth`, `tenantScope`, and individual services with hand-written mocks under `src/__tests__/mocks/`. Phase 1 tests follow this pattern; no new mock infrastructure is needed.

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-data-agent-action | `writeAgentAction` produces a CON-audit-row-shape compliant row (proposer, approver, originalProposal, modificationsBeforeApproval, outcome, reasoning) | unit | `npm test -- agent/ledger.test.ts` | ❌ Wave 0 |
| REQ-data-agent-action | `AgentAction` table has tenantId index + Tenant relation | schema test | `npm test -- agent/schema.test.ts` | ❌ Wave 0 |
| REQ-data-agent-memory | Upsert + read-latest-by-key returns most recent value | unit | `npm test -- agent/memory.test.ts` | ❌ Wave 0 |
| REQ-data-pinned-view | Create + list-by-user returns only the calling user's pins | unit | `npm test -- agent/pinnedView.test.ts` | ❌ Wave 0 |
| REQ-data-performance-snapshot | Schema migrates without breaking existing migrations + has tenant-scoped index | schema test | `npm test -- agent/schema.test.ts` | ❌ Wave 0 |
| REQ-data-metric-event | `recordMetricEvent({event, properties})` writes a row with correct tenantId, userId, createdAt | unit | `npm test -- agent/metricEvent.test.ts` | ❌ Wave 0 |
| REQ-agent-read-tools (×11) | Each tool returns tenant-scoped data only (a row from tenant B is NOT in tenant A's result) | integration | `npm test -- agent/tools/read/<toolName>.test.ts` | ❌ Wave 0 (one per tool) |
| REQ-agent-read-tools | Each tool's Zod validator rejects malformed input | unit | covered above | ❌ Wave 0 |
| REQ-agent-read-tools | Each tool's JSON Schema is `additionalProperties: false` and Anthropic-strict-compliant | unit | `npm test -- agent/tools/strict.test.ts` | ❌ Wave 0 |
| REQ-tenant-scoped-everything | ESLint rule fires on `prisma.driver.findMany({ where: {} })` (no tenantId) | lint test | `cd backend && npx eslint src/ --rule './eslint-rules/no-prisma-without-tenant'` | ❌ Wave 0 |
| Walking Skeleton | A "hello, agent" run: `runAgent({agentId: "chat", tenantId: 'X', userMessage: 'How many active drivers?'})` calls `liveFleetStatus` and persists an `AgentRunLog` row in <2s | smoke | `npm test -- agent/walkingSkeleton.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npm test -- --testPathPattern=agent` (covers only the new agent tests)
- **Per wave merge:** `cd backend && npm test` (full suite — verifies no regression in existing 5 test files: `lateClockInPolicy`, `kpiScoring`, `pagination`, `rulesEngine`, `validation`, plus route tests)
- **Phase gate:** Full suite green + ESLint clean + `prisma migrate dev` runs without errors locally + the walking-skeleton test passes against a seeded test DB (the existing seed script in `backend/prisma/seed.ts` provides one tenant; tests can rely on `test-tenant-id` per the existing mock auth pattern).

### Wave 0 Gaps

- [ ] `backend/src/__tests__/agent/ledger.test.ts` — covers REQ-data-agent-action
- [ ] `backend/src/__tests__/agent/memory.test.ts` — covers REQ-data-agent-memory
- [ ] `backend/src/__tests__/agent/pinnedView.test.ts` — covers REQ-data-pinned-view
- [ ] `backend/src/__tests__/agent/metricEvent.test.ts` — covers REQ-data-metric-event
- [ ] `backend/src/__tests__/agent/schema.test.ts` — schema-shape assertions
- [ ] `backend/src/__tests__/agent/tools/read/{...11 files}.test.ts` — one per read tool
- [ ] `backend/src/__tests__/agent/tools/strict.test.ts` — verifies every registered tool has `strict: true` + `additionalProperties: false` (one test, iterates the registry)
- [ ] `backend/src/__tests__/agent/walkingSkeleton.test.ts` — end-to-end "hello, agent"
- [ ] `backend/eslint-rules/no-prisma-without-tenant.js` — the lint rule itself
- [ ] `backend/eslint-rules/__tests__/no-prisma-without-tenant.test.js` — meta-tests for the lint rule
- [ ] Add `npm run lint` script + `eslint-plugin-local-rules` (or equivalent) wiring so the custom rule loads
- [ ] Update `backend/package.json` test scripts: `"test:agent": "jest --testPathPattern=agent"`, `"lint:tenant": "eslint src/ --no-eslintrc --rulesdir eslint-rules --rule no-prisma-without-tenant:error"`

**Walking Skeleton (the thinnest end-to-end proof):**

```typescript
// File: backend/src/__tests__/agent/walkingSkeleton.test.ts
import { runAgent } from "../../agent/runtime";

describe("Phase 1 walking skeleton", () => {
  it("runs the chat agent end-to-end with a tenant-scoped read tool, persists AgentRunLog, in <2s", async () => {
    const start = Date.now();
    const result = await runAgent("chat", {
      tenantId: "test-tenant-id",
      triggerEvent: "test:walking-skeleton",
      userMessage: "How many drivers are active right now?",
    });
    const elapsed = Date.now() - start;

    expect(result.status).toBe("completed");
    expect(result.runId).toBeTruthy();
    expect(elapsed).toBeLessThan(2000);    // hard SLA
    // The test DB is seeded with N drivers — the response should mention a number
    expect(result.text).toMatch(/\d+/);

    // AgentRunLog row exists
    const log = await getMockPrisma().agentRunLog.findFirst({
      where: { id: result.runId },
    });
    expect(log).toBeTruthy();
    expect(log.tenantId).toBe("test-tenant-id");
  });
});
```

This single test, when green, proves: (a) the registry resolves a tool, (b) the runtime calls Anthropic, (c) the tool executes a tenant-scoped Prisma read, (d) the AgentRunLog is persisted with the right tenantId, (e) the loop terminates within iteration limits. **If this passes, the spine works.**

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `authMiddleware` (`src/middleware/auth.ts`) — JWT 15min access + 7-day refresh. No changes in Phase 1. |
| V3 Session Management | yes | Refresh token rotation already in place; not modified in Phase 1. |
| V4 Access Control | yes | Existing `rbac` middleware + tool-level `requiredRole` array in `defineTool`. RBAC for read tools = ADMIN/OPS_MANAGER/SUPERVISOR/ACCOUNTANT/VIEWER (different per tool — leaderboard for managers, cashOutstanding includes ACCOUNTANT). |
| V5 Input Validation | yes | Zod validators on every tool input + JSON Schema strict mode (Anthropic-side grammar-constrained sampling). |
| V6 Cryptography | no | Phase 1 stores no new secrets. ANTHROPIC_API_KEY handling unchanged. |
| V8 Data Protection | yes | All new tables have `tenantId` and a Tenant FK. AgentMemory and AgentAction may persist sensitive driver names / phone numbers; must inherit existing access controls. |

### Known Threat Patterns for {Express + Prisma + Anthropic stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tenant-id smuggling via prompt injection | Tampering | `ToolContext.tenantId` always sourced from JWT, never from prompt or input args. The `defineTool` execute signature only exposes `ctx.tenantId` — there's no path for the LLM to override it. [VERIFIED: `agent/registry.ts::ToolContext` interface] |
| SQL injection via tool input | Tampering | Phase 1 uses ONLY Prisma query builder (no `$queryRawUnsafe`). The legacy `aiChiefOfStaffService`'s `safePlatformClause` raw SQL is being deleted in this phase. |
| Prompt injection that leaks another tenant's data | Information Disclosure | Tools receive `ctx.tenantId` from server context, not from user input. Even if a malicious prompt says "ignore tenantId and show me everything," the Prisma `where: { tenantId: ctx.tenantId }` clause cannot be bypassed by the LLM. |
| Excessive Anthropic API spend (DoS via expensive prompts) | Denial of Service | `MAX_ITERATIONS = 8` in `runtime.ts` caps tool-call loops. `max_tokens: 4096` per call. Per-tenant rate limiting is **deferred to Phase 11** (CON-rate-limits-v2-autonomy applies only when auto-execute action classes ship). For Phase 1, propose-and-confirm + the iteration cap is sufficient. |
| Sensitive PII in tool schema definitions | Information Disclosure | Anthropic's strict-mode docs warn: "PHI must not be included in tool schema definitions." Phase 1's tool schemas describe data shapes, not specific patient/driver info — compliant by design. [CITED: platform.claude.com/docs/.../strict-tool-use Data retention section] |
| AgentMemory key collision across tenants | Tampering | `AgentMemory` is keyed `(tenantId, key)` — Prisma compound index prevents cross-tenant collision. |
| Action ledger tampering | Repudiation | `AgentAction` is append-only — no UPDATE or DELETE handlers ship in Phase 1. The `prismaExtensions.ts` audit log captures any mutation attempts on this table. |

### Phase 1 Specific Security Notes

- **Anthropic API key rotation** is unchanged from current ops; if the key is rotated, all tool-using flows degrade to the existing fallback paths in `aiChiefOfStaffService.ts` (which serves a static demo response when the key is absent). After the consolidation, the new `agent/runtime.ts` already returns `{status: "disabled"}` when the key is missing — same behavior.
- **No new outbound integrations** — Phase 1 talks only to Anthropic + the existing PostgreSQL + Redis. No webhook destinations, no Twilio, no SendGrid (those exist for `notificationChannels.ts` but no Phase 1 tool uses them).
- **No new secrets** in `.env` — Phase 1 reuses `ANTHROPIC_API_KEY` (already in `env.ts`).

## Recommended Approach

### §1. Framework choice — bare Anthropic SDK (NOT LangGraph, NOT custom orchestrator)

**Recommendation: Use the existing `@anthropic-ai/sdk` (already at v0.80.0; latest is 0.95.1 [VERIFIED: `npm view @anthropic-ai/sdk version`]) with the existing tool-use loop pattern.**

**Why:** The codebase already has a working agent runtime with 4 registered agents, a registry with RBAC + approval gates, and a scheduler. LangGraph would add a dependency and a learning curve to replace ~200 lines of working code. A custom orchestrator gains nothing over the existing implementation. The PRD also says "Use Claude Sonnet 4.6" not "use LangGraph."

**Concrete actions in Phase 1:**

- Bump `@anthropic-ai/sdk` from `^0.80.0` to `^0.95.x` (15 minor versions but Anthropic's SDK is API-stable; check changelog before bumping). Keep `MODEL = "claude-sonnet-4-6"`. Strictly optional — the existing 0.80 works fine.
- Adopt `strict: true` on every Phase 1 tool definition. The SDK supports it; the existing tools don't yet use it. ESLint rule will catch any new tool that omits `strict: true`.
- Document the choice as `DEC-agent-framework-bare-sdk` in PROJECT.md after `/gsd-discuss-phase` (suggested status: locked).

[CITED: platform.claude.com/docs/en/agents-and-tools/tool-use/* — verified canonical pattern]
[VERIFIED: `backend/src/services/agents/agentRuntime.ts:156-214` already implements this pattern]

### §2. Tool registry shape — keep the existing `defineTool(...)` Zod-driven helper

**Recommendation: KEEP the existing `defineTool` + `toolRegistry` API in `services/agents/toolRegistry.ts` (which moves to `agent/registry.ts`).** Do NOT switch to discriminated unions or a hand-rolled JSON Schema generator.

The existing helper already provides:

- **Single source of truth:** `toolRegistry.list(agentId, role)` and `toolRegistry.getAnthropicSchema(agentId, role)` are the only ways to enumerate tools. The eval harness (Phase 1 Validation) and the API surface both call the same registry.
- **Type inference:** `defineTool({inputValidator: z.object({...}), execute(ctx, input) {...}})` infers the input type via TypeScript generics, so `input.foo` is typed without casts.
- **JSON Schema for Claude:** the `inputSchema` field is the Anthropic-SDK shape (the existing pattern uses `Anthropic.Tool["input_schema"]` as the type).
- **Zod for runtime validation:** `inputValidator.safeParse(rawInput)` runs before `execute()`, so even if Anthropic's strict-mode grammar somehow let bad input through, Zod is a second line of defense.
- **RBAC + approval gating:** `requiredRole` and `requiresApproval` are first-class fields on every tool. The runtime invokes them automatically.

**Phase 1 additions to the helper:**

- A new optional `strict?: boolean` field on `ToolDefinition` (defaults to `true` going forward — Phase 1 sets it on every new tool).
- A new optional `inputExamples?: any[]` field per [CITED: docs.anthropic.com/.../define-tools "input_examples"] for Phase 1 tools with complex inputs (e.g., `courierLeaderboard` which has many parameter combinations).
- A new `descriptionMinLength` lint guard: enforce `description.length >= 200` so tool descriptions hit Anthropic's 3-4 sentence recommendation.

[VERIFIED: `backend/src/services/agents/toolRegistry.ts:1-181`]

### §3. Tenant-scoping enforcement — three layers (lint + runtime + integration test)

**Recommendation: Belt-and-braces. All three layers ship in Phase 1 because each catches a class of bugs the others miss.**

**Layer 1 — ESLint custom rule (build-time):**
- File: `backend/eslint-rules/no-prisma-without-tenant.js` (sketch in Code Examples §3 above).
- Catches static violations: `prisma.driver.findMany({ where: { name: "..." } })` with no tenantId.
- Exception list: an `// eslint-disable-next-line tenant-scope` annotation can be used in legitimate global-admin queries (e.g., the seed script). All exceptions must be justified in a comment.
- Run: `npm run lint:tenant` in CI.

**Layer 2 — `prismaExtensions.ts` runtime guard (already exists):**
- Logs `[tenant-guard] Driver.findMany called without tenantId filter` at runtime.
- In production with `TENANT_GUARD_STRICT=true`: throws.
- Add the 5 new models (`AgentAction`, `AgentMemory`, `PinnedView`, `PerformanceSnapshot`, `MetricEvent`) to `TENANT_SCOPED_MODELS` set in `prismaExtensions.ts`. [VERIFIED: line 9-41]

**Layer 3 — Integration test that seeds 2 tenants and asserts isolation:**
- One test per read tool that calls the tool with `tenantId: A` and asserts tenant-B rows are absent from the result.
- Pattern: existing `__tests__/routes/drivers.test.ts` (uses mocked Prisma; we'd want a thinner version that just hits the registry).

**Why three layers?** Static checks miss dynamic queries (`prisma[modelName].findMany`). Runtime guards miss CI-time issues. Integration tests catch the runtime case but only if the test harness is exercised. The Phase 1 success criterion 4 demands "an automated check (lint or test)" — we get both.

### §4. Prisma model design — 5 new models

All models have:
- `id: String @id @default(cuid())` (cuid matches existing modern Prisma models like `IngestRun`, `DeliverooDailyMetrics`)
- `tenantId: String` + relation to `Tenant`
- `createdAt: DateTime @default(now())` (and `updatedAt: DateTime @updatedAt` where mutable)
- `@@index([tenantId, ...])` for tenant-scoped reads

#### `AgentAction` — the audit ledger (CON-audit-row-shape)

```prisma
// File: backend/prisma/schema.prisma (append to existing schema)
//
// AgentAction is the canonical record of every fired agent action.
// Distinct from AgentRunLog (one row per LLM invocation) and PendingAgentAction
// (one row per un-resolved write proposal). This is the row the founder sees
// when answering "what did Darb do for me last week?".

model AgentAction {
  id                          String   @id @default(cuid())
  tenantId                    String
  // CON-audit-row-shape required fields:
  proposer                    String   @default("Darb")          // always "Darb" in v1
  approverId                  String                              // human user id (User.id)
  toolName                    String                              // e.g. "applyPenalty"
  originalProposal            Json                                // input as the agent first proposed
  modificationsBeforeApproval Json?                               // diff if the human edited
  outcome                     String                              // "success" | "failure" | "rolled_back"
  reasoning                   String                              // agent's natural-language justification
  // Audit trail extras (CON-audit-row-shape "audit log is the training corpus"):
  agentRunId                  String?                             // FK to AgentRunLog (optional — direct API calls won't have one)
  modelName                   String?                             // e.g. "claude-sonnet-4-6"
  promptTokens                Int      @default(0)
  completionTokens            Int      @default(0)
  latencyMs                   Int      @default(0)
  errorMessage                String?
  // Subject — what was acted upon (driver, shift, cash record, etc.):
  subjectType                 String?                             // "Driver" | "Shift" | "CashRecord" | ...
  subjectId                   String?
  // Optional rollback marker for trust-graduation v3 (Phase 12+):
  rolledBackAt                DateTime?
  rolledBackById              String?
  rollbackReason              String?
  createdAt                   DateTime @default(now())

  tenant                      Tenant   @relation(fields: [tenantId], references: [id])
  approver                    User     @relation("AgentActionApprover", fields: [approverId], references: [id])
  agentRun                    AgentRunLog? @relation(fields: [agentRunId], references: [id], onDelete: SetNull)

  @@index([tenantId, createdAt])
  @@index([tenantId, toolName, createdAt])
  @@index([tenantId, subjectType, subjectId])
  @@index([approverId])
}
```

**Migration safety against existing schema:**
- Adds back-relations to `Tenant` (line 353+) and `User` (line 437+) and `AgentRunLog` (line 2155+). These are net-new; no FK conflicts.
- The `User.agentActionsApproved` back-relation is named `"AgentActionApprover"` to avoid collision with the existing `"AlertAcknowledger"`, `"LeaveReviewer"`, etc. relation names on User.

#### `AgentMemory` — per-tenant key/value notes

```prisma
model AgentMemory {
  id          String   @id @default(cuid())
  tenantId    String
  key         String                                    // namespace+key, e.g. "owner.preferences.warning_day"
  value       Json                                      // arbitrary structured value
  confidence  Float    @default(0.5)                    // 0.0–1.0; agent's certainty about this memory
  source      String?                                   // "agent_observation" | "user_correction" | "explicit_set"
  agentRunId  String?
  createdAt   DateTime @default(now())

  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  agentRun    AgentRunLog? @relation(fields: [agentRunId], references: [id], onDelete: SetNull)

  @@index([tenantId, key, createdAt(sort: Desc)])      // latest-by-key reads
  @@index([tenantId, createdAt])
}
```

**Design decision: append-only, not upsert.** Every observation creates a row; the "current value" is `findFirst({where: {tenantId, key}, orderBy: {createdAt: 'desc'}})`. This gives us a free history for the audit-log-as-training-corpus property, at the cost of slightly more storage. The PRD's example "owner prefers Friday warnings over Thursday" should ideally show evolution if the agent changes its mind.

#### `PinnedView` — saved generated views per user (Phase 4 consumer)

```prisma
model PinnedView {
  id            String   @id @default(cuid())
  tenantId      String
  userId        String                                  // pins are per-user, NOT per-tenant
  title         String
  description   String?
  viewType      String                                  // "table" | "chart" | "kpi_strip" | "map" | "comparison"
  spec          Json                                    // generated-view spec (chart config, query, format)
  sortOrder     Int      @default(0)
  pinnedAt      DateTime @default(now())
  lastViewedAt  DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  user          User     @relation("PinnedViewOwner", fields: [userId], references: [id])

  @@index([tenantId, userId, sortOrder])
  @@index([userId, pinnedAt])
}
```

#### `PerformanceSnapshot` — daily per-driver score (replaces per-request recompute)

```prisma
// Daily snapshot of the composite score and contributing components.
// Backs the Driver File 90-day trend (REQ-driver-file Phase 3).
// Computed once per day by a BullMQ worker; tools READ from this table.

model PerformanceSnapshot {
  id                String   @id @default(cuid())
  tenantId          String
  driverId          String
  snapshotDate      DateTime                            // truncated to UTC midnight
  compositeScore    Int                                 // 0-100
  attendanceScore   Int
  deliveryScore     Int
  financialScore    Int
  equipmentScore    Int
  platformScore     Int
  trend             ScoreTrend                          // existing enum (UP | DOWN | STABLE)
  // Contributing factors snapshot (for "explain this score" queries):
  ordersCount       Int      @default(0)
  shiftsCount       Int      @default(0)
  violationsCount   Int      @default(0)
  cashOutstandingKd Decimal? @db.Decimal(10, 3)
  breakdown         Json?                               // detailed sub-scores (mirror of AiScore.breakdown)
  computedAt        DateTime @default(now())            // when the worker wrote this row

  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  driver            Driver   @relation(fields: [driverId], references: [id])

  @@unique([tenantId, driverId, snapshotDate])
  @@index([tenantId, snapshotDate])
  @@index([driverId, snapshotDate])                     // 90-day trend query path
}
```

**Relationship to `AiScore` (existing):** `AiScore` is the *current* score table (one row per driver per "today"). `PerformanceSnapshot` is the *historical trend* table. They overlap in fields but serve different access patterns. **Phase 1 ships the schema only** — the daily writer worker can either (a) extend the existing `performanceTierWorker.ts` to also write `PerformanceSnapshot`, or (b) be a Phase 3 task. **Recommend option (a) in a Phase 1 wave** so Driver File (Phase 3) just queries an already-populated table. See Open Question §3.

#### `MetricEvent` — lightweight in-product analytics

```prisma
model MetricEvent {
  id          String   @id @default(cuid())
  tenantId    String
  userId      String?                                   // null = system event
  event       String                                    // "decision.approved" | "chat.message_sent" | "tool.called" | ...
  properties  Json?                                     // event-specific payload
  sessionId   String?                                   // for "session" stitching across events
  createdAt   DateTime @default(now())

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  user        User?    @relation("MetricEventActor", fields: [userId], references: [id])

  @@index([tenantId, event, createdAt])
  @@index([tenantId, createdAt])
  @@index([userId, createdAt])
}
```

**Design decision: keep it lean.** Phase 1 only adds the table + a `recordMetricEvent({event, properties})` helper. Querying metrics is Phase 11+ when "the agent sees itself" matters operationally. The DECISION-add-metric-events name doesn't say "and a dashboard for them" — that's intentional.

### §5. The 11 read tools — data sources + reuse strategy

| Tool | Primary data source | Reuses existing service? | Output shape (excerpt) |
|------|---------------------|---------------------------|------------------------|
| `revenueByDay` | `OrderLog.groupBy({by: ['date'], _sum: {orderCount, totalAmount}})` | No (existing legacy uses `$queryRawUnsafe`; rewrite with Prisma) | `[{day, completedOrders, grossRevenueKd, ...}]` |
| `revenueByPlatform` | `OrderLog.groupBy({by: ['platform'], _sum: {orderCount, totalAmount}})` | No | `[{platform, orders, revenueKd}]` |
| `revenueByZone` | `OrderLog` joined to `Driver.zone` (or shift's `deliveryArea`) | No | `[{zone, orders, revenueKd, drivers}]` |
| `courierLeaderboard` | `OrderLog` aggregated per driver, sorted by metric. **Wraps existing legacy logic** but uses Prisma. | Partial — pattern from legacy `aiChiefOfStaffService::courierLeaderboard` | `[{driverId, driverName, metric, value, rank}]` |
| `courierProfile` | `Driver.findFirst` + `aiScore` + `attendance` + `cashOutstanding` aggregations. | Calls `services/aiScoringService.AiScoringService` (read-only) | `{driver, score, latestShifts, cashHistory, violations}` |
| `violationsList` | `Violation.findMany({where: {tenantId, ...filters}})`. | Closely mirrors existing `agents/tools/triage.ts::queryOpenViolations`; can directly reuse with a wrapper | `[{violationId, type, platform, driverId, driverName, time, status}]` |
| `cashOutstanding` | `CashRecord.findMany({where: {status: {in: [PENDING, PARTIALLY_PAID]}}})`. CON-cash-platform-coverage: filter out Americana drivers. | Uses pattern from `agents/tools/triage.ts::queryCashMismatches` | `[{cashRecordId, driver, salesKd, collectedKd, pendingKd, ageDays, status}]` |
| `attendanceForPeriod` | `AttendanceRecord.findMany` + count by status. | Pattern from `kpiComputeService.ts` | `[{driverId, driverName, present, late, absent, lateMinutesAvg}]` |
| `liveFleetStatus` | `CourierOnlineSession.findMany({where: {isOnline: true}})` + GPS-stale calculation (lastGpsAt > 10min ago). | Uses pattern from `agents/tools/narrator.ts::queryShiftCoverage` | `{totalOnline, byZone, byPlatform, gpsStaleCount, scheduledNotOnlineCount}` |
| `gpsTrack` | `LocationLog.findMany({where: {driverId, capturedAt: between}, orderBy: {capturedAt: 'asc'}, take: 500})` | No (new) | `[{lat, lng, capturedAt, accuracy, speed}]` |
| `searchOrders` | `OrderLog.findMany({where: {tenantId, ...filters}})` with text/numeric/range filters. | No (new but trivial) | `[{orderId, driverId, platform, status, customerArea, totalKd, time}]` |

**Implementation note:** the reuse pattern is to call the existing aggregation services directly from the tool's `execute()` handler — NOT to copy logic. Example: `courierProfile` calls `AiScoringService.scoreAllDrivers(tenantId)` and filters to one driver, OR (better, faster) reads from the existing `AiScore` table directly.

**Sizing:** each tool is roughly 30-80 lines of TypeScript (definition + execute). 11 tools = ~600 lines of code, distributed across 11 files. Plus 11 unit/integration tests = another ~600 lines. **This is the bulk of Phase 1's net-new code.**

### §6. Existing `aiChiefOfStaffService` inventory — what survives, what's deleted

| Element | Disposition | Why |
|---------|-------------|-----|
| `TOOLS` array (6 tools) | **DELETE** — replaced by registry | Inline tool definitions don't fit the registry pattern. |
| `revenueByDay` execTool branch | **DELETE** — rewrite as `agent/tools/read/revenueByDay.ts` using Prisma `groupBy` (no raw SQL). | Cleaner code; removes `safePlatformClause` raw-SQL escape. |
| `courierLeaderboard` execTool branch | **DELETE** — rewrite as `agent/tools/read/courierLeaderboard.ts` | Same reason. |
| `anomalies` tool | **DELETE** — overlaps with existing `narrator/triage` agent tools. | Consolidation. |
| `areaDemandForecast`, `courierSupplyGap` tools | **DELETE** — those are Phase 11/12 forecast tools. | Out of Phase 1 scope. |
| `violationSummary` tool | **DELETE** — replaced by `violationsList` (broader). | One canonical tool. |
| `AiChiefOfStaffService.run` method | **DELETE** — replaced by `runAgent("chat" or new "cos" agent, ...)` | The runtime pattern in `agent/runtime.ts` already exists. |
| `dailyBriefing` convenience method | **MIGRATE** — becomes `runAgent("narrator", {triggerEvent: "daily_briefing"})`. The narrator agent already handles hourly briefings; the daily one is a wrapper. | Single agent runtime. |
| Bilingual EN/AR briefing prompt content | **MIGRATE** to `agent/prompts/narrator.md` | Prompt as data, not code. |
| `routes/aiChiefOfStaff.ts` (3 endpoints) | **REFACTOR** — the route stays mounted at `/api/ai/cos` for backward compat (existing frontend may call it), but its handlers call `runAgent` instead. | Avoid breaking external callers during Phase 1. |
| `parseFinal` (EN/AR splitter) | **MIGRATE** to a small utility in `agent/util/bilingual.ts` if needed Phase 9. Otherwise delete. | YAGNI. |
| `fallbackResponse` (no-API-key static text) | **DELETE** — `agent/runtime.ts` already handles this with `{status: "disabled"}`. | One pattern. |

**Net effect:** `services/aiChiefOfStaffService.ts` (424 lines) is **deleted entirely** at the end of Phase 1. The route file `routes/aiChiefOfStaff.ts` (46 lines) is **refactored** to call the registry-backed runtime. The legacy `services/aiChatService.ts` (444 lines) follows the same pattern: tools migrate into the registry, the service is deleted, callers use `runAgent("chat", ...)`.

This is the "promote agent to spine" deliverable in concrete file-by-file terms.

### §7. What ships, in dependency order (5 waves)

This is a sketch — the planner's job is to break this into actual tasks. But the dependency graph is:

1. **Wave 0 (validation infra)** — Set up the test scaffolding, ESLint rule, walking-skeleton test target. Zero feature code. Time: 1 day.
2. **Wave 1 (data plumbing)** — Add the 5 new Prisma models in one migration. Add Tenant + User back-relations. Run `prisma generate`. Add to `prismaExtensions.ts::TENANT_SCOPED_MODELS`. Add `agent/ledger.ts` (writer for `AgentAction`). Tests for each model's writer. Time: 1-2 days.
3. **Wave 2 (relocation)** — Move `services/agents/` -> `agent/`. Update all imports (`server.ts`, route files). Re-export shim from old path for one release. Existing tests pass. Time: 0.5 day.
4. **Wave 3 (read tools)** — Add the 11 new tool files under `agent/tools/read/`. Register them. One test per tool (assert tenant isolation + Zod validation). Time: 3-4 days (the longest wave).
5. **Wave 4 (consolidation + cleanup)** — Refactor `routes/aiChiefOfStaff.ts` to call `runAgent`. Delete `services/aiChiefOfStaffService.ts`. Delete `services/aiChatService.ts` (if no external caller). Add `strict: true` to all tools. Run walking-skeleton smoke test. Time: 1 day.

**Total Phase 1 estimate: 6.5-8.5 days of effort for 1 engineer + Claude Code.** This fits within the roadmap's implicit "Phase 1 is a small, foundational phase" framing — but it IS substantial because it touches 5+ new tables, 11 new tools, and a major directory reorganization.

## Open Questions

1. **Is `AgentAction` distinct from `AgentRunLog`, or should we extend `AgentRunLog`?**
   - What we know: PRD's CON-audit-row-shape calls for fields (proposer/approver/originalProposal/modificationsBeforeApproval/outcome/reasoning) that aren't on the existing `AgentRunLog`. The existing `AgentRunLog` has tenant/agent/triggerEvent/model/tokens/status — operational, not audit-shaped.
   - What's unclear: whether the planner wants two tables (recommended above) or one fat table. Adding fields to `AgentRunLog` is possible but conflates "agent ran" with "human approved an action."
   - Recommendation: ship as a SEPARATE `AgentAction` table. The semantics are different (one-row-per-LLM-run vs. one-row-per-fired-action). Phase 8 will write to it on every confirm-card approval; Phase 1 only ships the writer + the schema.

2. **Where does `searchOrders` get its data — `OrderLog` or `Order`?**
   - What we know: the codebase has `OrderLog` (driver-scoped daily aggregate, 30+ million rows scale) but the legacy `aiChiefOfStaffService` queries an `"Order"` table that doesn't exist in `schema.prisma`. [VERIFIED: `grep -n "model Order " backend/prisma/schema.prisma` returns no match]
   - What's unclear: whether the v2 schema needs a `model Order` (one row per individual order) or whether `OrderLog` (aggregated per driver per day) is sufficient.
   - Recommendation: Phase 1's `searchOrders` reads from `OrderLog` for now. If Phase 2 or Phase 3 needs per-order detail (e.g., for the Order Flow Timeline mentioned in CLAUDE.md feature 3), a `model Order` migration becomes a prerequisite for that phase. **Flag for `/gsd-discuss-phase`.**

3. **Does the `PerformanceSnapshot` daily writer ship in Phase 1 or Phase 3?**
   - What we know: REQ-data-performance-snapshot is in Phase 1. But Phase 3 (Driver File) is the consumer.
   - What's unclear: if Phase 1 only ships the schema, the table is empty when Phase 3 starts and the 90-day trend (success criterion 3 of Phase 3) renders blank.
   - Recommendation: Phase 1 ships **schema + writer worker** so the table backfills from Phase 1 onward. The writer is a thin extension of the existing `performanceTierWorker.ts` BullMQ worker (which already runs daily). Estimated effort: half a day. Without this, Phase 3 inherits the work and slips.

4. **Tenant-scope ESLint rule — custom or pre-existing plugin?**
   - What we know: there's no pre-existing ESLint plugin that knows about Darb's `TENANT_SCOPED_MODELS` set. Custom rule is straightforward.
   - What's unclear: whether the project already uses ESLint at all. The repo has `npm test` but no `npm run lint` script. [VERIFIED: `grep -n '"lint"' backend/package.json` returns nothing]
   - Recommendation: Phase 1 introduces ESLint with a minimal config + the custom rule. This is cheap (one-day setup) and pays for itself across all future phases. If the founder objects to "more tooling," fall back to a Jest-based check that grep-walks the source tree for `prisma\.\w+\.find` patterns.

5. **Should the `chat` agent (registered in `services/agents/index.ts:51-61`) survive into Phase 4 unchanged, or be re-architected?**
   - What we know: `chat` is already registered with `triggers: []` (reactive only). Phase 4 builds the chat surface.
   - What's unclear: whether Phase 4 needs structural changes to the `chat` agent (e.g., streaming, websocket).
   - Recommendation: Phase 1 keeps the `chat` agent as-is. Phase 4 adds streaming (separate concern). No Phase 1 work needed.

6. **Forecast tools naming — `forecastDemand` and `forecastSupplyGap` vs. existing `areaDemandForecast` and `courierSupplyGap`?**
   - What we know: the existing legacy service uses `areaDemandForecast` and `courierSupplyGap`. The PRD names them `forecastDemand` and `forecastSupplyGap`.
   - What's unclear: the canonical name.
   - Recommendation: **out of Phase 1 scope** — they ship in Phase 11/12. Use the PRD names (`forecastDemand`, `forecastSupplyGap`) when those phases run.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All backend code | ✓ (assumed — repo uses tsx 4.21) | ≥18 | — |
| PostgreSQL 15 | Prisma migrations + new models | ✓ (existing 40+ models indicate it works) | 15 | — |
| Redis 7 | Existing pubsub (eventBus.ts) — Phase 1 doesn't introduce new Redis usage | ✓ (existing) | 7 | In-process EventEmitter fallback exists in `eventBus.ts` |
| `@anthropic-ai/sdk` | Tool-use loop | ✓ | 0.80.0 (latest is 0.95.1) | None — agent runtime returns `disabled` if `ANTHROPIC_API_KEY` missing |
| `zod` | Tool input validation | ✓ | 3.23.8 (latest is 4.4.3 but we don't need v4 features) | — |
| `@prisma/client` | All DB access | ✓ | 5.22.0 (latest is 7.8.0 but pinned per CON-stack-backend-pinned) | — |
| `jest` + `ts-jest` | Test runner | ✓ | 30.3.0 / 29.4.9 | — |
| ESLint | Tenant-scope custom rule (NEW in Phase 1) | ✗ | — | Jest-based grep test as a fallback (Open Question §4) |
| `node-cron` | Cron triggers (existing in scheduler) | ✓ | 4.2.1 | — |
| `ANTHROPIC_API_KEY` env var | Live agent runs | ✓ in dev/staging (assumed); production set in Vercel | — | Walking-skeleton test passes if absent (returns `disabled` status) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** ESLint — fall back to Jest-based grep check if introducing ESLint stalls.

## Sources

### Primary (HIGH confidence)

- `backend/src/services/agents/agentRuntime.ts` (existing in-codebase, 256 lines) — verified working agentic loop
- `backend/src/services/agents/toolRegistry.ts` (existing, 181 lines) — verified working registry pattern
- `backend/src/services/agents/tools/triage.ts` (existing, 443 lines) — verified `defineTool` pattern with 8 tools
- `backend/src/services/agents/tools/reconciliation.ts`, `narrator.ts` — verified existing agent tools
- `backend/src/services/aiChiefOfStaffService.ts` (existing, 424 lines) — verified legacy code being deleted
- `backend/src/config/prismaExtensions.ts` (existing, 177 lines) — verified runtime tenant guard
- `backend/src/middleware/tenantScope.ts` (existing, 19 lines) — verified AsyncLocalStorage pattern
- `backend/prisma/schema.prisma` (existing, 2222 lines) — verified existing 40+ models, no name collisions for new ones
- `backend/jest.config.js` + `backend/src/__tests__/` — verified test infrastructure with mocks
- `backend/package.json` — verified pinned versions: `@anthropic-ai/sdk@^0.80.0`, `@prisma/client@^5.22.0`, `zod@^3.23.8`, `jest@^30.3.0`
- [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/docs/build-with-claude/tool-use/overview) — canonical pattern, model ids, pricing
- [Anthropic Define Tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) — best practices, descriptions, input_examples, tool_choice
- [Anthropic Handle Tool Calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) — `tool_use_id`, `is_error`, ordering rules
- [Anthropic Strict Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) — `strict: true` + `additionalProperties: false`, HIPAA caveats
- `.planning/PROJECT.md` (155 lines, includes 22 proposed decisions and constraints)
- `.planning/REQUIREMENTS.md` (183 lines, includes traceability table)
- `.planning/ROADMAP.md` (212 lines, includes Phase 1 success criteria)
- `.planning/intel/{decisions,constraints,context}.md` (full PRD-derived corpus)
- `PRD_Darb_v2.md` sections 6 (The Agent), 7 (Data Architecture), 8 (Tech Stack)
- `CLAUDE.md` (project conventions)
- `npm view @anthropic-ai/sdk version` returned `0.95.1` (latest); `npm view zod version` returned `4.4.3`; `npm view @prisma/client version` returned `7.8.0`; `npm view express version` returned `5.2.1`

### Secondary (MEDIUM confidence)

- Migration ordering — verified by inspection of `backend/prisma/migrations/` directory; latest is `20260503000000_remove_darb_points_and_supervisor_targets`. Adding a new migration `20260509_*_phase1_agent_models` will not conflict.

### Tertiary (LOW confidence)

- The exact recommendation for `MetricEvent` granularity (per-event row vs. batched). Phase 1 ships the lean per-event row design; if scale becomes an issue (e.g., >1M events/day per tenant) a partition-by-day strategy can be added. **No production data to validate this yet — flagged as ASSUMED.**

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The existing `services/agents/` runtime can be relocated to `agent/` with no functional changes (just path renames and import updates). | Recommended Approach §1, §6 | Low — relocation is mechanical; tests catch any miss. |
| A2 | The 11 PRD-named tools all map to existing Prisma models (no schema gaps for read-only purposes). | Recommended Approach §5 | Medium — `searchOrders` may need a `model Order` (Open Question §2). Other 10 tools are clearly mappable. |
| A3 | Adopting `strict: true` on all Phase 1 tools will not regress on Anthropic's grammar-constrained sampling for any model in the Sonnet 4.x line. | Recommended Approach §1, Pattern 1 | Low — Anthropic docs explicitly support strict mode for Claude Sonnet 4.x. [CITED] |
| A4 | A custom ESLint rule covering `prisma.<scopedModel>.<op>` usage is the most maintainable static check; existing project doesn't already use ESLint. | Recommended Approach §3, Open Question §4 | Medium — if the project has an ESLint config not surfaced in `package.json`, adding rules is even cheaper; if introducing ESLint hits friction, fall back to Jest grep check. |
| A5 | `PerformanceSnapshot` daily writer fits cleanly into the existing `performanceTierWorker.ts` BullMQ worker. | Open Question §3 | Low — the existing worker already runs daily and computes per-driver scores. Extending it is one additional `prisma.performanceSnapshot.create` per driver per day. |
| A6 | Bumping `@anthropic-ai/sdk` from 0.80.0 to 0.95.x is API-stable and not required for Phase 1. | Recommended Approach §1 | Low — the existing 0.80.0 works; bump can be a separate decision. |
| A7 | The `aiChatService.ts` deletion has no external caller beyond the existing `routes/ai.ts` (or similar). | Pitfall §7 | Medium — must run grep audit during execution; if there's a frontend caller, refactor before delete. |
| A8 | `MetricEvent` per-event row design is sufficient at Phase 1 fleet sizes (8-12 fleets, 80-300 couriers each). | Recommended Approach §4 (MetricEvent) | Low — tens of events per second per tenant at most; PostgreSQL handles this trivially. |
| A9 | `claude-sonnet-4-6` model id remains current and supported through Phase 1 execution timeframe (May 2026 per `currentDate`). | Recommended Approach §1 | Low — Anthropic docs from this session list it as current; CON-stack-agent-runtime pins this name. |
| A10 | The roadmap's "9 Phase-1 read tools" is a typo / off-by-N error vs. REQ-agent-read-tools' 11 names; **the 11 names are authoritative.** | Phase Requirements + Anti-Patterns section | Low — orchestrator hand-off explicitly lists 11; ROADMAP.md success criterion 2 enumerates 11 names too despite saying "9". |

**This list is not empty:** the planner and `/gsd-discuss-phase` should walk through it. Most items are low-risk and can be locked silently; A2, A4, A7 deserve a moment of confirmation.

## Risks & Pitfalls

(Repeated from Common Pitfalls in summary form so the planner has a one-glance risk register.)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Misreading `AgentRunLog` as `AgentAction` and skipping the new table | HIGH | Pitfall §1 — explicit table-distinction matrix; planner verifies migration includes `AgentAction` |
| R2 | Tenant-id leakage via prompt injection (LLM tries to override) | HIGH | `ToolContext.tenantId` is server-set; LLM has no path to override. Verified by integration test seeded with 2 tenants. |
| R3 | Breaking the existing `agentScheduler` cron during relocation | MEDIUM | Wave 2 keeps re-export shim from old path; existing tests + walking-skeleton catch regressions |
| R4 | Forgetting `Tenant.relations` back-relation block updates for new models | MEDIUM | Pitfall §6 — checklist item; Prisma error catches at migrate time |
| R5 | `searchOrders` discovers we need a `model Order` we don't have | MEDIUM | Open Question §2 — flag for `/gsd-discuss-phase`; fall back to `OrderLog` aggregations or add the model |
| R6 | ESLint custom rule introduces friction the team rejects | LOW | Open Question §4 — Jest grep check is a viable fallback |
| R7 | Tool descriptions too short, Claude misuses tools | MEDIUM | ESLint rule enforces `description.length >= 200`; QA review of all 11 read tools |
| R8 | Anthropic SDK version drift (0.80 → 0.95) breaks something | LOW | Recommended Approach §1 — version bump is OPTIONAL for Phase 1; defer if uncertain |
| R9 | Phase 1 sprawls into Phase 2 work (Decisions UI, monitoring loop) | MEDIUM | Pitfall §5 — explicit Out-of-Scope list in User Constraints; lint rule "no `frontend/` files in Phase 1 PR" |
| R10 | Migration ordering issue with the 5 new models | LOW | Pitfall §6 — single migration, named relations, `prisma migrate dev` smoke test |
| R11 | `aiChatService.ts` deletion breaks an undiscovered caller | MEDIUM | Pitfall §7 — grep audit before delete |
| R12 | `PerformanceSnapshot` empty when Phase 3 starts (Driver File) | MEDIUM | Open Question §3 — recommend Phase 1 ships the writer too, half-day extension |

## Out of Scope

Explicitly **NOT in Phase 1**, even though they touch the same module / tables:

- **Action tools** (the 10 tools in REQ-agent-action-tools). Phase 8.
- **Continuous-monitoring loop** that fills the Decisions inbox. Phase 2.
- **Decisions UI** (`/decisions` route, proposal cards, Approve/Modify/Dismiss buttons). Phase 2.
- **Pricing / billing** (KD 2/courier/month). Phase 2.
- **White-glove onboarding flow.** Phase 2.
- **Driver File UI** (`/drivers/[id]` page, 8 sections). Phase 3.
- **Chat surface** (`⌘K`, generative UI, conversation history, Pin to Home button). Phase 4.
- **WebSocket** transport (chat token streaming, floor map subscriptions). Phase 4.
- **Mobile GPS beacon** (continuous background GPS, active-platform detection). Phase 5.
- **Ingest adapter layer** refactor. Phase 6.
- **Floor live map** (`/floor`, pill counters, dot colours, Ping (WhatsApp) action). Phase 7.
- **Finance workbench** (Cash, Payroll, Invoices, Expenses & P&L). Phase 8.
- **Mobile agent inbox + bilingual outbound** (Arabic translations). Phase 9.
- **Operations per-platform sub-pages + HR module + hide-behind-flag.** Phase 10.
- **Scheduled briefings** (daily/weekly digests). Phase 11.
- **Trust graduation v2** (auto-execute action classes, rate limits, per-tenant caps). Phase 11.
- **Mature `AgentMemory` learning** (the table ships in Phase 1; sophisticated learning patterns ship in Phase 11).
- **Partner-API conversations** with Keeta + Talabat. Phase 11.
- **`AgentRule` model + standing rules UI.** Phase 12.
- **Forecasting tools** (`forecastDemand`, `forecastSupplyGap`). Phase 11/12.
- **Anything in `frontend/`.** Phase 1 ships zero frontend work.
- **Anything in `mobile/`.** Phase 1 ships zero mobile work.
- **New auth flows or RBAC roles.** Existing 5 roles (ADMIN, OPS_MANAGER, SUPERVISOR, ACCOUNTANT, VIEWER) are sufficient.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — codebase is the source of truth; library versions verified via `npm view`; Anthropic SDK behaviour verified via official docs.
- Architecture (registry, runtime, tenant-scope, Prisma model design): **HIGH** — pattern is already implemented in the codebase; new models follow established conventions exactly.
- Pitfalls: **HIGH** — drawn from inspection of the 444-line `aiChatService.ts` and 424-line `aiChiefOfStaffService.ts`; the deletion / consolidation risks are concrete.
- Phase 1 → Phase 8 / 11 / 12 boundary: **MEDIUM** — relies on roadmap alignment; the ROADMAP.md text is consistent with REQ-IDs but has the "9 vs 11 read tools" wording inconsistency (treated as 11 per the orchestrator's hand-off).
- Validation Architecture: **HIGH** — Jest infra exists; walking-skeleton test sketch is concrete and runnable.
- The tenant-scope automated check choice (ESLint vs. Jest grep): **MEDIUM** — recommended ESLint, fallback exists.

**Research date:** 2026-05-09

**Valid until:** 2026-06-09 (30 days). After that, re-verify Anthropic SDK version pinning, model id (`claude-sonnet-4-6`) availability, and Prisma migration compatibility against the live `schema.prisma`.
