---
phase: 6
slug: ingest-adapter-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 6 — Validation Strategy

> Per-phase validation contract. Sourced from `06-RESEARCH.md` § Validation Architecture and the Wave 0 RED test inventory in `06-00-PLAN.md`. Phase 6 is a refactor + harness phase: existing ingest paths (Keeta scraper scaffold, Keeta XLSX, Americana XLSX, Americana email) MUST keep working. RED tests lock the contract before the refactor begins; new RED tests drive Wave 2-4 implementation deterministically.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend Framework** | Jest (verified via `backend/package.json::scripts.test = "jest"`) |
| **Backend config** | `backend/jest.config.js` |
| **Quick run command** | `cd backend && npm test -- --testPathPattern=ingest` |
| **Per-platform quick** | `cd backend && npx jest --testPathPattern='services/ingest/(keeta|talabat|deliveroo|americana)'` |
| **Routes quick** | `cd backend && npx jest --testPathPattern='routes/(talabat|deliveroo)Import'` |
| **Backwash quick** | `cd backend && npx jest --testPathPattern='queues/onboardingBackwashWorker'` |
| **Full suite command** | `cd backend && npm test` |
| **Lint scope** | `cd backend && npm run lint:tenant` |
| **Estimated runtime** | quick ~3-5s, full ~30-60s |

---

## Sampling Rate

- **After every task commit:** `cd backend && npm test -- --testPathPattern=ingest` (~3-5s for ingest unit tests)
- **After every plan wave:** Full backend suite green; `cd backend && npm test`
- **Phase gate:** Full suite green + `npm run lint:tenant` passes with `services/ingest/**` in scope before `/gsd-verify-work`
- **Max feedback latency:** ~5 seconds (quick), ~60 seconds (full)

---

## Per-Task Verification Map

> Pre-staged from research §Validation Architecture and Wave 0 RED test inventory (06-00-PLAN.md). Status will go from ⬜ to ✅ as Waves 1–4 implement against the Wave 0 RED scaffolding.

