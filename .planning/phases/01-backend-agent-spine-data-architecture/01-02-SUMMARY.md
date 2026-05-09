---
phase: 01-backend-agent-spine-data-architecture
plan: 02
subsystem: data-primitives-and-daily-snapshot-writer
tags: [agent-spine, ledger, memory, pinned-view, metric-event, performance-snapshot, daily-worker, tdd-green, wave-2]
dependency_graph:
  requires:
    - 01-00-PLAN.md (Wave 0 RED tests + Jest mocks)
    - 01-01-PLAN.md (Wave 1 schema + module relocation)
  provides:
    - agent-ledger-writeAgentAction
    - agent-memory-upsert-and-latest-by-key
    - agent-pinned-view-crud
    - agent-metric-event-recorder
    - agent-performance-snapshot-writer
    - daily-snapshot-worker-23h-local
    - agent-index-data-primitives-public-api
  affects:
    - backend/src/agent/
    - backend/src/services/performanceService.ts
    - backend/src/queues/performanceTierWorker.ts
tech_stack:
  added: []
  patterns:
    - "Append-only AgentMemory writer (RESEARCH §4) — `upsert*` name, `create` semantics; latest-by-key reads via `findFirst orderBy createdAt desc`"
    - "CON-audit-row-shape ledger writer with hardcoded proposer='Darb' (T-01-W2-01) and required-field validation guards"
    - "PerformanceSnapshot UTC-midnight truncation before upsert on `tenantId_driverId_snapshotDate` compound key — cross-timezone-safe daily idempotency"
    - "Two-step (find → delete) PinnedView removal triple-scoped by (id, tenantId, userId) — defense-in-depth against id-guess deletions across users (T-01-W2-04)"
    - "Two-pass scheduler in `performanceTierWorker.maybeRun()` — weekly tier rollup (existing) + daily snapshot pass (new), each guarded by independent env flag"
    - "Single-source AiScore → PerformanceSnapshot mirror to keep score-derivation logic in one place; the snapshot table is a write-optimized read replica for Phase 3's trend chart"
key_files:
  created:
    - backend/src/agent/ledger.ts
    - backend/src/agent/memory.ts
    - backend/src/agent/pinnedView.ts
    - backend/src/agent/metricEvent.ts
    - backend/src/agent/performanceSnapshot.ts
  modified:
    - backend/src/agent/index.ts (added 5-primitive re-export block)
    - backend/src/services/performanceService.ts (appended snapshotAllDriversForTenant + snapshotAllTenants)
    - backend/src/queues/performanceTierWorker.ts (added daily-snapshot pass at 23:00 local)
decisions:
  - "PinnedView listForUser uses `orderBy: { sortOrder: 'asc' }` (single-object form) — the test contract at pinnedView.test.ts:51 expects exactly that shape. Plan suggested `[{sortOrder:'asc'}, {pinnedAt:'desc'}]` (array form) but TEST WINS per project rule. Tracked as a deviation below."
  - "writePerformanceSnapshot does NOT use `Prisma.Decimal` for `cashOutstandingKd` — passes plain `number ?? null` and lets Prisma's runtime marshal to Decimal(10, 3). The execution-rules note flagged this; in practice Prisma Client accepts number → Decimal coercion natively for @db.Decimal fields, and using Prisma.Decimal here would force the writer to import the generated client (defeating the prismaExtensions singleton pattern). Documented for Wave 4 review if precision drift materializes."
  - "snapshot worker pass triggered at 23:00 LOCAL time (per plan), not UTC — the host server's local clock is how the existing weekly-tier pass already keys; staying consistent. Kuwait local = UTC+3 = 20:00 UTC."
  - "Daily snapshot worker reads `today's AiScore rows` (>= UTC midnight, < tomorrow UTC midnight) — not local — because writePerformanceSnapshot's UTC-midnight truncation makes the snapshotDate match regardless of when the worker fires. This pairs cleanly even though the firing time is local."
