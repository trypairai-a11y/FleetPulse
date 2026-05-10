---
phase: 06-ingest-adapter-layer
plan: 02b
type: execute
wave: 2
depends_on: ["06-01"]
files_modified:
  - backend/src/services/ingest/talabat/scraper.ts
  - backend/src/services/ingest/talabat/xlsx.ts
  - backend/src/services/ingest/talabat/ocr.ts
  - backend/src/services/ingest/talabat/mobile.ts
  - backend/src/services/ingest/talabat/index.ts
  - backend/src/services/ingest/talabat/xlsxSchema.ts
  - backend/src/services/ingest/deliveroo/scraper.ts
  - backend/src/services/ingest/deliveroo/xlsx.ts
  - backend/src/services/ingest/deliveroo/ocr.ts
  - backend/src/services/ingest/deliveroo/mobile.ts
  - backend/src/services/ingest/deliveroo/index.ts
  - backend/src/services/ingest/deliveroo/xlsxSchema.ts
autonomous: true
requirements:
  - REQ-ingest-adapter-layer

must_haves:
  truths:
    - "Talabat has 4 adapters under backend/src/services/ingest/talabat/ + an index.ts barrel exporting talabatTiers in precedence order [Mobile, Ocr, Xlsx, Scraper]"
    - "Deliveroo has 4 adapters under backend/src/services/ingest/deliveroo/ + an index.ts barrel exporting deliverooTiers in precedence order [Mobile, Ocr, Xlsx, Scraper]"
    - "TalabatScraperAdapter + DeliverooScraperAdapter return NotAvailable unconditionally (Phase 11 work — Pitfall 7)"
    - "TalabatXlsxAdapter + DeliverooXlsxAdapter parse MVP shape {date, driver_id, orders_count, online_minutes, attendance_status} (orchestrator resolution #2); reject malformed headers BEFORE any DB write (Pitfall 10); upsert against compound unique key tenantId_driverId_shiftDate (idempotent — Pitfall 9)"
    - "TalabatXlsxAdapter + DeliverooXlsxAdapter use the @@unique key shape pinned by Wave 0 RED tests (compile-time TS assertion: tenantId_driverId_shiftDate)"
    - "TalabatMobileAdapter + DeliverooMobileAdapter read LocationLog joined through Driver.tenantId (Pitfall 5)"
    - "All adapters tenant-scoped — every prisma query filters by tenantId (Pitfall 3)"
    - "All Wave 0 talabat + deliveroo RED tests turn GREEN; existing onboardingBackwashWorker tests still GREEN"
    - "lint:tenant exits 0 across services/ingest/{talabat,deliveroo}/**"
    - "Barrels talabat/index.ts + deliveroo/index.ts ship before 06-02a's registry update task runs"
  artifacts:
    - path: backend/src/services/ingest/talabat/xlsx.ts
      provides: "TalabatXlsxAdapter parses MVP shape; upserts TalabatDailyMetrics on @@unique([tenantId, driverId, shiftDate]); rejects malformed headers"
      contains: "TalabatXlsxAdapter"
      min_lines: 70
    - path: backend/src/services/ingest/talabat/scraper.ts
      provides: "TalabatScraperAdapter — isAvailable=false unconditionally; fetchOrders throws NotAvailable (Phase 11 — Pitfall 7)"
      contains: "TalabatScraperAdapter"
      min_lines: 25
    - path: backend/src/services/ingest/talabat/ocr.ts
      provides: "TalabatOcrAdapter — thin wrapper around existing /metrics/ingest-screenshot logic (no relocation per Phase 11 cleanup)"
      contains: "TalabatOcrAdapter"
      min_lines: 25
    - path: backend/src/services/ingest/talabat/mobile.ts
      provides: "TalabatMobileAdapter — same LocationLog pattern as KeetaMobileAdapter, tenant-scoped via Driver join"
      contains: "TalabatMobileAdapter"
      min_lines: 30
    - path: backend/src/services/ingest/talabat/index.ts
      provides: "Composes talabatTiers = [TalabatMobileAdapter, TalabatOcrAdapter, TalabatXlsxAdapter, TalabatScraperAdapter] — consumed by 06-02a registry update"
      contains: "talabatTiers"
      min_lines: 10
    - path: backend/src/services/ingest/talabat/xlsxSchema.ts
      provides: "Zod schema for MVP Talabat XLSX rows; exports validateTalabatXlsxHeaders + parseTalabatRow"
      contains: "validateTalabatXlsxHeaders"
      min_lines: 40
    - path: backend/src/services/ingest/deliveroo/xlsx.ts
      provides: "DeliverooXlsxAdapter — same MVP shape as Talabat; upserts DeliverooDailyMetrics on @@unique([tenantId, driverId, shiftDate]); idempotent re-import"
      contains: "DeliverooXlsxAdapter"
      min_lines: 70
    - path: backend/src/services/ingest/deliveroo/scraper.ts
      provides: "DeliverooScraperAdapter — isAvailable=false; NotAvailable on fetch"
      contains: "DeliverooScraperAdapter"
      min_lines: 25
    - path: backend/src/services/ingest/deliveroo/ocr.ts
      provides: "DeliverooOcrAdapter — wraps existing /metrics/ingest-screenshot for Deliveroo"
      contains: "DeliverooOcrAdapter"
      min_lines: 25
    - path: backend/src/services/ingest/deliveroo/mobile.ts
      provides: "DeliverooMobileAdapter — LocationLog tenant-scoped"
      contains: "DeliverooMobileAdapter"
      min_lines: 30
    - path: backend/src/services/ingest/deliveroo/index.ts
      provides: "Composes deliverooTiers = [DeliverooMobileAdapter, DeliverooOcrAdapter, DeliverooXlsxAdapter, DeliverooScraperAdapter]"
      contains: "deliverooTiers"
      min_lines: 10
    - path: backend/src/services/ingest/deliveroo/xlsxSchema.ts
      provides: "Zod schema for MVP Deliveroo XLSX rows (mirror of Talabat schema)"
      contains: "validateDeliverooXlsxHeaders"
      min_lines: 40
  key_links:
    - from: backend/src/services/ingest/talabat/xlsx.ts
      to: backend/src/services/ingest/talabat/xlsxSchema.ts
      via: "import { validateTalabatXlsxHeaders, parseTalabatRow, REQUIRED_TALABAT_COLUMNS } — header validation BEFORE DB write (Pitfall 10)"
      pattern: "validateTalabatXlsxHeaders"
    - from: backend/src/services/ingest/{talabat,deliveroo}/mobile.ts
      to: backend/prisma/schema.prisma
      via: "prisma.locationLog.findMany({ where: { driver: { tenantId } } }) — Pitfall 5 enforcement"
      pattern: "driver:.*tenantId"
    - from: backend/src/services/ingest/{talabat,deliveroo}/xlsx.ts
      to: backend/prisma/schema.prisma
      via: "prisma.{talabat,deliveroo}DailyMetrics.upsert with where: {tenantId_driverId_shiftDate: {...}} — pinned compound unique key"
      pattern: "tenantId_driverId_shiftDate"