| Req ID | Behavior | Test Type | Automated Command | Status |
|--------|----------|-----------|-------------------|--------|
| REQ-ingest-adapter-layer | All four platforms expose `IngestAdapter` instances via `getAdapter(platform, ctx)` | unit | `npx jest --testPathPattern=services/ingest/registry` | ⬜ |
| REQ-ingest-adapter-layer | CompositeAdapter falls through on `NotAvailable`, halts on first non-empty result, propagates non-NotAvailable errors | unit | `npx jest --testPathPattern=services/ingest/composite` | ⬜ |
| REQ-ingest-adapter-layer | `IngestAdapter` interface contract + `NotAvailable` exception + `NormalizedRow<T>` shape compile and behave | unit | `npx jest --testPathPattern=services/ingest/types` | ⬜ |
| REQ-ingest-adapter-layer | `writeIngestRun` persists tenant-scoped IngestRun row; trims errorLog to 4000 chars; returns `{id}` | unit | `npx jest --testPathPattern=services/ingest/audit` | ⬜ |
| REQ-ingest-adapter-layer | Shared normalizers: `parseLocalDate`, `parseMoneyKwd`, `normaliseDriverName` | unit | `npx jest --testPathPattern=services/ingest/normalize` | ⬜ |
| REQ-ingest-adapter-layer | Prisma `OrderSource` enum includes `MOBILE_GPS` (turns GREEN after Wave 1's prisma migrate dev + generate) | unit | `npx jest --testPathPattern=services/ingest/orderSourceMobileGps` | ⬜ |
| REQ-ingest-adapter-layer | KeetaXlsxAdapter parses XLSX → upserts KeetaDailyMetrics (idempotent); KeetaScraperAdapter preserves PARTIAL/FAILED behavior; KeetaMobileAdapter `isAvailable=false` on empty LocationLog | unit | `npx jest --testPathPattern=services/ingest/keeta/keetaAdapter` | ⬜ |
| REQ-ingest-adapter-layer | TalabatXlsxAdapter parses MVP shape `{date, driver_id, orders_count, online_minutes, attendance_status}`; rejects malformed headers; idempotent; cross-tenant rejection. Compile-time @@unique key shape pinned | unit | `npx jest --testPathPattern=services/ingest/talabat/talabatAdapter` | ⬜ |
| REQ-ingest-adapter-layer | DeliverooXlsxAdapter same MVP shape; idempotent; cross-tenant rejection; malformed-header rejection | unit | `npx jest --testPathPattern=services/ingest/deliveroo/deliverooAdapter` | ⬜ |
| REQ-ingest-adapter-layer | AmericanaXlsxAdapter wraps `parseAmericanaDailyXlsx` + `processIngestionRows` (preserves attendance + violation side-effects); AmericanaEmailAdapter is thin re-export shim | unit | `npx jest --testPathPattern=services/ingest/americana/americanaAdapter` | ⬜ |
| REQ-ingest-adapter-layer | `POST /api/talabat/import` returns `{success, rowsIn, rowsOk, errors}` shape; writes IngestRun; idempotent; rejects cross-tenant | integration | `npx jest --testPathPattern=routes/talabatImport` | ⬜ |
| REQ-ingest-adapter-layer | `POST /api/deliveroo/import` same contract | integration | `npx jest --testPathPattern=routes/deliverooImport` | ⬜ |
| REQ-ingest-adapter-layer | `pullChunkPhase6` calls `getAdapter(platform).fetchOrders/fetchShifts/fetchViolations` for each capability; NotAvailable from one capability does NOT abort the chunk; writes 1 IngestRun row per chunk with `source="BACKWASH"` and `tenantId`; `cashRows: 0` (XLSX-import-only); returns `{rowsOk}` excluding cashRows | unit | `npx jest --testPathPattern=queues/pullChunkPhase6` | ⬜ |
| REQ-ingest-adapter-layer | `composite.fetchCash` returns `[]` for all 4 platforms (XLSX-import-only contract — backwash never produces cash rows) | unit | `npx jest --testPathPattern=services/ingest/compositeFetchCash` | ⬜ |
| REQ-ingest-adapter-layer | onboardingBackwashWorker chunked-window iteration still passes its existing 3 RED tests after pullChunk swap | regression | `npx jest --testPathPattern=queues/onboardingBackwashWorker` | ✅ existing — must continue to pass |
| REQ-ingest-adapter-layer | Tenant scope enforced: lint:tenant clean across `services/ingest/**`; deliberately-broken adapter snippet fixture triggers rule (negative test) | unit + lint | `npm run lint:tenant && npx jest --testPathPattern=services/ingest/_lint_negative` | ⬜ |
| REQ-ingest-adapter-layer | `keeta /import` route refactored to use `makeXlsxImportRoute("KEETA")` factory (consolidates to single code path); old inline parser+upsert deleted; existing keeta /import tests still pass | integration | `grep -E "router.post.*\"/import\".*makeXlsxImportRoute" backend/src/routes/keeta.ts` returns 1; `npx jest --testPathPattern=routes/keeta` | ⬜ |
| REQ-ingest-adapter-layer | keetaPortalScraperWorker tick refactored to invoke `new KeetaScraperAdapter().fetchOrders(...)` (consolidates to single code path); existing scheduler interval preserved | unit | `npx jest --testPathPattern=queues/keetaPortalScraperWorker` (if present) or grep verification | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> 11 RED test files + 4 XLSX fixture builders + 1 fixtures index + lint:tenant scope extension + lint negative-test fixture. Per the Nyquist rule, every Wave 1-4 task has a failing test waiting for it.

### RED test files (turn GREEN as Waves 1-4 ship)

- [ ] `backend/src/__tests__/services/ingest/types.test.ts` — IngestAdapter interface contract, NotAvailable, NormalizedRow<T>, AdapterSource union (incl. MOBILE_GPS)
- [ ] `backend/src/__tests__/services/ingest/composite.test.ts` — CompositeAdapter precedence + NotAvailable fallthrough + non-NotAvailable propagation (Pitfall 4)
- [ ] `backend/src/__tests__/services/ingest/compositeFetchCash.test.ts` — All 4 platforms `composite.fetchCash(...)` returns `[]` AND IngestRun records `cashRows: 0` with note "XLSX-import-only" (BLOCKER 2 contract)
- [ ] `backend/src/__tests__/services/ingest/registry.test.ts` — `getAdapter(platform, ctx)` returns CompositeAdapter for each of KEETA|TALABAT|DELIVEROO|AMERICANA
- [ ] `backend/src/__tests__/services/ingest/audit.test.ts` — `writeIngestRun({tenantId, platform, source, status, rowsIn, rowsOk, errorLog, startedAt, finishedAt})` creates IngestRun row tenant-scoped; trims errorLog to 4000 chars
- [ ] `backend/src/__tests__/services/ingest/normalize.test.ts` — `parseLocalDate`, `parseMoneyKwd`, `normaliseDriverName`. **Pinned**: `parseLocalDate(45000)` returns `new Date(Date.UTC(2023, 2, 15))` (XLSX serial 45000 = 2023-03-15)
- [ ] `backend/src/__tests__/services/ingest/orderSourceMobileGps.test.ts` — Asserts Prisma OrderSource enum includes MOBILE_GPS (turns GREEN after Wave 1 migration)
- [ ] `backend/src/__tests__/services/ingest/keeta/keetaAdapter.test.ts` — KeetaXlsxAdapter (idempotent upsert), KeetaScraperAdapter (PARTIAL with creds / FAILED without), KeetaMobileAdapter (isAvailable on LocationLog density)
- [ ] `backend/src/__tests__/services/ingest/talabat/talabatAdapter.test.ts` — TalabatXlsxAdapter MVP shape; **Compile-time pin** via `expectTypeOf<Prisma.TalabatDailyMetricsWhereUniqueInput>().toMatchTypeOf<{tenantId_driverId_shiftDate: ...}>()` (pinned per actual `@@unique([tenantId, driverId, shiftDate])` at schema.prisma:1378); TalabatScraperAdapter NotAvailable; cross-tenant rejection; HTTP 400 on malformed headers
- [ ] `backend/src/__tests__/services/ingest/deliveroo/deliverooAdapter.test.ts` — DeliverooXlsxAdapter MVP shape (same compound key shape `tenantId_driverId_shiftDate`); idempotent; malformed-header rejection; DeliverooScraperAdapter NotAvailable
- [ ] `backend/src/__tests__/services/ingest/americana/americanaAdapter.test.ts` — AmericanaXlsxAdapter wraps `parseAmericanaDailyXlsx` + `processIngestionRows` (preserves side-effects); AmericanaEmailAdapter thin shim; isAvailable based on tenant.settings.americana.ingest config
- [ ] `backend/src/__tests__/routes/talabatImport.test.ts` — POST /api/talabat/import: 200 valid upload, 400 missing file, IngestRun audit row, idempotent re-import, cross-tenant driver rejection
- [ ] `backend/src/__tests__/routes/deliverooImport.test.ts` — Same 5 expectations parameterised for Deliveroo
- [ ] `backend/src/__tests__/queues/pullChunkPhase6.test.ts` — Calls `getAdapter(platform).fetchOrders/fetchShifts/fetchViolations`; NotAvailable from one capability does NOT abort chunk; writes 1 IngestRun per chunk `source="BACKWASH"` + tenantId; returns `{rowsOk}` excluding cashRows (BLOCKER 4 contract)

### XLSX fixture builders (programmatic, no binary commits)

- [ ] `backend/src/__tests__/services/ingest/fixtures/keetaSample.xlsx.ts` — `buildKeetaXlsxBuffer(opts?)` + `buildBadKeetaXlsx()` for malformed-header negative tests
- [ ] `backend/src/__tests__/services/ingest/fixtures/talabatSample.xlsx.ts` — `buildTalabatXlsxBuffer` + bad fixture (5-column MVP shape)
- [ ] `backend/src/__tests__/services/ingest/fixtures/deliverooSample.xlsx.ts` — `buildDeliverooXlsxBuffer` + bad fixture (5-column MVP shape)
- [ ] `backend/src/__tests__/services/ingest/fixtures/americanaSample.xlsx.ts` — `buildAmericanaXlsxBuffer` (mirrors `parseAmericanaDailyXlsx` daily shape)
- [ ] `backend/src/__tests__/services/ingest/fixtures/index.ts` — Barrel re-exports of all 4 builders

### Lint negative test (WARNING 13)

- [ ] `backend/src/__tests__/services/ingest/_lint_negative.fixture.ts.txt` — `.txt` extension so it doesn't compile but is reachable by ESLint runner. Contains a deliberately-broken adapter snippet: `prisma.driver.findFirst({where: {platformDriverId: 'x'}})` (no tenantId filter)
- [ ] Jest test asserting `npm run lint:tenant -- --rulesdir ./eslint-rules <fixture>` exits non-zero — proves the rule fires on the new `services/ingest/**` scope

### Lint scope extension

- [ ] `backend/package.json::scripts.lint:tenant` extended to include `src/services/ingest/`

---

## Cross-Cutting Contracts (locked in Wave 0)

### Cash is XLSX-import-only

Phase 6 ships `fetchCash` via XLSX import only. Backwash `fetchCash` returns `[]` across all platforms (cash data lands via the dedicated XLSX upload routes, not via the chunked backwash worker). RED test `compositeFetchCash.test.ts` enforces this — for each platform, mocks all adapters and asserts `composite.fetchCash(...)` returns `[]` AND that the IngestRun row records `cashRows: 0` with note "XLSX-import-only". Wave 4 `pullChunkPhase6` skips cashRows in the `rowsOk` accumulator (cashRows always 0).

### XLSX upsert key shapes (pinned from schema.prisma)

| Model | @@unique key | Schema line |
|-------|--------------|-------------|
| `KeetaDailyMetrics` | `@@unique([tenantId, driverId, date])` → `tenantId_driverId_date` | schema.prisma:1300 |
| `TalabatDailyMetrics` | `@@unique([tenantId, driverId, shiftDate])` → `tenantId_driverId_shiftDate` | schema.prisma:1378 |
| `DeliverooDailyMetrics` | `@@unique([tenantId, driverId, shiftDate])` → `tenantId_driverId_shiftDate` | schema.prisma:1348 |

### OrderLog upsert mapping (Wave 4)

`OrderLog` has **no `@@unique` constraint** — only `@id` on `id` (schema.prisma:739-770). Therefore Wave 4's `pullChunkPhase6` cannot use a compound-key upsert. Strategy:

1. Inline `mapToOrderLog(normalized: NormalizedRow): Prisma.OrderLogCreateInput` helper in `pullChunkPhase6`.
2. Per-source mapping inside `mapToOrderLog`:
   - **Mobile (`{ts, lat, lng, driverId}`)** — produces synthetic `id = "mobile-${tenantId}-${driverId}-${ts}"`; upsert by `id`.
   - **Scraper (`{platformOrderId, driverPlatformId, status, deliveryTime}`)** — produces synthetic `id = "scrape-${tenantId}-${platform}-${platformOrderId}"`; upsert by `id`.
   - **OCR (platform-shaped daily metrics)** — does NOT write to OrderLog (these go to `*DailyMetrics` tables only); pullChunkPhase6 skips OCR rows for OrderLog.
3. Idempotency comes from deterministic synthetic IDs; same input → same id → upsert is no-op.

This contract is enforced by `pullChunkPhase6.test.ts` RED test cases.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Operator uploads a Talabat XLSX in production and sees rowsOk match expectations | REQ-ingest-adapter-layer | Real-world XLSX shapes from partners differ from test fixtures | After deploy: log into a tenant, upload a real Talabat export to `/api/talabat/import`, verify the response and the `IngestRun` row in admin |
| Backwash 30-day window for a real tenant produces non-zero rows across at least one platform | REQ-ingest-adapter-layer | Requires a real tenant with PlatformSettings + drivers + LocationLog | Trigger onboarding backwash for a dev tenant, watch progress events, verify per-platform IngestRun row counts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (11 RED test files + 4 fixture builders + 1 lint negative fixture + 1 cross-cutting compositeFetchCash test + 1 pullChunkPhase6 test)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (full suite)
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 ships)

**Approval:** pending