metrics:
  duration_minutes: 12
  completed: 2026-05-09T16:15:00Z
  tasks_completed: 3
  files_created: 5
  files_modified: 3
  commits:
    - "b9a06be — Task 2.1 (AgentAction ledger + AgentMemory primitives)"
    - "017f54a — Task 2.2 (PinnedView CRUD + MetricEvent recorder)"
    - "bebc607 — Task 2.3 (PerformanceSnapshot writer + daily worker integration)"
requirements:
  - REQ-data-agent-action
  - REQ-data-agent-memory
  - REQ-data-pinned-view
  - REQ-data-metric-event
  - REQ-data-performance-snapshot
---

# Phase 1 Plan 02: Wave 2 — Data Primitives + Daily Snapshot Writer Summary

**One-liner:** 5 typed agent-data primitives (`writeAgentAction`,
`upsertAgentMemory + latestMemoryByKey`, `createPinnedView + listPinsForUser
+ removePinnedView`, `recordMetricEvent`, `writePerformanceSnapshot +
listSnapshotsForDriver`) + extension of `performanceTierWorker` to fire a
daily PerformanceSnapshot pass at 23:00 local. 5 of the 9 Wave-0 RED tests
turn GREEN (ledger, memory, pinnedView, metricEvent, performanceSnapshot
all pass; schema sentinel stays GREEN; strict, tenantIsolation,
walkingSkeleton stay RED for Waves 3 + 4).

## Public API of the 5 Primitive Modules

### 1. `backend/src/agent/ledger.ts` — REQ-data-agent-action

```typescript
export interface AuditRow {
  tenantId: string;
  approverUserId: string;
  agentRunId?: string;
  toolName: string;
  originalProposal: unknown;
  modificationsBeforeApproval?: unknown;
  outcome: "success" | "failure" | "rolled_back";
  reasoning: string;
  errorMessage?: string;
  modelName?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  subjectType?: string;
  subjectId?: string;
}
export async function writeAgentAction(row: AuditRow): Promise<{ id: string }>;
```

**Behavior contract:** validates `tenantId`, `approverUserId`, `toolName`,
`outcome` are non-empty + outcome is in the whitelist; hardcodes
`proposer: "Darb"` on the persisted data object (T-01-W2-01 mitigation —
caller cannot override); persists optional run-link, model telemetry,
subject pointer.

### 2. `backend/src/agent/memory.ts` — REQ-data-agent-memory

```typescript
export type MemorySource = "agent_observation" | "user_correction" | "explicit_set";
export interface MemoryEntry {
  tenantId: string;
  key: string;
  value: unknown;
  confidence?: number;
  source?: MemorySource;
  agentRunId?: string;
}
export async function upsertAgentMemory(entry: MemoryEntry): Promise<{ id: string }>;
export async function latestMemoryByKey(tenantId: string, key: string): Promise<MemoryRecord | null>;
export async function listMemoriesByPrefix(tenantId: string, keyPrefix: string, limit?: number): Promise<MemoryRecord[]>;
```

**Behavior contract:** APPEND-ONLY by design — every `upsertAgentMemory`
call writes a fresh row via `prisma.agentMemory.create`. The mock (and the
test on memory.test.ts:37) explicitly asserts that no `update` shim exists
on the delegate. `latestMemoryByKey` resolves "current value" via
`findFirst({ orderBy: { createdAt: "desc" } })`. `listMemoriesByPrefix`
caps `take` at 200 even if a caller asks for more.

### 3. `backend/src/agent/pinnedView.ts` — REQ-data-pinned-view

```typescript
export type PinnedViewType = "table" | "chart" | "kpi_strip" | "map" | "comparison";
export interface PinnedViewSpec {
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  viewType: PinnedViewType;
  spec: object;
  sortOrder?: number;
}
export async function createPinnedView(view: PinnedViewSpec): Promise<{ id: string }>;
export async function listPinsForUser(tenantId: string, userId: string): Promise<PinnedViewRecord[]>;
export async function removePinnedView(id: string, tenantId: string, userId: string): Promise<{ removed: boolean }>;
```

**Behavior contract:** Every Prisma call carries BOTH `tenantId` AND
`userId` (T-01-W2-04 — listPinsForUser cannot leak across users).
`removePinnedView` is a 2-step find-then-delete pattern, with the find
triple-scoped by `(id, tenantId, userId)`; if the find returns null, the
delete is skipped and the function returns `{removed: false}`.
`viewType` is whitelist-validated.

