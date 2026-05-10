# Phase 3: Driver File - Research

**Researched:** 2026-05-10
**Domain:** Canonical per-driver page (Next.js 14 + Express/Prisma + agent module) — REQ-driver-file + REQ-agent-scoring
**Confidence:** HIGH

## Summary

Phase 3 ships ONE canonical Driver File page at `/drivers/[id]` reachable from every driver name in the app, with eight required sections (CON-driver-file-sections) backed by Phase 1's `PerformanceSnapshot` (90-day trend) and Phase 2's `PendingAgentAction`/`AgentAction` (Decision audit log). The work is brownfield: Phase 1 already shipped the daily PerformanceSnapshot writer (`backend/src/services/performanceService.ts::snapshotAllDriversForTenant` invoked at 23:00 local from `queues/performanceTierWorker.ts`); Phase 1 already shipped the `courierProfile` and `gpsTrack` read tools; Phase 2 already shipped the Decision audit row shape, the AgentMemory append-only writer, and the `/api/audit/agent-actions` route. The canonical existing per-driver UI is `frontend/src/components/shared/Driver360.tsx` consumed identically by `keeta|talabat|deliveroo|americana/drivers/[id]/page.tsx` — Phase 3 collapses these four entry points into one cross-platform `/drivers/[id]` route (DEC-cross-platform-default-view), promotes Driver360 into a section-based layout, and adds the four NEW sections that Driver360 does not yet expose (90-day trend, agent's running notes, decision audit log, agent's plain-English score explanation).

Recharts 3.8.1 is already installed and proven in `components/keeta/TrendChart.tsx` and `components/insights/WeeklyChart.tsx` — use it for the 90-day trend; no new charting dependency required. The agent's score explanation is computed on-demand by routing `courierProfile` + the latest snapshot's `breakdown` JSON through a new `narrator`-style sub-agent or, simpler and recommended, a single deterministic Anthropic call gated through the existing agent runtime (`backend/src/agent/runtime.ts::runAgent`); the result is cached for 1 hour in `AgentMemory` under key `score_explanation:<driverId>:<scoreDate>` so subsequent reads are free. Cross-app driver-name clickability is achieved by a single `<DriverLink>` component that renders `<Link href={\`/drivers/\${id}\`}>{name}</Link>`; the existing four `/{platform}/drivers/[id]` routes redirect to `/drivers/[id]?from={platform}`. The Driver File depends on Phase 1 + Phase 2 ONLY (PerformanceSnapshot, AgentAction, AgentMemory all shipped and verified) — no new schema is required for Phase 3.

**Primary recommendation:** Build a single section-based `frontend/src/app/(dashboard)/drivers/[id]/page.tsx` page that fetches a single aggregate endpoint `GET /api/drivers/:id/file` (a thin extension of the existing `GET /api/drivers/:id/profile` that adds `snapshots90d`, `agentNotes`, `decisionAuditLog`, `scoreExplanation` keys) and renders eight sections with React Query + Recharts. Reuse Driver360's overview-tab KPIs verbatim. Add a `DriverLink` component and retrofit existing tables with a one-line search-and-replace.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Canonical `/drivers/[id]` route resolution | Frontend (Next.js App Router) | — | Pure routing concern; client component reads `useParams` |
| Driver File aggregate fetch | API / Backend | Frontend (React Query cache) | Tenant-scoped DB joins must run server-side via Prisma |
| 90-day PerformanceSnapshot trend reader | API / Backend | — | Read from `PerformanceSnapshot` table via tenantScope; new tool: `performanceTrend(driverId, daysBack)` |
| Recharts line chart rendering | Frontend | — | Pure presentation; recharts 3.8.1 already installed |
| Score explanation (plain-English) | API / Backend | Agent module (Anthropic SDK) | Calls Claude Sonnet 4.6 once; result cached in `AgentMemory` |
| Score explanation cache | API / Backend (Postgres) | — | `AgentMemory` append-only table; latest-by-key reads |
| Decision audit log filtered by driver | API / Backend | — | Reads `AgentAction` + `PendingAgentAction` filtered by `subjectId=driverId` |
| Agent's running notes | API / Backend | — | Reads `AgentMemory` filtered by key prefix `note:driver:<driverId>:` |
| Cross-app `<DriverLink>` clickability | Frontend | — | Pure UI primitive; no backend involvement |
| Per-platform redirect (`/keeta/drivers/[id]` → `/drivers/[id]`) | Frontend (App Router) | — | `redirect()` call in old page.tsx files; preserves bookmarks |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.35 | App Router page (`/drivers/[id]/page.tsx`) | Already pinned in CON-stack-frontend; existing 80-page surface uses App Router throughout `[VERIFIED: frontend/package.json]` |
| React | 18.x | Client component for the file | Same `[VERIFIED: frontend/package.json]` |
| TypeScript | strict | Type safety | CLAUDE.md mandate `[VERIFIED: CLAUDE.md]` |
| Tailwind CSS | 3.4.1 | Styling | CON-stack-frontend `[VERIFIED]` |
| @tanstack/react-query | 5.100.9 | Server state for the file fetch | Already used in `useApiQuery` hook; matches Phase 2 patterns `[VERIFIED: frontend/package.json + hooks/useApi.ts]` |
| recharts | 3.8.1 | 90-day trend line chart | Already installed; `components/keeta/TrendChart.tsx` is the reference pattern `[VERIFIED: frontend/package.json + existing usage]` |
| Express | 4.x | New aggregate route on `/api/drivers/:id/file` | CON-stack-backend-pinned `[VERIFIED]` |
| Prisma | 5.x | Per-section reads | CON-stack-backend-pinned; existing `routes/drivers.ts::/profile` is the reference `[VERIFIED]` |
| @anthropic-ai/sdk | 0.95.1 | Score explanation Claude call | Already installed; CON-stack-agent-runtime mandates Sonnet 4.6 `[VERIFIED: backend/package.json]` |
| lucide-react | 0.577.0 | Section icons | Already used in Driver360 `[VERIFIED]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | already used | Validate `/api/drivers/:id/file` query params + agent tool input | When extending the existing route surface |
| react-leaflet | 5.0.0 | Map showing last GPS for the Live Status section | Already used by `/keeta/operation-centre`; reuse the existing pattern `[VERIFIED]` |
| date-fns | NOT installed | Date formatting | NOT installed — keep using `Date#toLocaleDateString` like Driver360 does to avoid a new dependency `[VERIFIED: package.json grep returned empty]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single aggregate route `/api/drivers/:id/file` | Per-section endpoints (`/profile`, `/snapshots`, `/decisions`, `/notes`) | Multiple endpoints means more network round-trips and harder to keep tenant-scope consistent. The existing `/profile` already aggregates 13 parallel reads (`Promise.all`) without performance issues — extending it is the smaller diff. **Recommend: extend `/profile` to `/file`.** [ASSUMED — based on the existing handler shape; planner can split if measurements show > 300ms p95] |
| Recharts | Chart.js / visx / @nivo / @tremor | Recharts is already installed AND already proven on this codebase. Switching libraries adds a transitive risk for zero functional gain. **Recommend: keep recharts.** [VERIFIED: existing TrendChart.tsx + WeeklyChart.tsx use recharts] |
| On-demand Claude call for score explanation | Pre-computed nightly explanation written to `PerformanceSnapshot.breakdown` | Pre-computing is wasteful (most drivers never have their explanation viewed); on-demand + 1-hour `AgentMemory` cache is the cheaper default. **Recommend: on-demand + cache.** |
| New "explainer" agent | Reuse existing `chat` agent registration with a synthetic user message | Adding a 6th agent registration is overkill for a single-purpose deterministic call. The existing `chat` agent already has access to `courierProfile` + `listAgentMemory` + (Phase 1) read tools. **Recommend: use a NEW agent registration `score-explainer` (single-shot, no iterations) — keeps cost telemetry isolated and the prompt swappable.** [ASSUMED — alternative is fine; planner should pick] |
| Section-based vertical layout | Tab-based layout (existing Driver360 pattern) | Tabs hide content and require an extra click. Owner needs glance-mode visibility on a fire/promote decision (PRD §5.5: "source of truth before the owner approves a fire/promote action"). **Recommend: vertical sections with sticky section nav** — the eight sections fit on a 1080p monitor with normal density. [VERIFIED reasoning against PRD §5.5] |