threat_model:
  trust_boundaries:
    - "tenant boundary: each adapter's prisma queries filter by tenantId; mobile adapters join through Driver.tenantId (Pitfall 5)"
    - "client→adapter via XLSX upload: Talabat/Deliveroo XLSX adapters validate headers before any DB write (Pitfall 10)"
  threats:
    - id: T-06-08
      category: Tampering
      component: backend/src/services/ingest/{talabat,deliveroo}/xlsx.ts
      disposition: mitigate
      mitigation: "validateTalabatXlsxHeaders / validateDeliverooXlsxHeaders compare uploaded XLSX header row against a Zod schema with required keys ['date','driver_id','orders_count','online_minutes','attendance_status']. Mismatch throws Error('XLSX missing required columns: ...'); xlsxRouteFactory catches and returns HTTP 400 — no DB write reached (Pitfall 10)."
    - id: T-06-09
      category: Tampering
      component: backend/src/services/ingest/{talabat,deliveroo}/xlsx.ts
      disposition: mitigate
      mitigation: "Every XLSX upsert targets the compound unique constraint tenantId_driverId_shiftDate. Duplicate file produces same DB state, not appended rows — Pitfall 9 (idempotent loads)."
    - id: T-06-11
      category: Spoofing
      component: backend/src/services/ingest/{talabat,deliveroo}/scraper.ts
      disposition: accept
      mitigation: "TalabatScraperAdapter and DeliverooScraperAdapter unconditionally throw NotAvailable. No credentials are loaded, no portal accessed. Phase 11 will introduce real scraping behind partner-API conversations (REQ-ingest-partner-api-conversations). Until then, the spoof surface is zero (Pitfall 7)."
    - id: T-06-12
      category: Information disclosure
      component: backend/src/services/ingest/{talabat,deliveroo}/xlsx.ts driver matching
      disposition: mitigate
      mitigation: "Driver lookup uses prisma.driver.findFirst({ where: { tenantId, platformDriverId, platform } }) — same pattern as existing keeta.ts:394-400 (Pitfall 3). Driver from another tenant cannot match; row added to errors[] instead of cross-tenant write."