### 4. `backend/src/agent/metricEvent.ts` — REQ-data-metric-event

```typescript
export interface MetricEventInput {
  tenantId: string;
  userId?: string;
  event: string;
  properties?: object;
  sessionId?: string;
}
export async function recordMetricEvent(input: MetricEventInput): Promise<{ id: string }>;
```

**Behavior contract:** Requires `tenantId` + `event`. `userId` optional
for system events (cron ticks, worker heartbeats) — both `null` and
`undefined` serialise to NULL in PG. `properties` and `sessionId` are
both optional.

### 5. `backend/src/agent/performanceSnapshot.ts` — REQ-data-performance-snapshot

```typescript
export type ScoreTrend = "UP" | "DOWN" | "STABLE";
export interface PerformanceSnapshotInput {
  tenantId: string;
  driverId: string;
  snapshotDate: Date;
  compositeScore: number;
  attendanceScore: number;
  deliveryScore: number;
  financialScore: number;
  equipmentScore: number;
  platformScore: number;
  trend: ScoreTrend;
  ordersCount?: number;
  shiftsCount?: number;
  violationsCount?: number;
  cashOutstandingKd?: number;
  breakdown?: object;
}
export async function writePerformanceSnapshot(input: PerformanceSnapshotInput): Promise<{ id: string }>;
export async function listSnapshotsForDriver(tenantId: string, driverId: string, daysBack?: number): Promise<PerformanceSnapshotInput[]>;
```

**Behavior contract:** `snapshotDate` is truncated to UTC midnight via
`new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))`
before write or read. Upsert keyed on the
`tenantId_driverId_snapshotDate` compound `@@unique` index. Default
`daysBack = 90` covers Phase 3's trend chart.

## Daily Snapshot Worker Integration

**File:** `backend/src/queues/performanceTierWorker.ts`
**Lines added:** the original 26-line file became 67 lines. The new
daily-snapshot pass is at **lines 38-58** of the new file (the second of
two scheduled passes inside `maybeRun()`). Concretely:

```typescript
// ── Daily PerformanceSnapshot writer (every day, 23:00 local) ────────────
// Backs Phase 3's Driver File 90-day trend. Reads from today's AiScore rows
// (written earlier by existing scoring jobs) and mirrors into the
// PerformanceSnapshot table. Idempotent via upsert.
if (process.env.DISABLE_PERFORMANCE_SNAPSHOT !== "1") {
  if (now.getHours() === 23) {
    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-snap`;
    if (lastSnapshotDayKey !== dayKey) {
      lastSnapshotDayKey = dayKey;
      try {
        const r = await snapshotAllTenants();
        console.log(
          `[performanceTierWorker] snapshot: ${r.written} written, ${r.failed} failed across ${r.tenants} tenants`,
        );
      } catch (err: any) {
        console.error(
          "[performanceTierWorker] snapshot run failed:",
          err?.message ?? err,
        );
      }
    }
  }
}
```

The pass shares the existing 1-hour `setInterval` polling loop — no new
timer was created. Independent env flag (`DISABLE_PERFORMANCE_SNAPSHOT=1`)
lets ops disable just the snapshot pass without affecting the weekly tier
rollup. The `lastSnapshotDayKey` guard ensures at-most-once-per-day firing
even if the polling loop visits 23:xx multiple times.

`performanceService.ts` got two new exports appended:

- `snapshotAllDriversForTenant(tenantId)` — reads today's AiScore rows for
  the tenant and mirrors each into PerformanceSnapshot via
  `writePerformanceSnapshot`. Per-driver try/catch so one failure doesn't
  halt the loop.
- `snapshotAllTenants()` — `prisma.tenant.findMany({select: {id:true}})`
  + sequential per-tenant calls. Returns `{tenants, written, failed}`.

## Test File Status at End of Wave 2

| Test File                                      | Status at Wave 2 End | Tests Passing |
| ---------------------------------------------- | -------------------- | ------------- |
| `agent/schema.test.ts`                         | **GREEN** (sentinel) | 6/6           |
| `agent/ledger.test.ts`                         | **GREEN**            | 5/5           |
| `agent/memory.test.ts`                         | **GREEN**            | 4/4           |
| `agent/pinnedView.test.ts`                     | **GREEN**            | 4/4           |
| `agent/metricEvent.test.ts`                    | **GREEN**            | 3/3           |
| `agent/performanceSnapshot.test.ts`            | **GREEN**            | 4/4           |
| `agent/tools/strict.test.ts`                   | RED                  | (Wave 3)      |
| `agent/tools/tenantIsolation.test.ts`          | RED                  | (Wave 3)      |
| `agent/walkingSkeleton.test.ts`                | RED                  | (Wave 3 + 4)  |

**Aggregate at Wave 2 end:** `Test Suites: 3 failed, 6 passed, 9 total`,
`Tests: 2 failed, 26 passed, 28 total`.

**Non-agent regression:** `Test Suites: 8 passed, 8 total. Tests: 102
passed, 102 total.` Zero pre-existing tests broke.

## Verification Commands (all PASS at end of Wave 2)

```bash
cd backend
npm test -- --testPathPatterns="agent/(ledger|memory|pinnedView|metricEvent|performanceSnapshot|schema)\\.test\\.ts"
# → 6 suites, 26 tests, all PASS