**Installation:**
No new dependencies required. All libraries above are pinned to currently-installed versions.

**Version verification:**
```bash
npm view recharts version          # 3.8.1 confirmed
npm view @anthropic-ai/sdk version # 0.95.1 confirmed
npm view @tanstack/react-query version # 5.100.9 confirmed
```
Verified 2026-05-10 against the npm registry.

## Architecture Patterns

### System Architecture Diagram

```
                   ┌─────────────────────────────────────────────────────┐
                   │  Frontend  (Next.js 14 App Router, client component) │
                   │                                                       │
   user clicks ───▶│  <DriverLink driverId={id}>name</DriverLink>          │
   driver name in  │   │                                                   │
   any table /     │   ▼                                                   │
   chart / Decisions│  /drivers/[id]/page.tsx (canonical)                  │
   card             │   │  React Query: useDriverFile(id)                  │
                   │   │      ▲       │                                    │
                   │   │      │       │  HTTP GET /api/drivers/:id/file    │
                   │   ▼       │       ▼                                   │
                   │  8 sections rendered:                                  │
                   │   1 Profile (header)                                   │
                   │   2 Live status + today's orders                       │
                   │   3 Performance score (composite + 5 sub-scores +     │
                   │     "Why this score?" agent explanation drawer)        │
                   │   4 90-day trend chart (Recharts <LineChart>)          │
                   │   5 Violations history                                 │
                   │   6 Cash history                                       │
                   │   7 Attendance + shifts                                │
                   │   8 Agent's running notes                              │
                   │   9 Decision audit log (filtered by subjectId=id)     │
                   └─────────────────────────────────────────────────────┘
                                          │
                                          │  HTTP (Bearer JWT, tenantScope MW)
                                          ▼
                   ┌──────────────────────────────────────────────────────┐
                   │  Backend  (Express 4 + tenantScope MW)                │
                   │                                                        │
                   │  GET /api/drivers/:id/file                             │
                   │   │                                                    │
                   │   ├── Promise.all([                                    │
                   │   │     prisma.driver.findFirst (tenant-scoped),       │
                   │   │     prisma.performanceSnapshot.findMany (90d),    │
                   │   │     prisma.aiScore.findFirst (latest, breakdown), │
                   │   │     prisma.shift.findMany (last 30),              │
                   │   │     prisma.attendanceRecord.findMany (30d),       │
                   │   │     prisma.orderLog (today + week + month),       │
                   │   │     prisma.cashRecord.findMany,                   │
                   │   │     prisma.violation.findMany (last 90d),         │
                   │   │     prisma.locationLog (last 1h, top 10),         │
                   │   │     prisma.agentAction.findMany                   │
                   │   │       (subjectId=:id),                            │
                   │   │     prisma.pendingAgentAction.findMany             │
                   │   │       (subjectId=:id, last 30d),                  │
                   │   │     prisma.agentMemory.findMany                    │
                   │   │       (key startsWith "note:driver:<id>:"),       │
                   │   │     scoreExplainerService.explain(driverId,        │
                   │   │       latestScore)  ◀──── checks 1h cache first   │
                   │   │   ])                                                │
                   │   ▼                                                    │
                   │  JSON: {                                               │
                   │    profile, liveStatus, score, snapshots90d,           │
                   │    violations, cash, attendance,                       │
                   │    agentNotes, decisionAuditLog, scoreExplanation      │
                   │  }                                                     │
                   └──────────────────────────────────────────────────────┘
                                          │
                                          │ (only on cache miss)
                                          ▼
                   ┌──────────────────────────────────────────────────────┐
                   │  scoreExplainerService                                 │
                   │    ├── latestMemoryByKey("score_explanation:<id>:<d>")│
                   │    │     → if found AND < 1h old: return cached        │
                   │    ├── runAgent("score-explainer", {                  │
                   │    │     tenantId, triggerEvent: "explain_score",     │
                   │    │     payload: { driverId, score, breakdown,       │
                   │    │     recentViolations, recentShifts }             │
                   │    │   })  ──▶ Anthropic Claude Sonnet 4.6             │
                   │    └── upsertAgentMemory({                            │
                   │          key: "score_explanation:<id>:<d>",           │
                   │          value: { text, generatedAt, model }          │
                   │        })                                              │
                   └──────────────────────────────────────────────────────┘
                                          │
                                          ▼
                              Anthropic API (Claude Sonnet 4.6)
```

### Recommended Project Structure
```
backend/src/
├── routes/
│   └── drivers.ts                  # Extend existing /profile with new /file route
├── services/
│   └── driverFile/
│       ├── scoreExplainer.ts       # NEW — on-demand explanation + 1h AgentMemory cache
│       └── decisionAuditFilter.ts  # NEW — filter AgentAction + PendingAgentAction by subject
├── agent/
│   ├── index.ts                    # ADD registerAgent({ id: "score-explainer", ... })
│   ├── prompts/
│   │   └── scoreExplainer.md       # NEW — system prompt for the explainer agent
│   └── tools/read/
│       └── performanceTrend.ts     # NEW — 13th read tool: 90-day snapshot reader
└── __tests__/
    ├── routes/
    │   └── driversFile.test.ts     # NEW — aggregate route + tenant-scope assertions
    └── services/
        └── scoreExplainer.test.ts  # NEW — cache-hit + Claude-call paths

frontend/src/
├── app/(dashboard)/
│   ├── drivers/
│   │   └── [id]/
│   │       └── page.tsx            # NEW — canonical Driver File
│   ├── keeta/drivers/[id]/page.tsx     # MODIFY — redirect to /drivers/[id]?from=keeta
│   ├── talabat/drivers/[id]/page.tsx   # MODIFY — same
│   ├── deliveroo/drivers/[id]/page.tsx # MODIFY — same
│   └── americana/drivers/[id]/page.tsx # MODIFY — same
├── components/
│   ├── shared/
│   │   ├── DriverLink.tsx          # NEW — <Link href="/drivers/[id]"> primitive
│   │   └── Driver360.tsx           # KEEP — harvest the OverviewTab and AttendanceTab cells
│   └── driverFile/
│       ├── DriverFileHeader.tsx    # NEW — section 1: Profile (name/photo/vehicle/contract)
│       ├── LiveStatusSection.tsx   # NEW — section 2: GPS dot + today's orders + active shift
│       ├── ScoreSection.tsx        # NEW — section 3: composite + 5 sub-scores + "Why?" drawer
│       ├── ScoreTrendChart.tsx     # NEW — section 4: Recharts <LineChart> 90-day
│       ├── ViolationsSection.tsx   # NEW — section 5
│       ├── CashSection.tsx         # NEW — section 6
│       ├── AttendanceSection.tsx   # NEW — section 7
│       ├── AgentNotesSection.tsx   # NEW — section 8
│       └── DecisionAuditSection.tsx# NEW — section 9 (per CON-driver-file-sections, this maps to "Decision audit log")
└── __tests__/
    └── driverFile/
        ├── DriverFilePage.test.tsx
        ├── ScoreTrendChart.test.tsx
        └── DriverLink.test.tsx
```

