---
phase: 06-ingest-adapter-layer
plan: 00
subsystem: backend-tests-and-lint-scope
tags: [phase-6, wave-0, red-tests, ingest-adapter, tdd-scaffolding]
dependency-graph:
  requires: [phase-2 onboardingBackwashWorker baseline, phase-1 walking-skeleton]
  provides:
    - RED-test-suite-for-IngestAdapter-interface
    - RED-test-suite-for-CompositeAdapter-precedence
    - RED-test-suite-for-getAdapter-registry
    - RED-test-suite-for-writeIngestRun-audit
    - RED-test-suite-for-shared-normalizers
    - RED-test-Wave-1-OrderSource.MOBILE_GPS-migration-gate
    - RED-test-suite-for-Keeta-XLSX-scraper-mobile-adapters
    - RED-test-suite-for-Talabat-XLSX-scraper-adapters
    - RED-test-suite-for-Deliveroo-XLSX-scraper-adapters
    - RED-test-suite-for-Americana-XLSX-email-adapters
    - RED-test-POST-/api/talabat/import-route
    - RED-test-POST-/api/deliveroo/import-route
    - RED-test-pullChunkPhase6-chunk-handler
    - RED-test-composite-fetchCash-XLSX-import-only-contract
    - RED-test-lint:tenant-fires-on-services/ingest/-scope
    - XLSX-fixture-builders-Keeta-Talabat-Deliveroo-Americana
    - lint:tenant-scope-extension-to-src/services/ingest/
  affects: []
tech-stack:
  added: []
  patterns:
    - "Programmatic XLSX fixture generation via xlsx@0.18.5 (no binary commits)"
    - "Compile-time @@unique key shape pin via Prisma.WhereUniqueInput type extraction (WARNING 12)"
    - "supertest + express harness for route tests"
    - "jest.mock('../../config') pattern lifted from Phase 1/2 agentMocks"
    - "Prisma type assertion as Wave-1-migration verification gate (Nyquist)"
key-files:
  created:
    - backend/src/__tests__/services/ingest/types.test.ts
    - backend/src/__tests__/services/ingest/composite.test.ts
    - backend/src/__tests__/services/ingest/registry.test.ts
    - backend/src/__tests__/services/ingest/audit.test.ts
    - backend/src/__tests__/services/ingest/normalize.test.ts
    - backend/src/__tests__/services/ingest/orderSourceMobileGps.test.ts
    - backend/src/__tests__/services/ingest/compositeFetchCash.test.ts
    - backend/src/__tests__/services/ingest/keeta/keetaAdapter.test.ts
    - backend/src/__tests__/services/ingest/talabat/talabatAdapter.test.ts
    - backend/src/__tests__/services/ingest/deliveroo/deliverooAdapter.test.ts
    - backend/src/__tests__/services/ingest/americana/americanaAdapter.test.ts
    - backend/src/__tests__/services/ingest/_lintNegative.test.ts
    - backend/src/__tests__/services/ingest/_lint_negative.fixture.ts.txt
    - backend/src/__tests__/routes/talabatImport.test.ts
    - backend/src/__tests__/routes/deliverooImport.test.ts
    - backend/src/__tests__/queues/pullChunkPhase6.test.ts
    - backend/src/__tests__/services/ingest/fixtures/index.ts
    - backend/src/__tests__/services/ingest/fixtures/keetaSample.xlsx.ts
    - backend/src/__tests__/services/ingest/fixtures/talabatSample.xlsx.ts
    - backend/src/__tests__/services/ingest/fixtures/deliverooSample.xlsx.ts
    - backend/src/__tests__/services/ingest/fixtures/americanaSample.xlsx.ts
  modified:
    - backend/package.json
decisions:
  - "Pin @@unique key shape via Prisma.<Model>WhereUniqueInput type extraction so the schema drifts break compile (WARNING 12 mitigation)"
  - "Generate XLSX fixtures programmatically with the existing xlsx@0.18.5 library — no binary files committed (keeps diff readable + matches Phase 1+2 fixture pattern)"
  - "OrderSource.MOBILE_GPS Prisma enum test runs against @prisma/client; will FAIL until Wave 1 ships `prisma migrate dev --name add_mobile_gps_order_source` + `prisma generate` — that is the dedicated Nyquist gate proving the migration ran"
  - "lint:tenant extension uses the existing --no-error-on-unmatched-pattern flag so exit=0 holds while services/ingest/ is empty; from Wave 1 onward every adapter file is gated"
metrics:
  duration: "~25 min (Task 1 file creation + Task 2 single-line edit)"
  completed: "2026-05-13"
  tasks_completed: 2
  files_created: 21
  files_modified: 1
---

# Phase 6 Plan 00: Wave 0 RED Test Scaffolding Summary

**One-liner:** 13 RED Jest test files + 4 programmatic XLSX fixture builders + lint:tenant scope extension to services/ingest/ — every Wave 1-4 Phase 6 task now has a failing test waiting to turn GREEN.

## What shipped

### Task 1 — 21 test scaffolding files (commit `40e6030`)