npx tsc --noEmit
# → exit 0 (zero errors)

npm run lint:tenant
# → exit 0

grep -c 'proposer:[[:space:]]*"Darb"' src/agent/ledger.ts                  # → 1
grep -oE "writeAgentAction|upsertAgentMemory|createPinnedView|recordMetricEvent|writePerformanceSnapshot" \
  src/agent/index.ts | sort -u | wc -l                                      # → 5
grep -c "snapshotAllTenants" src/queues/performanceTierWorker.ts          # → 2 (import + call)

npx jest --testPathIgnorePatterns=agent
# → 102 passed (no regression)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] PinnedView `listForUser` orderBy shape mismatch**

- **Found during:** Task 2.2 first test run.
- **Issue:** The plan's prescribed implementation used
  `orderBy: [{ sortOrder: "asc" }, { pinnedAt: "desc" }]` (array form),
  but `pinnedView.test.ts:51` asserts exactly
  `orderBy: { sortOrder: "asc" }` (single-object form). Per the project's
  TEST-WINS rule on contract conflicts, the test is canon.
- **Fix:** Implemented `listPinsForUser` with the single-object form. The
  loss of secondary sort by `pinnedAt: desc` is recoverable when (a)
  Phase 4 adds the consumer and (b) the test is relaxed to allow
  multi-key — neither blocks Wave 2.
- **Files modified:** `backend/src/agent/pinnedView.ts`
- **Commit:** `017f54a` (Task 2.2)

**2. [Rule 1 — Bug] `cashOutstandingKd` Decimal handling deviation**

- **Found during:** Task 2.3 implementation review against the deviation_handling
  hint in the executor prompt.
- **Issue:** The hint suggested using `Prisma.Decimal` in the writer for
  the `cashOutstandingKd: Decimal? @db.Decimal(10, 3)` column. Importing
  `Prisma.Decimal` requires importing from `@prisma/client` directly,
  which would defeat the prismaExtensions singleton pattern (the codebase
  has ONE Prisma client instance imported from `config/prisma.ts`).
- **Fix:** Pass plain `number ?? null` and let Prisma Client's runtime
  marshal to Decimal — Prisma natively accepts number coercion for
  `@db.Decimal` fields. Documented in decisions block above. If
  precision drift surfaces in Phase 3, Wave 4 can switch to
  `Prisma.Decimal` AND extend the prisma config to re-export the
  Decimal type alongside the singleton client.
- **Files modified:** `backend/src/agent/performanceSnapshot.ts`
- **Commit:** `bebc607` (Task 2.3)

### Architectural Decisions Without Required Approval

None. Both deviations were Rule 1 auto-fixes — neither required
architectural input from the user.

## Threat Surface Recap (no new flags)

The Wave 2 threat register (T-01-W2-01 through T-01-W2-09 in the plan)
is fully addressed:

- **T-01-W2-01** (proposer tampering) → mitigated. `proposer: "Darb"`
  hardcoded in writer; not a field on AuditRow interface; verified by
  `grep -c 'proposer:\s*"Darb"' = 1`.
- **T-01-W2-02** (audit-log mutation) → mitigated. Wave 2 code calls
  ZERO `agentAction.update` or `agentAction.delete`; `rolledBack*` fields
  on the schema are reserved for Phase 12.
- **T-01-W2-03** (memory tenant leak) → mitigated. Every prisma call in
  memory.ts carries `tenantId`; lint:tenant passes.
- **T-01-W2-04** (pinned-view cross-user leak) → mitigated. listForUser
  scopes by `tenantId AND userId`; removePinnedView uses 2-step
  find-then-delete triple-scoped by `(id, tenantId, userId)`.
- **T-01-W2-05** (recordMetricEvent properties pollution) → accepted per
  plan; metric events are write-only in Phase 1.
- **T-01-W2-06** (snapshotAllTenants iterates every tenant) → mitigated.
  Worker context only; `tenant.findMany({ select: { id: true } })`
  exposes IDs only.
- **T-01-W2-07** (snapshot bulk-iteration DoS) → mitigated. Sequential
  for-of with per-driver try/catch; documented expected runtime.
- **T-01-W2-08** (PII in agentMemory.value) → mitigated. Tenant-scoped;
  Phase 11 will add retention policy (out of Phase 1 scope).
- **T-01-W2-09** (raw `@prisma/client` bypass) → mitigated. All 5 new
  modules import from `config` (single-source).

No new threat flags. No new HTTP surface, no new outbound integrations,
no new secrets.

## What Wave 3 Should Do First

1. **Run the test suite to confirm Wave 2 state holds:**
   ```bash
   cd backend && npm run test:agent
   ```
   Expected: `Test Suites: 3 failed, 6 passed, 9 total`. The 3 RED suites
   are `tools/strict.test.ts`, `tools/tenantIsolation.test.ts`, and
   `walkingSkeleton.test.ts` — all turn GREEN as Wave 3 ships the 11
   purpose-built read tools and Wave 4 ships the migration + walking
   skeleton wiring.

2. **Read tools land alongside `agent/tools/_legacy/` (NOT inside it).**
   The new tools live at `backend/src/agent/tools/{toolName}.ts` —
   straight at depth 1 under `tools/`, with the legacy ports staying
   under `tools/_legacy/` until Wave 4 deletes them.

3. **All read tools must use the prismaExtensions tenant-scoped client**
   (i.e., `import { prisma } from "../../config"`) — same pattern Wave 2
   used. The lint:tenant rule will reject any prisma call missing
   tenantId, so the tools' Zod-validated input must propagate
   `ctx.tenantId` to every where clause.

4. **Migration is still deferred to Wave 4** — Wave 3 read tools, like
   Wave 2 writers, run against the Jest mocks from Wave 0 +
   `agentMocks.ts`. Real DB queries don't fire until Wave 4's
   `prisma migrate dev`.

## TDD Gate Compliance

This plan is type `execute` (not `tdd`), but each task uses
`tdd="true"`. The Wave-0 RED-then-GREEN sequence holds at the per-task
level:

- Wave 0 (commit `3ded16a`) wrote the failing tests.
- Wave 2 commits `b9a06be`, `017f54a`, `bebc607` shipped the implementations
  that turn each batch GREEN.

No GREEN commit landed before its corresponding RED commit. Refactor
commits were unnecessary — the implementations were minimal-viable on
first write.

## Self-Check: PASSED

Verified all created files exist and all 3 commits are reachable:

```
FOUND: backend/src/agent/ledger.ts
FOUND: backend/src/agent/memory.ts
FOUND: backend/src/agent/pinnedView.ts
FOUND: backend/src/agent/metricEvent.ts
FOUND: backend/src/agent/performanceSnapshot.ts
FOUND COMMIT: b9a06be (Task 2.1 — ledger + memory)
FOUND COMMIT: 017f54a (Task 2.2 — pinnedView + metricEvent)
FOUND COMMIT: bebc607 (Task 2.3 — performanceSnapshot + worker)
```