---

<objective>
Wave 2b — Talabat + Deliveroo adapters. This plan ships 12 new TypeScript files in 2 platform directories. Runs in parallel with 06-02a (Keeta + Americana + registry); 02a's Task 3 (registry update) waits for this plan's `index.ts` barrels.

1. **Talabat directory** (`backend/src/services/ingest/talabat/`):
   - `xlsx.ts` — `TalabatXlsxAdapter` parses MVP shape `{date, driver_id, orders_count, online_minutes, attendance_status}` (orchestrator resolution #2)
   - `xlsxSchema.ts` — Zod-backed header validator + row schema (Pitfall 10 enforcement)
   - `scraper.ts` — `TalabatScraperAdapter` returns `NotAvailable` unconditionally (Phase 11 partner-API work)
   - `ocr.ts` — `TalabatOcrAdapter` thin wrapper around existing `/metrics/ingest-screenshot` logic (no relocation; Phase 11 cleanup work)
   - `mobile.ts` — `TalabatMobileAdapter` LocationLog tenant-scoped
   - `index.ts` — exports `talabatTiers` in order [Mobile, Ocr, Xlsx, Scraper]

2. **Deliveroo directory** (`backend/src/services/ingest/deliveroo/`):
   - Mirror of Talabat directory (same 6 files); same MVP XLSX shape; same NotAvailable scraper
   - `index.ts` — exports `deliverooTiers` in order [Mobile, Ocr, Xlsx, Scraper]

**No new npm packages.** **Zero changes to existing services/parsers/workers** outside `services/ingest/`.

Output: 12 new TypeScript files (~480 lines total). All Wave 0 talabat + deliveroo per-platform RED tests turn GREEN. lint:tenant exits 0.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/06-ingest-adapter-layer/06-RESEARCH.md
@.planning/phases/06-ingest-adapter-layer/06-VALIDATION.md
@.planning/phases/06-ingest-adapter-layer/06-00-PLAN.md
@.planning/phases/06-ingest-adapter-layer/06-01-PLAN.md
@.planning/intel/decisions.md
@.planning/intel/constraints.md

# Wave 0 RED tests this plan turns GREEN
@backend/src/__tests__/services/ingest/talabat/talabatAdapter.test.ts
@backend/src/__tests__/services/ingest/deliveroo/deliverooAdapter.test.ts

# Existing files Wave 2b inspects (do NOT modify)
@backend/src/routes/talabat.ts
@backend/src/routes/deliveroo.ts
@backend/prisma/schema.prisma

# Wave 1 outputs Wave 2b builds on
@backend/src/services/ingest/types.ts
@backend/src/services/ingest/composite.ts
@backend/src/services/ingest/normalize.ts

<interfaces>
<!-- Existing models pinned by Wave 0 RED tests via compile-time TS type assertions. -->

From backend/prisma/schema.prisma (pinned):
- TalabatDailyMetrics @@unique([tenantId, driverId, shiftDate]) → upsert key `tenantId_driverId_shiftDate` (schema.prisma:1378)
- DeliverooDailyMetrics @@unique([tenantId, driverId, shiftDate]) → upsert key `tenantId_driverId_shiftDate` (schema.prisma:1348)
- LocationLog at line 964 — query via `driver: {tenantId}` join

Existing models — relevant non-key fields the adapters write:
- TalabatDailyMetrics: ordersCompleted (Int?), onlineHours (Float?), source (String), status (String)
- DeliverooDailyMetrics: deliveriesCount (Int), codCollectedKwd (Decimal), tipsKwd (Decimal), unassignedCount (Int), hourlyBuckets (Json), source (String)

Note: the MVP XLSX shape `{date, driver_id, orders_count, online_minutes, attendance_status}` does NOT 1:1 match either model (DeliverooDailyMetrics requires hourlyBuckets/codCollectedKwd/tipsKwd; TalabatDailyMetrics has ordersCompleted Int? + onlineHours Float?). The adapter's MVP behavior:
- Map `orders_count` → `ordersCompleted` (Talabat) or `deliveriesCount` (Deliveroo)
- Map `online_minutes / 60` → `onlineHours` (Talabat) — Deliveroo has no onlineHours column; skip with TODO Phase 11
- Map `attendance_status` → store in `status` column or skip with TODO Phase 11
- Set required Decimal fields on Deliveroo (codCollectedKwd, tipsKwd) to 0 in v1; Phase 11 polish populates real values when partner XLSX shape is confirmed
- Set source = "MANUAL_UPLOAD" on both
- Set hourlyBuckets = `[0,0,0,0,0,0,0,0,0]` (9-element placeholder) on Deliveroo
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create Talabat adapters (6 files)</name>
  <files>
    backend/src/services/ingest/talabat/scraper.ts,
    backend/src/services/ingest/talabat/xlsx.ts,
    backend/src/services/ingest/talabat/ocr.ts,
    backend/src/services/ingest/talabat/mobile.ts,
    backend/src/services/ingest/talabat/index.ts,
    backend/src/services/ingest/talabat/xlsxSchema.ts
  </files>
  <read_first>
    backend/src/__tests__/services/ingest/talabat/talabatAdapter.test.ts (Wave 0 RED — drives 6 tests including the compile-time @@unique pin),
    backend/src/services/ingest/types.ts (Wave 1),
    backend/src/services/ingest/normalize.ts (Wave 1 — parseLocalDate),
    backend/src/routes/talabat.ts (existing /metrics/ingest-screenshot OCR endpoint — TalabatOcrAdapter wraps but does NOT relocate),
    backend/prisma/schema.prisma (line 1355-1382: TalabatDailyMetrics — pin field names AND @@unique([tenantId, driverId, shiftDate]) at line 1378)
  </read_first>
  <behavior>
    - TalabatXlsxAdapter:
      - source = "XLSX_IMPORT", platform = "TALABAT"
      - ingestXlsx: read XLSX → validateTalabatXlsxHeaders FIRST (Pitfall 10) → for each row: parseTalabatRow → driver lookup tenant-scoped → upsert TalabatDailyMetrics on `tenantId_driverId_shiftDate`
      - Idempotent on duplicate import (Pitfall 9 — upsert not create)
    - TalabatScraperAdapter: isAvailable=false; fetchOrders throws NotAvailable("Talabat scraper deferred to Phase 11 (REQ-ingest-partner-api-conversations)")
    - TalabatOcrAdapter: thin wrapper — for Phase 6 just preserves the existing /metrics/ingest-screenshot logic by exposing isAvailable=false (the route is the entry point); fetchOrders throws NotAvailable (OCR is request-driven, not date-range-pull)
    - TalabatMobileAdapter: same shape as KeetaMobileAdapter; reads LocationLog tenant-scoped via Driver join; OrderLog filter platform="TALABAT"
    - talabat/index.ts exports talabatTiers in order [Mobile, Ocr, Xlsx, Scraper]
    - xlsxSchema.ts exports validateTalabatXlsxHeaders(headerRow: string[]): void (throws on mismatch) + parseTalabatRow(headers: string[], rowArr: any[]): TalabatXlsxRow + TalabatXlsxRow type
  </behavior>
  <action>
**Step 1 — `backend/src/services/ingest/talabat/xlsxSchema.ts`** (~50 lines): Zod schema with required columns `["date","driver_id","orders_count","online_minutes","attendance_status"]`. `validateTalabatXlsxHeaders(headerRow)` throws `Error("Talabat XLSX missing required columns: ${missing.join(', ')}")` when any required column missing. `parseTalabatRow(headers, rowArr)` maps cell values via column-name lookup, runs Zod parse, returns typed `TalabatXlsxRow {date: Date, driverId: string, ordersCount: number, onlineMinutes: number, attendanceStatus: string}`.

**Step 2 — `backend/src/services/ingest/talabat/xlsx.ts`** (~80 lines):
- isAvailable returns true; fetchOrders throws NotAvailable
- ingestXlsx(tenantId, buffer):
  1. Read buffer with `XLSX.read(buffer, {type: "buffer"})`
  2. Convert sheet 0 to AOA: `XLSX.utils.sheet_to_json(sheet, {header: 1})`
  3. Header row = aoa[0]; call `validateTalabatXlsxHeaders(headers)` BEFORE any DB write (Pitfall 10)
  4. For each data row (skipping empty rows): `parseTalabatRow` → driver lookup tenant-scoped → upsert with key shape pinned by Wave 0:
     ```typescript
     await prisma.talabatDailyMetrics.upsert({
       where: {
         tenantId_driverId_shiftDate: { tenantId, driverId: driver.id, shiftDate: row.date },
       },
       create: {
         tenantId, driverId: driver.id, shiftDate: row.date,
         ordersCompleted: row.ordersCount,
         onlineHours: row.onlineMinutes / 60,
         source: "MANUAL_UPLOAD",
         status: "PARSED",
         // attendance_status stored in status column — verify Wave 0 RED test alignment
       },
       update: {
         ordersCompleted: row.ordersCount,
         onlineHours: row.onlineMinutes / 60,
       },
     });
     ```
  5. errors[] entries for: missing driver (cross-tenant rejection), Zod parse failures, upsert exceptions
  6. Return `{rowsIn, rowsOk, errors}`

**Step 3 — `backend/src/services/ingest/talabat/scraper.ts`** (~30 lines): all fetch* methods throw NotAvailable("Talabat scraper deferred to Phase 11 (REQ-ingest-partner-api-conversations)"). isAvailable=false.

**Step 4 — `backend/src/services/ingest/talabat/ocr.ts`** (~30 lines): isAvailable=false (OCR is request-driven, not backwash-pullable). fetchOrders throws NotAvailable.

**Step 5 — `backend/src/services/ingest/talabat/mobile.ts`** (~50 lines): same shape as KeetaMobileAdapter. isAvailable counts LocationLog rows joined through Driver.tenantId in last 24h. fetchOrders reads OrderLog where platform="TALABAT", source="AGENT_CAPTURE", date in range.

**Step 6 — `backend/src/services/ingest/talabat/index.ts`** (~14 lines):
```typescript
import { TalabatMobileAdapter } from "./mobile";
import { TalabatOcrAdapter } from "./ocr";
import { TalabatXlsxAdapter } from "./xlsx";
import { TalabatScraperAdapter } from "./scraper";
import type { IngestAdapter } from "../types";

export const talabatTiers: readonly IngestAdapter[] = [
  new TalabatMobileAdapter(),
  new TalabatOcrAdapter(),
  new TalabatXlsxAdapter(),
  new TalabatScraperAdapter(),
];
```

**Quality gate:** All 6 files compile under TS strict; lint:tenant exits 0; Wave 0 talabat tests turn GREEN (including the compile-time @@unique pin).
  </action>
  <verify>
    <automated>cd /Users/mac/Documents/Darb/backend && [[ $(ls src/services/ingest/talabat/scraper.ts src/services/ingest/talabat/xlsx.ts src/services/ingest/talabat/ocr.ts src/services/ingest/talabat/mobile.ts src/services/ingest/talabat/index.ts src/services/ingest/talabat/xlsxSchema.ts 2>/dev/null | wc -l | tr -d ' ') -eq 6 ]] && cd /Users/mac/Documents/Darb/backend && npx jest --testPathPattern='services/ingest/talabat' 2>&1 | tail -5 && cd /Users/mac/Documents/Darb/backend && npm run lint:tenant 2>&1 | tail -3</automated>
  </verify>
  <done>
    6 Talabat adapter files exist; talabatAdapter.test.ts GREEN (6 RED tests turn green); lint:tenant exits 0.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create Deliveroo adapters (6 files, mirror of Talabat)</name>
  <files>
    backend/src/services/ingest/deliveroo/scraper.ts,
    backend/src/services/ingest/deliveroo/xlsx.ts,
    backend/src/services/ingest/deliveroo/ocr.ts,
    backend/src/services/ingest/deliveroo/mobile.ts,
    backend/src/services/ingest/deliveroo/index.ts,
    backend/src/services/ingest/deliveroo/xlsxSchema.ts
  </files>
  <read_first>
    backend/src/__tests__/services/ingest/deliveroo/deliverooAdapter.test.ts (Wave 0 RED — drives 5 tests),
    backend/src/services/ingest/talabat/* (just-shipped Task 1 — Deliveroo mirrors Talabat),
    backend/src/routes/deliveroo.ts (existing /metrics/ingest-screenshot OCR endpoint),
    backend/prisma/schema.prisma (line 1324-1352: DeliverooDailyMetrics — pin field names AND @@unique([tenantId, driverId, shiftDate]) at line 1348)
  </read_first>
  <behavior>
    - Mirror of Task 1 with class names DeliverooXlsxAdapter, DeliverooScraperAdapter, DeliverooOcrAdapter, DeliverooMobileAdapter
    - Zod schema in deliveroo/xlsxSchema.ts uses the SAME 5-column MVP shape (orchestrator resolution #2)
    - Class internals upsert against prisma.deliverooDailyMetrics on `tenantId_driverId_shiftDate`
    - validateDeliverooXlsxHeaders function name differs only in the prefix
    - Required Decimal fields (codCollectedKwd, tipsKwd) set to 0 in v1; hourlyBuckets defaults to [0,0,0,0,0,0,0,0,0]
  </behavior>
  <action>
**Step 1 — `backend/src/services/ingest/deliveroo/xlsxSchema.ts`** (~50 lines): mirror of talabat/xlsxSchema.ts. Same 5 required columns. Zod schema identical. `validateDeliverooXlsxHeaders` + `parseDeliverooRow` + `DeliverooXlsxRow` type.

**Step 2 — `backend/src/services/ingest/deliveroo/xlsx.ts`** (~80 lines): mirror of talabat/xlsx.ts but upsert against prisma.deliverooDailyMetrics with the model's required fields:
```typescript
await prisma.deliverooDailyMetrics.upsert({
  where: {
    tenantId_driverId_shiftDate: { tenantId, driverId: driver.id, shiftDate: row.date },
  },
  create: {
    tenantId, driverId: driver.id, shiftDate: row.date,
    deliveriesCount: row.ordersCount,
    codCollectedKwd: 0,         // v1 placeholder; Phase 11 polish populates from real partner XLSX
    tipsKwd: 0,                 // v1 placeholder
    unassignedCount: 0,
    hourlyBuckets: [0, 0, 0, 0, 0, 0, 0, 0, 0],  // 9-element default per schema comment
    source: "MANUAL_UPLOAD",
    status: "PARSED",
  },
  update: {
    deliveriesCount: row.ordersCount,
  },
});
```

**Step 3-5 — `backend/src/services/ingest/deliveroo/scraper.ts` + `ocr.ts` + `mobile.ts`**: identical structure to Talabat with class name + platform string changed to DELIVEROO. mobile.ts reads OrderLog where platform="DELIVEROO".

**Step 6 — `backend/src/services/ingest/deliveroo/index.ts`** (~14 lines):
```typescript
import { DeliverooMobileAdapter } from "./mobile";
import { DeliverooOcrAdapter } from "./ocr";
import { DeliverooXlsxAdapter } from "./xlsx";
import { DeliverooScraperAdapter } from "./scraper";
import type { IngestAdapter } from "../types";

export const deliverooTiers: readonly IngestAdapter[] = [
  new DeliverooMobileAdapter(),
  new DeliverooOcrAdapter(),
  new DeliverooXlsxAdapter(),
  new DeliverooScraperAdapter(),
];
```

**Quality gate:** All 6 files compile under TS strict; lint:tenant exits 0; Wave 0 deliveroo tests turn GREEN.
  </action>
  <verify>
    <automated>cd /Users/mac/Documents/Darb/backend && [[ $(ls src/services/ingest/deliveroo/scraper.ts src/services/ingest/deliveroo/xlsx.ts src/services/ingest/deliveroo/ocr.ts src/services/ingest/deliveroo/mobile.ts src/services/ingest/deliveroo/index.ts src/services/ingest/deliveroo/xlsxSchema.ts 2>/dev/null | wc -l | tr -d ' ') -eq 6 ]] && cd /Users/mac/Documents/Darb/backend && npx jest --testPathPattern='services/ingest/deliveroo' 2>&1 | tail -5 && cd /Users/mac/Documents/Darb/backend && npm run lint:tenant 2>&1 | tail -3</automated>
  </verify>
  <done>
    6 Deliveroo adapter files exist; deliverooAdapter.test.ts GREEN (5 RED tests turn green); lint:tenant exits 0.
  </done>
</task>

</tasks>

<verification>
1. **All 12 source files exist:** `[[ $(find backend/src/services/ingest/{talabat,deliveroo} -type f -name "*.ts" 2>/dev/null | wc -l | tr -d ' ') -eq 12 ]]`.
2. **Wave 0 talabat + deliveroo RED tests turn GREEN:** `cd backend && npx jest --testPathPattern='services/ingest/(talabat|deliveroo)'` exits 0.
3. **Header validation works:** `cd backend && npx jest -t "missing required columns"` GREEN.
4. **lint:tenant exits 0 across services/ingest/{talabat,deliveroo}/:** Pitfall 5 enforcement: `[[ $(grep -rn "prisma.locationLog" backend/src/services/ingest/{talabat,deliveroo}/ | grep -v "driver:.*tenantId" | wc -l | tr -d ' ') -eq 0 ]]`.
5. **Compile-time @@unique key pins resolve:** `cd backend && npx tsc --noEmit 2>&1 | grep -E "error.*services/ingest/(talabat|deliveroo)" | head -1` returns nothing — proves the upsert calls compile against the actual Prisma client types.
6. **Existing Phase 1 + Phase 2 tests still GREEN.**
7. **Existing files untouched:** `git diff --stat backend/src/routes/talabat.ts backend/src/routes/deliveroo.ts` shows zero changes.
8. **Barrels exported:** `grep -c "export const talabatTiers\|export const deliverooTiers" backend/src/services/ingest/{talabat,deliveroo}/index.ts` returns 2.
</verification>

<success_criteria>
- Talabat + Deliveroo directories under `backend/src/services/ingest/{talabat,deliveroo}/` populated with concrete adapter classes
- Talabat = 4 adapters (Mobile + Ocr + Xlsx + Scraper) + Zod schema + barrel
- Deliveroo = 4 adapters (Mobile + Ocr + Xlsx + Scraper) + Zod schema + barrel
- All Wave 0 talabat + deliveroo RED tests turn GREEN (including compile-time @@unique pins)
- Talabat + Deliveroo XLSX adapters reject malformed headers with explanatory Error before any DB write (Pitfall 10)
- Talabat + Deliveroo scraper adapters return NotAvailable unconditionally (Phase 11 work — Pitfall 7)
- All adapters tenant-scoped — every prisma query filters by tenantId (Pitfall 3); mobile adapters join through Driver.tenantId (Pitfall 5)
- Idempotent upsert against tenantId_driverId_shiftDate compound unique key (Pitfall 9)
- All Phase 1 + Phase 2 tests still GREEN
- lint:tenant exits 0 across `services/ingest/{talabat,deliveroo}/**`
- Existing route files (routes/talabat.ts, routes/deliveroo.ts) untouched
- No new npm packages added
- Barrels (talabat/index.ts, deliveroo/index.ts) ship with exported tier arrays for 06-02a's registry update
</success_criteria>

<output>
After completion, create `.planning/phases/06-ingest-adapter-layer/06-02b-SUMMARY.md` per `@$HOME/.claude/get-shit-done/templates/summary.md`.
</output>