**13 RED .test.ts files** covering every Phase 6 production deliverable:

| Test file | What it pins | Turns GREEN in |
|-----------|-------------|----------------|
| `services/ingest/types.test.ts` | `IngestAdapter` interface contract, `NotAvailable` exception, `NormalizedRow<T>` shape, `AdapterSource` union (6 values) | Wave 1 |
| `services/ingest/composite.test.ts` | `CompositeAdapter` precedence chain (6 tests: first-tier-wins, NotAvailable fallthrough, all-empty → `[]`, non-NotAvailable re-throw per Pitfall 4, `isAvailable` OR-fold) | Wave 1 |
| `services/ingest/registry.test.ts` | `getAdapter(platform, ctx)` returns `CompositeAdapter` for each of KEETA/TALABAT/DELIVEROO/AMERICANA | Wave 1 |
| `services/ingest/audit.test.ts` | `writeIngestRun({tenantId, platform, source, status, ...})` creates tenant-scoped `IngestRun` row; errorLog truncated to 4000 chars | Wave 1 |
| `services/ingest/normalize.test.ts` | `parseLocalDate`, `parseMoneyKwd`, `normaliseDriverName` shared helpers (incl. XLSX serial 45000 → 2023-03-15 pin per WARNING 6) | Wave 1 |
| `services/ingest/orderSourceMobileGps.test.ts` | Prisma `OrderSource.MOBILE_GPS` enum value — dedicated Nyquist migration gate | Wave 1 (prisma migrate + generate) |
| `services/ingest/compositeFetchCash.test.ts` | BLOCKER 2: `composite.fetchCash` returns `[]` for all 4 platforms (XLSX-import-only contract) | Wave 1 + Wave 4 |
| `services/ingest/keeta/keetaAdapter.test.ts` | `KeetaXlsxAdapter` upsert + idempotent + tenant-scoped + unknown-driver errors[]; `KeetaScraperAdapter` creds-based `isAvailable`; `KeetaMobileAdapter` empty-LocationLog → false | Wave 2 |
| `services/ingest/talabat/talabatAdapter.test.ts` | `TalabatXlsxAdapter` MVP 5-column shape + bad-headers reject + idempotent + cross-tenant reject; `TalabatScraperAdapter` always-`NotAvailable`; compile-time @@unique pin | Wave 2a |
| `services/ingest/deliveroo/deliverooAdapter.test.ts` | Mirror Talabat shape for Deliveroo; compile-time @@unique pin | Wave 2b |
| `services/ingest/americana/americanaAdapter.test.ts` | `AmericanaXlsxAdapter` wraps existing parser + side-effects; `AmericanaEmailAdapter` thin-shim re-export | Wave 2c |
| `routes/talabatImport.test.ts` | POST /api/talabat/import — 200 success shape, 400 no-file, IngestRun row written, idempotent, cross-tenant reject | Wave 3 |
| `routes/deliverooImport.test.ts` | Mirror Talabat for Deliveroo | Wave 3 |
| `queues/pullChunkPhase6.test.ts` | BLOCKER 4: calls fetchOrders/Shifts/Attendance/Violations, NEVER calls fetchCash, NotAvailable fallthrough, error capture in errorLog, 1 IngestRun/chunk with `source='BACKWASH'` | Wave 4 |
| `services/ingest/_lintNegative.test.ts` | `no-prisma-without-tenant` rule fires on the broken fixture inside services/ingest/** scope | Task 2 (this plan) |

**4 XLSX fixture builders + 1 fixtures/index.ts** (programmatic via xlsx@0.18.5):
- `fixtures/keetaSample.xlsx.ts` — 27-column Keeta shape matching `parseKeetaXlsx`
- `fixtures/talabatSample.xlsx.ts` — MVP 5-column `{date, driver_id, orders_count, online_minutes, attendance_status}`
- `fixtures/deliverooSample.xlsx.ts` — same MVP shape
- `fixtures/americanaSample.xlsx.ts` — daily-orders shape for `parseAmericanaDailyXlsx` wrap
- `fixtures/index.ts` — aggregator re-exporting all 4 builders + their malformed counterparts

**1 lint negative fixture** (`_lint_negative.fixture.ts.txt`) — deliberately broken `prisma.driver.findFirst` without tenantId filter; `.txt` extension keeps TypeScript off but ESLint can still parse it via the `--parser` flag.

### Task 2 — lint:tenant scope extension (commit `52a141e`)

Added `src/services/ingest/` to the existing `lint:tenant` script in `backend/package.json` line 17. The `--no-error-on-unmatched-pattern` flag (already in the script) keeps exit=0 while the directory is empty; from Wave 1 onward every file under services/ingest/ is gated by `no-prisma-without-tenant`.

Verified: `npm run lint:tenant` exits 0.

## Verification

| Gate | Command | Result |
|------|---------|--------|
| 21 test files exist | `ls ...` | 21/21 ✅ |
| Phase 6 tests are RED | `npx jest --testPathPatterns='services/ingest'` | FAIL with `Cannot find module '.../services/ingest/types'` etc. ✅ |
| 15 test files discovered by Jest | `npx jest --testPathPatterns='services/ingest\|routes/(talabat\|deliveroo)Import\|queues/pullChunkPhase6' --listTests` | 15 ✅ |
| Phase 2 baseline preserved | `npx jest --testPathPatterns='queues/onboardingBackwashWorker'` | 3 passed ✅ |
| lint:tenant scope extended | `grep 'src/services/ingest/' backend/package.json` | 1 match ✅ |
| lint:tenant exits 0 | `npm run lint:tenant; echo $?` | `0` ✅ |

## Deviations from Plan

**1. [Rule 2 — Missing critical functionality] Defensive `if (adapter.fetchOrders)` guards in adapter tests**

- **Found during:** Task 1 (Keeta scraper / Talabat scraper / Deliveroo scraper adapter tests)
- **Issue:** The plan describes `fetchOrders throws NotAvailable` for scrapers that have no creds, but `IngestAdapter.fetchOrders` is *optional* per the interface contract. If the Wave 2 implementation chooses to omit the method entirely (rather than throw), the test would crash on `adapter.fetchOrders!(...)`.
- **Fix:** Tests use `if (adapter.fetchOrders) { await expect(...).rejects.toBeInstanceOf(NotAvailable); }` — both implementation strategies (omit OR throw) satisfy the test, matching the interface's optionality.
- **Files modified:** `keeta/keetaAdapter.test.ts`, `talabat/talabatAdapter.test.ts`, `deliveroo/deliverooAdapter.test.ts`
- **Commit:** `40e6030`

**2. [Rule 3 — Blocking issue] Inadvertent pre-existing untracked tests bundled into Task 2 commit**

- **Found during:** Task 2 commit
- **Issue:** `git add backend/package.json` was the only intended stage, but the surrounding `__tests__/agent/`, `__tests__/middleware/`, `__tests__/services/` namespace contained pre-existing untracked files (`deliveryPhoto.test.ts`, `locationIngest.test.ts`, `presignFlow.test.ts`, `agentRateLimit.test.ts`, `activePlatformAttribution.test.ts`) authored by a prior session. These were swept into commit `52a141e`.
- **Status:** These files appear to belong to Phase 5 (mobile-app) and Phase 3+ (rate limiter) work and are referenced by the existing lint:tenant scope (`src/__tests__/services/activePlatformAttribution.test.ts` was already in the lint glob before this plan started — pre-existing modification visible in `git diff` snapshot). They are not destructive and do not modify production code, but they should not have ridden in on the chore(06-00) commit.
- **Resolution:** Did NOT revert per `<destructive_git_prohibition>`. Flagged here in deviation log so the next planning agent can verify these tests belong to their owning phase or relocate them as needed.

**3. [Rule 1 — Bug] Skipped redundant `fetchCash` spy assertion inside compositeFetchCash.test.ts**

- **Found during:** Task 1 (compositeFetchCash test design)
- **Issue:** The plan asks for a `fetchCash` spy with `expect(spy.callCount === 0)` inside `compositeFetchCash.test.ts`, but the worker-level `pullChunkPhase6` is a separate import surface; spying on `fetchCash` from inside `compositeFetchCash.test.ts` (where the composite is constructed manually) doesn't reach the worker's adapter instance.
- **Fix:** The `fetchCash` spy assertion is consolidated in `pullChunkPhase6.test.ts` (where it has the correct registry mock surface). `compositeFetchCash.test.ts` asserts only the composite-level contract (returns `[]`) and the worker-level audit row. This preserves coverage without duplicating spy plumbing.
- **Files modified:** `services/ingest/compositeFetchCash.test.ts`, `queues/pullChunkPhase6.test.ts`
- **Commit:** `40e6030`

## Threat Flags

None. Wave 0 ships test scaffolding + lint scope only; no production code, no new endpoints, no new auth paths, no schema changes.

## Self-Check: PASSED

- `backend/src/__tests__/services/ingest/types.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/composite.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/registry.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/audit.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/normalize.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/orderSourceMobileGps.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/compositeFetchCash.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/keeta/keetaAdapter.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/talabat/talabatAdapter.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/deliveroo/deliverooAdapter.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/americana/americanaAdapter.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/_lintNegative.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/_lint_negative.fixture.ts.txt` — FOUND
- `backend/src/__tests__/routes/talabatImport.test.ts` — FOUND
- `backend/src/__tests__/routes/deliverooImport.test.ts` — FOUND
- `backend/src/__tests__/queues/pullChunkPhase6.test.ts` — FOUND
- `backend/src/__tests__/services/ingest/fixtures/index.ts` — FOUND
- `backend/src/__tests__/services/ingest/fixtures/keetaSample.xlsx.ts` — FOUND
- `backend/src/__tests__/services/ingest/fixtures/talabatSample.xlsx.ts` — FOUND
- `backend/src/__tests__/services/ingest/fixtures/deliverooSample.xlsx.ts` — FOUND
- `backend/src/__tests__/services/ingest/fixtures/americanaSample.xlsx.ts` — FOUND
- Commit `40e6030` — FOUND
- Commit `52a141e` — FOUND