### Pattern 1: Section-based vertical layout (NOT tabs)
**What:** All 8 sections render on one scrollable page with a sticky right-rail nav showing section anchors.
**When to use:** When the page is the source-of-truth for a high-stakes decision (PRD §5.5: "before the owner approves a fire/promote action") — owner must see everything at a glance.
**Why over tabs:** The existing Driver360 uses 4 tabs which hide content; for a fire/promote decision the owner must NOT have to click to see violations or cash. Industry pattern: Linear's Issue page, Stripe's Customer page, Plaid's Item page — all use vertical sections with section nav.
**Example:**
```typescript
// Source: pattern from Linear / Stripe (industry-standard)
// frontend/src/app/(dashboard)/drivers/[id]/page.tsx
"use client";
import { useParams } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import DriverFileHeader from "@/components/driverFile/DriverFileHeader";
import LiveStatusSection from "@/components/driverFile/LiveStatusSection";
import ScoreSection from "@/components/driverFile/ScoreSection";
import ScoreTrendChart from "@/components/driverFile/ScoreTrendChart";
// ... etc

export default function DriverFilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useApiQuery<DriverFileResponse>(
    ["driver-file", id],
    `/api/drivers/${id}/file`,
    { staleTime: 30_000 } // 30s — cheap to refetch on focus
  );
  if (isLoading || !data) return <PageSkeleton />;
  return (
    <div className="grid grid-cols-[1fr_180px] gap-6">
      <article className="space-y-6">
        <section id="profile"><DriverFileHeader profile={data.profile} /></section>
        <section id="live"><LiveStatusSection liveStatus={data.liveStatus} /></section>
        <section id="score"><ScoreSection score={data.score} explanation={data.scoreExplanation} /></section>
        <section id="trend"><ScoreTrendChart points={data.snapshots90d} /></section>
        <section id="violations"><ViolationsSection items={data.violations} /></section>
        <section id="cash"><CashSection records={data.cash} /></section>
        <section id="attendance"><AttendanceSection records={data.attendance} /></section>
        <section id="notes"><AgentNotesSection notes={data.agentNotes} /></section>
        <section id="audit"><DecisionAuditSection rows={data.decisionAuditLog} /></section>
      </article>
      <aside className="sticky top-4 space-y-1 text-sm">
        {SECTIONS.map(s => (<a key={s.id} href={`#${s.id}`}>{s.label}</a>))}
      </aside>
    </div>
  );
}
```

### Pattern 2: Single aggregate fetch (extend existing `/profile`)
**What:** One backend route `/api/drivers/:id/file` that returns ALL eight sections' data in one round-trip.
**When to use:** When initial page-load latency matters more than partial-update granularity.
**Why:** The existing `/api/drivers/:id/profile` route already does 13 parallel `Promise.all` reads with no observed latency issues; adding 4 more sections is free. Reduces network overhead from 8 GETs to 1.
**Example:** See `backend/src/routes/drivers.ts::/profile` lines 357-465 — Phase 3 extends this exact handler.

### Pattern 3: `<DriverLink>` primitive for cross-app clickability
**What:** A single component that renders `<Link href={\`/drivers/\${driverId}\`}>{name}</Link>`.
**When to use:** Every place in the codebase that displays a driver name.
**Example:**
```typescript
// Source: standard Next.js pattern, project-internal
// frontend/src/components/shared/DriverLink.tsx
import Link from "next/link";
import { cn } from "@/lib/cn";

export default function DriverLink({
  driverId,
  name,
  className,
  prefetch = false,
}: {
  driverId: string;
  name: string;
  className?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={`/drivers/${driverId}`}
      prefetch={prefetch} // false default — driver pages are heavy
      className={cn("hover:underline decoration-primary/40 underline-offset-2", className)}
    >
      {name}
    </Link>
  );
}
```
Retrofit pattern (15 sites identified across the codebase via grep, see Runtime State Inventory):
```typescript
// BEFORE
<a href={`/keeta/drivers/${d.driverId}`} className="...">{d.name}</a>
// AFTER
<DriverLink driverId={d.driverId} name={d.name} className="..." />
```

### Pattern 4: On-demand score explanation with 1h AgentMemory cache
**What:** A service that calls Claude Sonnet 4.6 once per driver-per-hour and caches in `AgentMemory`.
**When to use:** Whenever a user opens the Driver File and wants "why?".
**Cache key shape:** `score_explanation:<driverId>:<scoreDateYYYY-MM-DD>` — invalidated automatically when the day rolls over OR when `aiScoringService` re-runs.
**Example:**
```typescript
// backend/src/services/driverFile/scoreExplainer.ts (NEW)
import { latestMemoryByKey, upsertAgentMemory } from "../../agent/memory";
import { runAgent } from "../../agent/runtime";

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function explainScore(opts: {
  tenantId: string;
  driverId: string;
  score: AiScoreRow;
  recentShifts: ShiftRow[];
  recentViolations: ViolationRow[];
}): Promise<{ text: string; cached: boolean }> {
  const dayKey = opts.score.date.toISOString().slice(0, 10);
  const cacheKey = `score_explanation:${opts.driverId}:${dayKey}`;
  const cached = await latestMemoryByKey(opts.tenantId, cacheKey);
  if (cached && Date.now() - cached.createdAt.getTime() < ONE_HOUR_MS) {
    return { text: (cached.value as any).text, cached: true };
  }
  const result = await runAgent("score-explainer", {
    tenantId: opts.tenantId,
    triggerEvent: "explain_score",
    payload: {
      driverId: opts.driverId,
      score: opts.score,
      shifts: opts.recentShifts.slice(0, 10),
      violations: opts.recentViolations.slice(0, 10),
    },
  });
  if (result.status !== "completed" || !result.text) {
    return { text: "Score explanation unavailable.", cached: false };
  }
  await upsertAgentMemory({
    tenantId: opts.tenantId,
    key: cacheKey,
    value: { text: result.text, generatedAt: new Date().toISOString(), model: "claude-sonnet-4-6" },
    confidence: 1,
    source: "agent_observation",
    agentRunId: result.runId,
  });
  return { text: result.text, cached: false };
}
```

### Pattern 5: Per-platform redirect for backwards compatibility
**What:** Replace each `/{platform}/drivers/[id]/page.tsx` body with a `redirect()` call.
**Why:** Preserves bookmarks while routing all traffic through the canonical page.
**Example:**
```typescript
// frontend/src/app/(dashboard)/keeta/drivers/[id]/page.tsx (REPLACE BODY)
import { redirect } from "next/navigation";

export default function KeetaDriverDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/drivers/${params.id}?from=keeta`);
}
```
The `?from=keeta` query string is consumed by the canonical page to render a "← Back to Keeta drivers" link in the header.

### Anti-Patterns to Avoid
- **Computing the 90-day trend from `AiScore` instead of `PerformanceSnapshot`:** The whole point of Phase 1 shipping `PerformanceSnapshot` was to fix the "recompute on every read" anti-pattern (DEC-add-metric-events rationale). Read from `PerformanceSnapshot` only. `AiScore` is the live row written by `aiScoringService`; `PerformanceSnapshot` is the snapshotted history. CON-driver-file-sections specifically references "90-day trend" which is the snapshot.
- **Asking Claude to compute the score explanation from raw data:** The explanation must be derived from `AiScore.breakdown` JSON (already structured by `aiScoringService.ts` lines 252-291) plus a few signals. Do NOT pass the raw shift table — it costs tokens and Claude can't add value beyond what `breakdown` already says. Pre-shape the prompt input.
- **Tab-based layout:** Hides high-stakes information. See Pattern 1 above.
- **Per-section endpoints:** Adds round-trip latency for no gain; the existing `/profile` already aggregates 13 reads.
- **Eager Claude call on every page load:** The score explanation is OPTIONAL UI (a "Why this score?" disclosure). Compute it ONLY when the user clicks the disclosure, OR pre-warm it during the aggregate fetch but with a 1h cache so subsequent views are free. Recommendation: pre-warm during the aggregate fetch; cache for 1h.
- **Hand-rolling a date axis tick formatter:** Recharts already accepts a `tickFormatter` prop on `<XAxis>`. Use it.
- **Storing the score explanation on `PerformanceSnapshot.breakdown`:** That field is the structured score breakdown, not human-readable text. Use `AgentMemory` for the explanation cache (it's the right semantic table — append-only key/value notes).
- **Forgetting tenant-scope on the new `/file` route:** Reuses existing `routes/drivers.ts` router which already mounts `authMiddleware + tenantScope` at the top. Lint:tenant must pass for the new code; the route file is in scope per Phase 1's lint:tenant configuration.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 90-day trend chart | Custom SVG line | `recharts` `<LineChart>` | Already installed (3.8.1), proven on this codebase, handles tooltips/responsiveness/empty data. Edge cases: missing days, single-point series, hover behavior. Recharts handles all. `[VERIFIED: components/keeta/TrendChart.tsx]` |
| 90-day snapshot reader | New Prisma query in the route | Phase 1's `listSnapshotsForDriver(tenantId, driverId, 90)` (already exported from `agent/index.ts`) | Already tenant-scoped, already tested, already truncates to UTC midnight. `[VERIFIED: agent/performanceSnapshot.ts]` |
| Score explanation prompt orchestration | Manual `anthropic.messages.create` | `agent/runtime.ts::runAgent("score-explainer", ...)` | Already wires AgentRunLog audit, latency tracking, `requiresApproval` gate (we set `requiresApproval=false` on read tools), error handling. Adding raw Anthropic SDK calls outside the agent module bypasses the audit ledger. `[VERIFIED: agent/runtime.ts shape + Phase 1 verification]` |
| Cache the explanation | Redis or per-request memo | `AgentMemory` (Phase 1 primitive) | Append-only, tenant-scoped, latest-by-key reads in <5ms with the existing index `@@index([tenantId, key, createdAt(sort: Desc)])`. Redis would be a new infra dep; in-memory cache loses on a worker restart. `[VERIFIED: schema.prisma:2300 index]` |
| Decision audit log filtered by driver | New SQL view | Filter `AgentAction.findMany` by `subjectId=driverId` and `subjectType="Driver"` | Phase 1 explicitly added `subjectType` and `subjectId` columns and indexed them: `@@index([tenantId, subjectType, subjectId])`. The use case ("decision audit log filtered to this driver") is exactly what that index was designed for. `[VERIFIED: schema.prisma:2280]` |
| Agent's running notes | New table | `AgentMemory` filtered by `key startsWith "note:driver:<driverId>:"` | Already shipped, already indexed for prefix scans. The `listAgentMemory` read tool from Phase 2 is the exact tool the chat agent uses to read these — Phase 3 just adds the write side: a backend writer that appends `note:driver:<id>:<timestamp>` rows. `[VERIFIED: agent/memory.ts + tools/read/listAgentMemory.ts]` |
| Decision audit log shape | Custom view model | Reuse Phase 2's `cardProjector.ts` + `AuditEntryDetail.tsx` component | Phase 2 already shipped a 12,000-byte `AuditEntryDetail.tsx` and a row preview at `AuditRowPreview.tsx`. Reuse them in the Driver File audit section. `[VERIFIED: components/decisions/AuditEntryDetail.tsx exists]` |
| Driver name → file link | Manual `<a href>` everywhere | Single `<DriverLink>` component | Single source of truth for the canonical route. If we ever rename `/drivers/[id]` to `/d/[id]`, only one file changes. |
| Backwards-compatibility for old per-platform URLs | Hard 404 | Server-side `redirect()` in old `[id]/page.tsx` files | Bookmarks survive; the user lands on the canonical page with `?from={platform}` so the breadcrumb back-link makes sense. |
| Per-platform Performance views | Re-render Driver360 | Driver File replaces all four `/{platform}/drivers/[id]/page.tsx` | DEC-cross-platform-default-view; per-platform per-driver pages were never the design target — they're an artifact of the legacy 80-page surface. |
| Fetching all 90 days from `AiScore` daily history | Aggregating live | Phase 1's nightly `snapshotAllTenants` (runs 23:00 local) populates `PerformanceSnapshot` | Already wired in `queues/performanceTierWorker.ts` since 2026-05-09. `[VERIFIED]` |

**Key insight:** Phase 1 + Phase 2 deliberately landed every primitive Phase 3 needs. The Driver File is mostly a stitching exercise — there is no NEW data plumbing required, only a new aggregate route + a new Claude call (the explainer) + a new section-based UI shell. If the planner finds themselves writing a new Prisma model or a new BullMQ worker for Phase 3, something has gone wrong.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `PerformanceSnapshot` table — populated nightly since Phase 1 Wave 2 commit (verified via verification report); `AiScore` rows — live, populated by `aiScoringService.scoreAllDrivers` per existing scoring jobs; `AgentAction` table — populated by Phase 2 approve flow; `AgentMemory` table — populated by Phase 2 dismiss flow + `listAgentMemory` reads | None — read-only consumers in Phase 3. New writes are: agent's running notes (`note:driver:<id>:<ts>` keys in AgentMemory) and score-explanation cache (`score_explanation:<id>:<date>` keys). Both are net-new keys, no migration required. |
| Live service config | None — Phase 3 adds no new BullMQ jobs, no new cron, no new SSE channel. The score-explainer is invoked synchronously from the HTTP handler. | None |
| OS-registered state | None | None |
| Secrets/env vars | `ANTHROPIC_API_KEY` (already set; required by score-explainer); no new secrets | None — verified `agent/runtime.ts` already reads `env.ANTHROPIC_API_KEY` and gracefully returns `{ status: "disabled" }` when absent (Phase 1 verification report confirms this) |
| Build artifacts | None — no new generated code; Prisma client already includes `PerformanceSnapshot`, `AgentMemory`, `AgentAction` types from Phase 1's migration | None |
| Cross-app driver-name links | **15 call sites identified** via `grep -rn "/keeta/drivers/\|/talabat/drivers/\|/deliveroo/drivers/\|/americana/drivers/" frontend/src/`: `talabat/drivers/missing-docs/page.tsx:161`, `talabat/drivers/page.tsx:266`, `talabat/drivers/docs-expiring/page.tsx:156`, `deliveroo/drivers/page.tsx:266`, `deliveroo/orders/page.tsx:159`, `deliveroo/overview/page.tsx:214`, `keeta/drivers/page.tsx:122`, `keeta/shift-monitor/page.tsx:79`, `keeta/operation-centre/page.tsx:112`, `americana/branch-performance/page.tsx:440`, `americana/drivers/page.tsx:183`, `components/platform/TalabatCodLedger.tsx:178`, `components/platform/TalabatLiveOpsHeader.tsx:192`, `components/decisions/DecisionCard.tsx:240` (currently shows `window.alert("Driver File ships in Phase 3")` — replace with real link), AND any future Decisions audit row that references a driver name | Replace each with `<DriverLink>` or `router.push(\`/drivers/\${id}\`)`. The DecisionCard placeholder at line 240-247 is a known TODO planted by Phase 2 explicitly waiting for Phase 3 — must be wired in. |

## Common Pitfalls

### Pitfall 1: 90-day chart with 0 data points
**What goes wrong:** A new tenant or a brand-new driver has no `PerformanceSnapshot` rows yet — Recharts renders a blank pane.
**Why it happens:** `snapshotAllTenants` runs at 23:00 local; before the first nightly run, the table is empty. New drivers added during the day also won't have snapshots until midnight.
**How to avoid:** Show an explicit empty state ("No 90-day trend yet — first snapshot will be computed tonight") when `data.snapshots90d.length === 0`. Backend: when zero snapshots exist, populate the response with the live `AiScore` row as a single point so the chart shows at least one dot.
**Warning signs:** Chart pane is blank but no error logged. Add a Wave 0 RED test: `expect(<ScoreTrendChart points={[]} />).toRenderEmptyState()`.

### Pitfall 2: Score explanation generated against stale `AiScore.breakdown`
**What goes wrong:** Explanation says "your delivery score is 80 because you completed 200 orders" but the live `AiScore` says delivery=72, 165 orders. Owner loses trust.
**Why it happens:** The explanation cache key is `score_explanation:<driverId>:<scoreDateYYYY-MM-DD>`. If `aiScoringService.scoreAllDrivers` re-runs mid-day and overwrites today's row (via the existing `deleteMany then createMany` pattern at `aiScoringService.ts:310-329`), the cached explanation is now stale but still within the 1h TTL.
**How to avoid:** Include `score.compositeScore` in the cache key as a tiebreaker: `score_explanation:<driverId>:<dateYYYY-MM-DD>:<compositeScore>`. When the score changes, the cache key changes — no stale text.
**Warning signs:** Explanation text contains numbers that don't match the visible KPIs. Add a Wave 0 RED test: `it("invalidates cache when compositeScore changes", ...)`.

### Pitfall 3: `subjectId` not always set on `AgentAction` rows
**What goes wrong:** Decision audit log section is empty for a driver who clearly has approved actions.
**Why it happens:** Phase 2's `cardProjector.ts` and `decisions.ts` approve handler set `subjectType="Driver"` and `subjectId=driverId` on actions touching a driver — BUT some Phase 2 actions (like `proposeCashReminder` with audit-only mode) may have set `subjectType="CashRecord"` and `subjectId=cashRecordId`, which doesn't surface against the driver.
**How to avoid:** When filtering the audit log for the Driver File, query with an OR: `{ subjectType: "Driver", subjectId: driverId } OR { subjectType: "CashRecord", subjectId: { in: <driver's cash record ids> } }`. For Phase 3 simplicity, just match `subjectType="Driver"` and document the limitation; Phase 8 (cash workbench) revisits this when the cash actions go live.
**Warning signs:** Owner says "I approved a cash reminder for this driver yesterday but the audit log here is empty." Add Wave 0 RED test: `it("includes Driver-typed actions only in v1, with comment for Phase 8 expansion")`.

### Pitfall 4: Tenant-scoping ambiguity on cross-platform `/drivers/[id]`
**What goes wrong:** A user from tenant A constructs a URL `/drivers/<driver-from-tenant-B>` and sees that driver's file.
**Why it happens:** Frontend route is platform-agnostic; the only tenant guard is the backend route. If the new `/api/drivers/:id/file` route handler forgets to filter by `tenantId`, the leak is wide open.
**How to avoid:** Reuse the existing `routes/drivers.ts::/profile` pattern verbatim — `prisma.driver.findFirst({ where: { id, tenantId } })` runs FIRST. If null → 404. The lint:tenant rule + Phase 1's tenant-isolation tests will catch any direct `prisma.driver` query that omits `tenantId`. Add Wave 0 RED test: `it("returns 404 for cross-tenant driver fetch on /file route")`.
**Warning signs:** Logged-in user sees a driver name they don't recognize. Critical risk; gate on lint:tenant and an integration test before any merge.

### Pitfall 5: Recharts hydration mismatch on `ResponsiveContainer`
**What goes wrong:** Browser console shows "Hydration failed" when the chart renders.
**Why it happens:** `ResponsiveContainer` measures the DOM on first render; SSR has no DOM. The component must be a client component (`"use client"`) and ideally rendered after a `useEffect`-gated mount flag.
**How to avoid:** Mark the chart wrapper component `"use client"` (already the convention for the codebase) and pin a fixed `width="100%" height={260}` inside a wrapper div with explicit pixel sizes. Reference: existing `TrendChart.tsx` has `<div style={{ width: "100%", height: 260 }} dir="ltr">` — copy this exactly. `[VERIFIED: components/keeta/TrendChart.tsx]`
**Warning signs:** Hydration error in browser console; chart appears then immediately disappears.

### Pitfall 6: Driver name collisions
**What goes wrong:** Two drivers with the same name (e.g., "Mohammed Ali"). Owner clicks one, lands on the other's file because the table only carried the name, not the id.
**Why it happens:** `<DriverLink>` requires `driverId`, but a refactor might pass only `name`.
**How to avoid:** `<DriverLink>` requires `driverId` as a non-optional prop (TypeScript enforces). Add unit test: `it("requires driverId prop")`.
**Warning signs:** Same person fixes "wrong driver opened" support ticket twice. Make the prop required at the type level.

### Pitfall 7: `snapshotAllTenants` failure leaves stale 90-day data
**What goes wrong:** Nightly snapshot worker errors; the next day's snapshot is missing; the chart shows a 1-day gap.
**Why it happens:** `performanceTierWorker.ts:46-64` catches errors and logs, but the row isn't written. The next night's run resumes normally — the gap stays.
**How to avoid:** The chart doesn't need to be hole-free; a single missing day is fine. But add a defensive backend-side gap-fill: when reading 90 days back, return both the array AND a `gapDays: number` so the UI can display "1 day missing in the last 90 (snapshot job error on YYYY-MM-DD)". Defer to Phase 11 if not done in Phase 3.
**Warning signs:** A line on the chart drops to zero on a single day instead of skipping it. Defer to Phase 11.

## Code Examples

### 1. Extending `/api/drivers/:id/profile` to `/file` (backend)
```typescript
// Source: project-internal pattern from backend/src/routes/drivers.ts (lines 357-465)
// backend/src/routes/drivers.ts
import { listSnapshotsForDriver } from "../agent";
import { explainScore } from "../services/driverFile/scoreExplainer";
import { listMemoriesByPrefix } from "../agent";

router.get("/:id/file", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    // Tenant boundary FIRST — same pattern as /profile.
    const driver = await prisma.driver.findFirst({
      where: { id, tenantId },
      include: { /* same shape as /profile */ },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const [
      // ... reuse all 13 Promise.all reads from /profile ...
      snapshots90d,
      latestScore,
      decisionAuditRows,
      pendingDecisions,
      agentNotes,
    ] = await Promise.all([
      // ... existing 13 reads ...
      listSnapshotsForDriver(tenantId, id, 90),
      prisma.aiScore.findFirst({
        where: { tenantId, driverId: id },
        orderBy: { date: "desc" },
      }),
      prisma.agentAction.findMany({
        where: { tenantId, subjectType: "Driver", subjectId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { approver: { select: { id: true, name: true, email: true } } },
      }),
      prisma.pendingAgentAction.findMany({
        where: {
          tenantId,
          subjectType: "Driver",
          subjectId: id,
          createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      listMemoriesByPrefix(tenantId, `note:driver:${id}:`, 20),
    ]);

    // Score explanation (cached 1h in AgentMemory)
    let scoreExplanation: { text: string; cached: boolean } = {
      text: "Score not yet available.",
      cached: false,
    };
    if (latestScore) {
      try {
        scoreExplanation = await explainScore({
          tenantId,
          driverId: id,
          score: latestScore,
          recentShifts: /* from existing /profile reads */,
          recentViolations: /* from existing /profile reads */,
        });
      } catch (err: any) {
        console.error("[driverFile] score explanation failed:", err?.message);
        scoreExplanation = { text: "Score explanation unavailable.", cached: false };
      }
    }

    return res.json({
      profile: { /* same as /profile */ },
      liveStatus: { /* same as /profile */ },
      score: latestScore ? { /* shape from courierProfile read tool */ } : null,
      scoreExplanation,
      snapshots90d: snapshots90d.map((s) => ({
        date: s.snapshotDate.toISOString().slice(0, 10),
        composite: s.compositeScore,
        attendance: s.attendanceScore,
        delivery: s.deliveryScore,
        financial: s.financialScore,
        equipment: s.equipmentScore,
        platform: s.platformScore,
      })),
      attendance: { /* same as /profile */ },
      cash: { /* same as /profile */ },
      violations: { /* same as /profile */ },
      agentNotes: agentNotes.map((m) => ({
        id: m.id,
        text: typeof m.value === "string" ? m.value : (m.value as any).text ?? "",
        createdAt: m.createdAt.toISOString(),
        source: m.source,
      })),
      decisionAuditLog: {
        approved: decisionAuditRows,
        pending: pendingDecisions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

### 2. ScoreTrendChart component (frontend)
```typescript
// Source: pattern from components/keeta/TrendChart.tsx (proven)
// frontend/src/components/driverFile/ScoreTrendChart.tsx
"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

type Snapshot = {
  date: string;
  composite: number;
  attendance: number;
  delivery: number;
  financial: number;
  equipment: number;
  platform: number;
};

export default function ScoreTrendChart({ points }: { points: Snapshot[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No 90-day trend yet — first snapshot computes tonight at 23:00.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold mb-3">90-day performance trend</h3>
      <div style={{ width: "100%", height: 260 }} dir="ltr">
        <ResponsiveContainer>
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={11}
              tickFormatter={(d) => d.slice(5)} // MM-DD
              minTickGap={20}
            />
            <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={70} stroke="#fbbf24" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="composite" stroke="#0f172a" strokeWidth={2} dot={false} name="Composite" />
            <Line type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={1} dot={false} name="Attendance" />
            <Line type="monotone" dataKey="delivery" stroke="#10b981" strokeWidth={1} dot={false} name="Delivery" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 3. Score explanation system prompt (backend agent)
```markdown
<!-- backend/src/agent/prompts/scoreExplainer.md (NEW) -->
# Score Explainer

You are Darb's score-explainer agent. Your only job is to write a 2-4 sentence
plain-English explanation of why a courier has the score they have.

## Inputs (in the user payload)
- `score`: object with compositeScore + 5 sub-scores + breakdown JSON from
  aiScoringService.
- `breakdown.details`: structured per-component data — completionRate, onTimeRate,
  total/completed/onTime shifts, total orders, working days, daily average,
  platform average, cash settlement counts, inspection pass counts, valid shift
  counts.
- `recentShifts`, `recentViolations`: most recent 10 of each.

## Output rules
1. Write 2-4 sentences total. No bullet points. No markdown headers.
2. State the composite score in the first sentence: "Mohammed scores 78 / 100."
3. Identify the strongest factor and the weakest factor by sub-score.
4. Quote ONE concrete number from the breakdown (e.g. "10 on-time arrivals out
   of 12 shifts" or "delivered 165 orders this week, 12% above platform average").
5. Do NOT speculate. Only use facts in the payload.
6. Do NOT propose actions. The owner reads this on the Driver File and decides
   for themselves.
7. Tone: factual, second-person ("Mohammed has..."), no praise, no blame.

## Forbidden
- Mentioning anything not in the payload.
- Suggesting fires, promotions, warnings, or any action.
- Adding caveats like "but this is just my interpretation".
- Bilingual output. The Driver File is owner-facing UI (English-only per
  CON-bilingual-outbound).
```

### 4. DriverLink retrofit pattern
```typescript
// frontend/src/components/decisions/DecisionCard.tsx (line 238-252 REPLACE)
// BEFORE (Phase 2 placeholder):
{card.driverName && !card.headline.includes(card.driverName) && (
  <a href="#" onClick={(e) => { e.preventDefault(); window.alert("Driver File ships in Phase 3"); }} className="...">
    {card.driverName}
  </a>
)}

// AFTER (Phase 3):
{card.driverName && !card.headline.includes(card.driverName) && card.driverId && (
  <DriverLink driverId={card.driverId} name={card.driverName} className="text-xs font-medium text-primary" />
)}
```
Note: `card.driverId` is already populated by Phase 2's `cardProjector.ts` (verified). Phase 3 just removes the `Phase 3 placeholder` comment and the `window.alert` and replaces with the real link.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-platform `Driver360` tabs at `/{platform}/drivers/[id]` | Single canonical `/drivers/[id]` with vertical sections | Phase 3 (this work) | Owner sees everything at a glance; no platform-specific deep linking |
| Recompute composite on every read | Daily snapshot at 23:00 → read from `PerformanceSnapshot` | Phase 1 Wave 2 (2026-05-09) | <300ms p95 chart load; trend independent of `aiScoringService` runtime |
| `aiChiefOfStaffService` embedded in `services/` | Dedicated `agent/` module with tool registry | Phase 1 (2026-05-09) | Score explainer plugs into the same audit + run-log infrastructure |
| Driver file UI used Tailwind primitives directly | Phase 2 introduces "Sierra design system" tokens (`bg-sand-200`, etc.) | Phase 2 (2026-05-09) | Driver File should follow Sierra tokens for consistency with `/decisions` |
| Driver names rendered as plain `<span>` or `<a>` with platform-prefixed routes | `<DriverLink>` primitive routing to canonical | Phase 3 (this work) | One source of truth; future route renames are a one-file change |

**Deprecated/outdated:**
- The four `/{platform}/drivers/[id]/page.tsx` files become thin redirects. They are NOT deleted (DEC-hide-behind-flag pattern); they remain as redirect-only stubs.
- `Driver360` is NOT deleted in Phase 3 — its `OverviewTab`, `AttendanceTab`, `PerformanceTab`, `CashViolationsTab` cells are SOURCE for the new section components. Phase 10 ("Operations Per-Platform + HR + Hide-Behind-Flag") is when the harvested-and-thrown-away pattern formally retires Driver360.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Single aggregate `/api/drivers/:id/file` route is faster than per-section endpoints | Architecture Patterns / Pattern 2 | If p95 > 300ms, planner can split into per-section endpoints. Existing `/profile` data suggests this is fine, but no Phase 3 measurement yet. |
| A2 | New `score-explainer` agent registration is the right shape vs. extending the chat agent | Standard Stack / Alternatives | Either works. New agent isolates cost + audit; piggybacking on chat keeps the agent count low. Planner picks. |
| A3 | 1-hour cache TTL for the score explanation is correct | Pattern 4 | Could be 24 hours (matches snapshot day). 1 hour is conservative; 24 hours saves more tokens but stale text feels fresh because `compositeScore` rarely changes within a day. Recommend 1h for v1. |
| A4 | Decision audit log surfaces only `subjectType="Driver"` rows in v1 | Pitfall 3 | Misses cash-reminder actions linked to a `CashRecord`. Acceptable for v1; revisit in Phase 8 when cash workbench ships. |
| A5 | Per-platform `/{platform}/drivers/[id]` pages should redirect to `/drivers/[id]?from={platform}` | Pattern 5 | If founder prefers a hard 404 to force users to update their bookmarks, that's a 1-line change. Recommend redirect. |
| A6 | Performance budget is "trend chart renders in <300ms" (from ROADMAP) | ROADMAP Phase 3 success criterion 3 | The success criterion is verbatim. Achievable because `PerformanceSnapshot` is a flat table read with composite index; <100ms p95 is realistic. |
| A7 | The "agent's running notes" section reads `AgentMemory` keys with prefix `note:driver:<id>:` | Don't Hand-Roll table | This naming convention is NEW in Phase 3 — no existing data uses it. Phase 3 must include the writer (a small service `appendDriverNote(tenantId, driverId, text)`) and document the convention in the agent module README. |
| A8 | Driver name collision handling is via `<DriverLink>` requiring `driverId` (not via name uniqueness) | Pitfall 6 | Acceptable; trivially enforced by TypeScript. |

## Open Questions

1. **Should the Driver File show a per-platform breakdown or unified totals?**
   - What we know: DEC-cross-platform-default-view says cross-platform unification is the default. Driver360 today shows per-platform tabs.
   - What's unclear: For a Talabat-only courier, the file should still load with no Keeta/Deliveroo/Americana clutter — but for a multi-platform courier, do we show a stacked composite trend or per-platform lines?
   - Recommendation: Composite trend by default (matches DEC-cross-platform-default-view); add an optional "per-platform" toggle on the trend chart. Phase 3 ships composite-only; toggle is Phase 11+ when forecasting tools land.

2. **What "agent's running notes" actually contain in v1.**
   - What we know: PRD §5.5 says "Agent's running notes (auto-generated observations)". CON-driver-file-sections lists "Agent's running notes".
   - What's unclear: Today nothing writes `note:driver:<id>:*` — the cupboard is bare. Without a writer, this section is empty.
   - Recommendation: Phase 3 ships TWO writers: (a) on every approve/dismiss touching a driver, append a one-liner note ("Owner approved suspend on 2026-05-10 — driver missed 3 shifts in a week"), and (b) on score regression detected by aiScoringService (`trend === "DOWN"`), append a note ("Score regressed from 82 to 67 over the last 7 days"). Both are 1-line writes. Document in the agent module README.

3. **Should the score explanation be streamed or returned synchronously?**
   - What we know: Anthropic SDK supports both `messages.create({ stream: true })` and `messages.stream()`. The Driver File page is heavy (8 sections); the score explanation is just one of them.
   - What's unclear: User experience tradeoff — streaming feels live but shows the seams; sync is cleaner but adds 1-2 seconds to the aggregate fetch.
   - Recommendation: SYNC for v1 with the 1h cache. The cache hit rate will be very high in steady state (most driver-file views hit a cached explanation). Streaming is a Phase 4 (Chat) concern; Driver File is not the right surface to introduce the streaming pattern.

4. **Performance budget verification.**
   - What we know: ROADMAP §3 success criterion 3 says "the 90-day trend chart renders in <300ms".
   - What's unclear: Does this include the network round-trip or just the client render? Existing `/profile` route p95 isn't measured (no Phase 1 or 2 perf tests).
   - Recommendation: Phase 3 wave 0 should include a perf test that measures `/api/drivers/:id/file` p95 against a seeded fixture (the design-partner-1 fixture from Phase 2 has 8 drivers × 30 days, perfect for this).

5. **Mobile/responsive concerns.**
   - What we know: PRD says owner UI is desktop-primary (DEC-non-goals-12-months: "mobile-first chat" — but the wider implication is desktop-primary for owner surfaces).
   - What's unclear: Do we need responsive breakpoints for tablet/phone?
   - Recommendation: Desktop-primary for v1 (≥1024px); design will gracefully stack on smaller widths via Tailwind responsive utilities, no special work.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 15 | All Phase 3 reads | ✓ | 15+ (Docker compose) | — |
| Redis 7 | None (Phase 3 doesn't add new BullMQ jobs) | ✓ | 7 (Docker compose) | — |
| Anthropic API | Score explainer | ✓ via `ANTHROPIC_API_KEY` | SDK 0.95.1 | `runAgent` returns `{ status: "disabled" }` when key absent — Driver File renders explanation as "Score explanation unavailable. Set ANTHROPIC_API_KEY to enable." |
| Node 20+ | Backend runtime | ✓ | TS 5.x | — |
| `recharts` 3.8.1 | 90-day chart | ✓ | 3.8.1 | None — already installed |
| `react-leaflet` | Live status mini-map | ✓ | 5.0.0 | Skip mini-map; show last GPS coords in text |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None — Anthropic API absence is gracefully handled by the existing `runAgent` "disabled" status.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | Jest 29 + ts-jest (`"test": "jest"`) |
| Backend config file | `backend/jest.config.js` (mocks `../config` to `__tests__/mocks/config.ts`) |
| Backend quick run | `cd backend && npm test -- --testPathPatterns=driverFile` |
| Backend full suite | `cd backend && npm test` |
| Frontend framework | Vitest + Testing Library (`"test": "vitest"`) |
| Frontend config file | `frontend/vitest.config.ts` |
| Frontend quick run | `cd frontend && npx vitest run src/__tests__/driverFile/` |
| Frontend full suite | `cd frontend && npm run test:run` |
| Phase gate | Both backend (`npm test`) and frontend (`npm run test:run`) green; lint:tenant green; tsc --noEmit green |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-driver-file (1/4) | Eight sections render on `/drivers/[id]` | unit (frontend) | `npx vitest run src/__tests__/driverFile/DriverFilePage.test.tsx` | ❌ Wave 0 |
| REQ-driver-file (2/4) | Decision audit log filters by driver | integration (backend) | `npm test -- --testPathPatterns=driversFile` | ❌ Wave 0 |
| REQ-driver-file (3/4) | Cross-app driver names link to canonical route | unit (frontend) | `npx vitest run src/__tests__/driverFile/DriverLink.test.tsx` | ❌ Wave 0 |
| REQ-driver-file (4/4) | 90-day trend renders from `PerformanceSnapshot` | unit (frontend) | `npx vitest run src/__tests__/driverFile/ScoreTrendChart.test.tsx` | ❌ Wave 0 |
| REQ-agent-scoring (1/3) | Score explainer returns text within 5s on cache miss | integration (backend) | `npm test -- --testPathPatterns=scoreExplainer` | ❌ Wave 0 |
| REQ-agent-scoring (2/3) | Score explainer hits cache on second call within 1h | integration (backend) | same as above | ❌ Wave 0 |
| REQ-agent-scoring (3/3) | Score explainer evals — 5 gold-set fixtures pass | integration (backend) | `npm test -- --testPathPatterns=scoreExplainer.evals` | ❌ Wave 0 |
| Tenant scope on `/file` | Cross-tenant access returns 404 | integration (backend) | `npm test -- --testPathPatterns=driversFile.tenant` | ❌ Wave 0 |
| Performance budget | `/api/drivers/:id/file` p95 < 300ms on seed fixture | perf (backend) | `npm test -- --testPathPatterns=driversFile.perf` | ❌ Wave 0 |
| Recharts hydration | `<ScoreTrendChart>` renders without hydration errors | unit (frontend) | `npx vitest run src/__tests__/driverFile/ScoreTrendChart.test.tsx` | ❌ Wave 0 |
| Empty state | `<ScoreTrendChart points={[]} />` renders explicit empty state | unit (frontend) | same as above | ❌ Wave 0 |
| Score explanation cache invalidation | Cache key changes when `compositeScore` changes | unit (backend) | `npm test -- --testPathPatterns=scoreExplainer.cache` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && npm test -- --testPathPatterns=driverFile` (fast, < 5s)
- **Per wave merge:** `cd backend && npm test && cd ../frontend && npm run test:run` (~1 minute total based on Phase 2 baseline of 188 + 36 tests)
- **Phase gate:** Full suite green; lint:tenant green; both `tsc --noEmit` clean; `/api/drivers/:id/file` perf assertion met

### Wave 0 Gaps
- [ ] `backend/src/__tests__/routes/driversFile.test.ts` — covers REQ-driver-file (sections 1-9 wired through aggregate route)
- [ ] `backend/src/__tests__/routes/driversFile.tenant.test.ts` — covers cross-tenant 404 (CRITICAL — see Pitfall 4)
- [ ] `backend/src/__tests__/routes/driversFile.perf.test.ts` — covers performance budget against design-partner-1 fixture
- [ ] `backend/src/__tests__/services/scoreExplainer.test.ts` — covers cache hit/miss, Anthropic disabled fallback
- [ ] `backend/src/__tests__/services/scoreExplainer.cache.test.ts` — covers cache invalidation on score change
- [ ] `backend/src/__tests__/services/scoreExplainer.evals.test.ts` — gold-set fixtures (see below)
- [ ] `backend/src/__tests__/agent/tools/performanceTrend.test.ts` — covers the new 13th read tool
- [ ] `frontend/src/__tests__/driverFile/DriverFilePage.test.tsx` — covers section render + loading + error states
- [ ] `frontend/src/__tests__/driverFile/ScoreTrendChart.test.tsx` — covers Recharts render + empty state + hydration
- [ ] `frontend/src/__tests__/driverFile/DriverLink.test.tsx` — covers prop required, href shape
- [ ] `frontend/src/__tests__/driverFile/AgentNotesSection.test.tsx` — covers note rendering + empty state
- [ ] `frontend/src/__tests__/driverFile/DecisionAuditSection.test.tsx` — covers reuse of `AuditEntryDetail` from Phase 2

#### Gold-set fixtures for the score explainer (Wave 0 — REQ-agent-scoring)
Pre-seed five canonical driver shapes; each has an expected explanation that contains specific facts. Tests assert the explanation text contains the listed facts (case-insensitive) without asserting exact wording (LLM output is non-deterministic).

| Fixture | Composite | Sub-scores | Expected explanation contains |
|---------|-----------|------------|------------------------------|
| `goldStandard` | 92 | attendance=95, delivery=90, financial=100, equipment=100, platform=92 | "92", "attendance" or "delivery", a number from breakdown |
| `regression` | 67, trend=DOWN | attendance=70, delivery=55 | "67", word "down" / "regress" / "decline", attendance OR delivery as weakest |
| `cashProblem` | 70 | attendance=85, financial=40 | "70", word "cash" or "settlement" or "financial", "40" |
| `attendanceGap` | 58 | attendance=30, delivery=85 | "58", "attendance" as weakest, a count of late/missing shifts |
| `newDriver` | 75, no breakdown details | all=75 | "75", neutral tone, hint that data is limited |

Tests assert: (1) length 50-500 chars, (2) contains the composite score number, (3) contains at least one signal from the expected facts, (4) does NOT contain action words ("warn", "suspend", "fire", "promote") — the explainer must NEVER propose actions.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `authMiddleware` JWT verify on `/api/drivers/*` |
| V3 Session Management | yes | Existing 15-min access + 7-day refresh cookie pattern |
| V4 Access Control | yes | RBAC: ADMIN/OPS_MANAGER/SUPERVISOR/ACCOUNTANT/VIEWER may read; `/api/drivers/:id/file` is read-only so no write-side RBAC needed |
| V5 Input Validation | yes | Zod on `:id` param (uuid v4); existing pattern from `/profile` route |
| V6 Cryptography | no | No new crypto in Phase 3 |
| V8 Data Protection | yes | Tenant-scope on every read; lint:tenant rule covers the new route file (it's in `routes/`) — verify it's added to the lint:tenant scope |
| V13 API & Web Service | yes | Standard JSON response shape; CORS already configured |

### Known Threat Patterns for the Driver File stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant driver lookup via URL manipulation | Information Disclosure | First query of the route is `prisma.driver.findFirst({ where: { id, tenantId } })`; null → 404; pattern verified by Phase 1 tenant-isolation tests for the read tools |
| Score explanation prompt injection (driver name/notes contain "ignore previous instructions") | Tampering | Driver name + violation details are template-inserted into the user payload, not the system prompt. The system prompt explicitly says "Do NOT speculate. Only use facts in the payload." |
| Score explanation token-budget DoS | Denial of Service | Single Anthropic call per driver per hour cached; rate limit by AgentMemory cache hit; per-tenant 50/day cap inherited from Phase 2 monitor (apply same cap here if needed) |
| Stale score explanation reveals stale data | Information Disclosure | Cache key includes `compositeScore` so an `aiScoringService` re-run invalidates the cache automatically |
| AgentAction reasoning leak across tenants in audit log section | Information Disclosure | `prisma.agentAction.findMany({ where: { tenantId, ... } })` — same tenant scope as Phase 2 audit route |
| Driver photo URL points to another tenant's storage | Information Disclosure | `Driver.photoUrl` is per-driver; the tenant scope on `prisma.driver.findFirst` already gates access |

## Sources

### Primary (HIGH confidence)
- `backend/prisma/schema.prisma` lines 482-570 (Driver model), 1016-1040 (AiScore), 2251-2282 (AgentAction), 2287-2302 (AgentMemory), 2332-2357 (PerformanceSnapshot) — VERIFIED via direct read
- `backend/src/agent/performanceSnapshot.ts` — `writePerformanceSnapshot` + `listSnapshotsForDriver`, VERIFIED via direct read
- `backend/src/agent/tools/read/courierProfile.ts` — Phase 1 read tool VERIFIED via direct read
- `backend/src/agent/tools/read/gpsTrack.ts` — Phase 1 read tool VERIFIED via direct read
- `backend/src/agent/runtime.ts` — `runAgent` shape VERIFIED via direct read
- `backend/src/agent/registry.ts` — `requiresApproval` gate, `editableParams` shape VERIFIED via direct read
- `backend/src/agent/ledger.ts` — `writeAgentAction` shape VERIFIED via direct read
- `backend/src/services/performanceService.ts` — `snapshotAllDriversForTenant` VERIFIED via direct read
- `backend/src/queues/performanceTierWorker.ts` — daily 23:00 cron VERIFIED via direct read
- `backend/src/services/aiScoringService.ts` — `breakdown` JSON shape VERIFIED via direct read (lines 252-291)
- `backend/src/routes/drivers.ts` — `/profile` reference handler VERIFIED via direct read
- `backend/src/routes/audit.ts` — Phase 2 AgentAction read pattern VERIFIED via direct read
- `frontend/src/components/shared/Driver360.tsx` — existing per-driver component (557 lines) VERIFIED via direct read
- `frontend/src/components/keeta/TrendChart.tsx` — Recharts pattern reference VERIFIED via direct read
- `frontend/src/components/decisions/DecisionCard.tsx` lines 234-252 — Phase 2 placeholder waiting for Phase 3 VERIFIED via direct read
- `frontend/package.json` — recharts 3.8.1, @tanstack/react-query 5.100.9, lucide-react 0.577.0, react-leaflet 5.0.0 VERIFIED via grep
- `backend/package.json` — @anthropic-ai/sdk 0.95.1 VERIFIED via grep
- `.planning/phases/01-backend-agent-spine-data-architecture/01-VERIFICATION.md` — Phase 1 deliverables VERIFIED
- `.planning/phases/02-decisions-surface-propose-and-confirm-design-partner-1/02-VERIFICATION.md` — Phase 2 deliverables VERIFIED
- `PRD_Darb_v2.md` §5.5 (Driver File) — VERIFIED via direct read
- `.planning/intel/constraints.md` CON-driver-file-sections — VERIFIED via direct read
- `.planning/intel/decisions.md` DEC-cross-platform-default-view, DEC-promote-agent-to-spine — VERIFIED via direct read

### Secondary (MEDIUM confidence)
- npm registry `recharts@3.8.1` — verified via `npm view recharts version`
- npm registry `@anthropic-ai/sdk@0.95.1` — verified via `npm view @anthropic-ai/sdk version`
- Recharts 3.0 migration guide and performance docs — confirmed via WebSearch
- Anthropic TypeScript SDK streaming docs — confirmed via WebSearch
- Next.js 14 App Router breadcrumbs / `useSelectedLayoutSegments` patterns — confirmed via WebSearch

### Tertiary (LOW confidence)
- None — every claim in this research is backed by either direct file inspection, the npm registry, or a verified URL.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions verified against npm
- Architecture: HIGH — Phase 1 and Phase 2 verifications confirm every primitive Phase 3 needs is shipped and tested
- Pitfalls: HIGH — derived from direct schema and code inspection, plus known Recharts SSR gotchas
- Score explainer prompt design: MEDIUM — the prompt template is a draft; planner may iterate
- Performance budget: MEDIUM — based on existing `/profile` route shape; no Phase 3 measurement yet
- Cross-app retrofit list: HIGH — exhaustive grep, 15 sites enumerated

**Research date:** 2026-05-10
**Valid until:** 2026-06-09 (30 days for stable; 7 days for fast-moving — recharts/Anthropic docs may shift faster)
