---
phase: 06-ingest-adapter-layer
plan: 02a
type: execute
wave: 2
depends_on: ["06-01", "06-02b"]
files_modified:
  - backend/src/services/ingest/keeta/scraper.ts
  - backend/src/services/ingest/keeta/xlsx.ts
  - backend/src/services/ingest/keeta/mobile.ts
  - backend/src/services/ingest/keeta/index.ts
  - backend/src/services/ingest/americana/xlsx.ts
  - backend/src/services/ingest/americana/email.ts
  - backend/src/services/ingest/americana/index.ts
  - backend/src/services/ingest/registry.ts
autonomous: true
requirements:
  - REQ-ingest-adapter-layer

must_haves:
  truths:
    - "Keeta has 3 adapters under backend/src/services/ingest/keeta/ + an index.ts barrel exporting keetaTiers in precedence order [Mobile, Scraper, Xlsx]"
    - "Americana has 2 adapters under backend/src/services/ingest/americana/ + an index.ts barrel exporting americanaTiers in precedence order [Email, Xlsx]"
    - "registry.ts updated: per-platform CompositeAdapter tier list filled with concrete adapter instances for ALL 4 platforms (imports keetaTiers/americanaTiers locally + talabatTiers/deliverooTiers from 06-02b)"
    - "All adapters tenant-scoped — every prisma query filters by tenantId (Pitfall 3); mobile.ts joins through Driver.tenantId (Pitfall 5)"
    - "AmericanaXlsxAdapter wraps existing parseAmericanaDailyXlsx + processIngestionRows preserving attendance + violation side-effects (RESEARCH.md §'Critical refactor verification steps' #2)"
    - "AmericanaEmailAdapter is a thin re-export shim of services/americanaInboxWatcher.ts (orchestrator resolution #5) — calls existing pollTenantInbox unchanged"
    - "All Wave 0 keeta + americana RED tests turn GREEN; existing onboardingBackwashWorker tests still GREEN"
    - "lint:tenant exits 0 across services/ingest/{keeta,americana}/**"
  artifacts:
    - path: backend/src/services/ingest/keeta/scraper.ts
      provides: "KeetaScraperAdapter — refactored from queues/keetaPortalScraperWorker.ts; preserves existing IngestRun status=PARTIAL/FAILED behavior; isAvailable=true only with portalCredentials present"
      contains: "KeetaScraperAdapter"
      min_lines: 50
    - path: backend/src/services/ingest/keeta/xlsx.ts
      provides: "KeetaXlsxAdapter wraps existing parseKeetaXlsx; ingestXlsx upserts KeetaDailyMetrics via tenantId_driverId_date compound unique"
      contains: "KeetaXlsxAdapter"
      min_lines: 60
    - path: backend/src/services/ingest/keeta/mobile.ts
      provides: "KeetaMobileAdapter reads LocationLog joined through Driver.tenantId (Pitfall 5); fetchOrders returns AGENT_CAPTURE OrderLogs in date range"
      contains: "KeetaMobileAdapter"
      min_lines: 50
    - path: backend/src/services/ingest/keeta/index.ts
      provides: "Composes keetaTiers = [KeetaMobileAdapter, KeetaScraperAdapter, KeetaXlsxAdapter] for the registry"
      contains: "keetaTiers"
      min_lines: 10
    - path: backend/src/services/ingest/americana/xlsx.ts
      provides: "AmericanaXlsxAdapter wraps parseAmericanaDailyXlsx + delegates to processIngestionRows from americanaIngestWorker; preserves attendance + violation side-effects"
      contains: "AmericanaXlsxAdapter"
      min_lines: 50
    - path: backend/src/services/ingest/americana/email.ts
      provides: "AmericanaEmailAdapter — thin re-export shim around services/americanaInboxWatcher.ts; calls existing pollTenantInbox unchanged"
      contains: "AmericanaEmailAdapter"
      min_lines: 30
    - path: backend/src/services/ingest/americana/index.ts
      provides: "Composes americanaTiers = [AmericanaEmailAdapter, AmericanaXlsxAdapter] — no mobile, no scraper"
      contains: "americanaTiers"
      min_lines: 10
    - path: backend/src/services/ingest/registry.ts
      provides: "Updated factory: each platform's CompositeAdapter is constructed with concrete tier instances. Imports keetaTiers/americanaTiers from local sub-plan + talabatTiers/deliverooTiers from 06-02b's barrels."
      contains: "keetaTiers"
  key_links:
    - from: backend/src/services/ingest/keeta/scraper.ts
      to: backend/src/utils/portalCreds.ts
      via: "import { decryptCred, hasEncryptedShape } — credential pattern preserved verbatim from queues/keetaPortalScraperWorker.ts:3"
      pattern: "from.*portalCreds"
    - from: backend/src/services/ingest/keeta/xlsx.ts
      to: backend/src/services/keetaXlsxParser.ts
      via: "import { parseKeetaXlsx } — adapter wraps, never reimplements (Pitfall 1)"
      pattern: "parseKeetaXlsx"
    - from: backend/src/services/ingest/keeta/mobile.ts
      to: backend/prisma/schema.prisma
      via: "prisma.locationLog.findMany({ where: { driver: { tenantId } } }) — Pitfall 5 enforcement"
      pattern: "driver:.*tenantId"
    - from: backend/src/services/ingest/americana/xlsx.ts
      to: backend/src/services/americanaDailyParser.ts
      via: "import { parseAmericanaDailyXlsx } — same wrap pattern; preserve processIngestionRows side-effects"
      pattern: "parseAmericanaDailyXlsx"
    - from: backend/src/services/ingest/americana/email.ts
      to: backend/src/services/americanaInboxWatcher.ts
      via: "import { pollTenantInbox } — thin re-export shim (orchestrator resolution #5)"
      pattern: "americanaInboxWatcher"
    - from: backend/src/services/ingest/registry.ts
      to: backend/src/services/ingest/keeta/index.ts
      via: "import { keetaTiers } — registry reads tier list from each platform's barrel"
      pattern: "keetaTiers"
    - from: backend/src/services/ingest/registry.ts
      to: backend/src/services/ingest/talabat/index.ts
      via: "import { talabatTiers } from '../talabat' — barrel produced by 06-02b"
      pattern: "talabatTiers"

threat_model:
  trust_boundaries:
    - "tenant boundary: each adapter's prisma queries filter by tenantId; mobile adapters join through Driver.tenantId (Pitfall 5)"
    - "credential boundary: KeetaScraperAdapter uses existing decryptCred — plaintext never leaves the adapter scope"
  threats:
    - id: T-06-07
      category: Information disclosure
      component: backend/src/services/ingest/keeta/mobile.ts
      disposition: mitigate
      mitigation: "All locationLog queries use prisma.locationLog.findMany({ where: { driver: { tenantId } } }) — never filter by driverId alone (Pitfall 5). Lint:tenant ESLint rule extended to services/ingest/** catches direct prisma.locationLog.findMany({where:{driverId}}) at CI."
    - id: T-06-09
      category: Tampering
      component: backend/src/services/ingest/keeta/xlsx.ts
      disposition: mitigate
      mitigation: "KeetaDailyMetrics @@unique([tenantId, driverId, date]) → idempotent upsert (Pitfall 9). Duplicate file produces same DB state, not appended rows."
    - id: T-06-10
      category: Information disclosure
      component: backend/src/services/ingest/keeta/scraper.ts
      disposition: mitigate
      mitigation: "KeetaScraperAdapter imports decryptCred from utils/portalCreds.ts (existing AES-256-GCM layer). Plaintext credentials only exist inside the local function scope; logs use only err.message (existing pattern at queues/keetaPortalScraperWorker.ts:91 preserved verbatim)."
    - id: T-06-23
      category: Repudiation
      component: backend/src/services/ingest/americana/xlsx.ts
      disposition: mitigate
      mitigation: "AmericanaXlsxAdapter delegates to existing processIngestionRows which writes IngestRun + scanIngestionForViolations + attendance upserts. No bypass of existing audit pattern."
---

<objective>
Wave 2a — Keeta + Americana adapters + registry update. This plan ships:

1. **Keeta directory** (`backend/src/services/ingest/keeta/`):
   - `scraper.ts` — `KeetaScraperAdapter` refactored from `queues/keetaPortalScraperWorker.ts` (preserves existing IngestRun behavior; the queues file's scheduler is later refactored in Wave 4)
   - `xlsx.ts` — `KeetaXlsxAdapter` wraps existing `parseKeetaXlsx`; `ingestXlsx` upserts `KeetaDailyMetrics` against `@@unique([tenantId, driverId, date])`
   - `mobile.ts` — `KeetaMobileAdapter` reads `LocationLog` + `OrderLog{source: AGENT_CAPTURE}` JOINED through `Driver.tenantId` (Pitfall 5)
   - `index.ts` — exports `keetaTiers` array in precedence order [Mobile, Scraper, Xlsx]

2. **Americana directory** (`backend/src/services/ingest/americana/`):
   - `xlsx.ts` — `AmericanaXlsxAdapter` wraps `parseAmericanaDailyXlsx` + delegates to existing `processIngestionRows` from `americanaIngestWorker.ts` to preserve attendance + violation side-effects (RESEARCH.md §"Critical refactor verification steps" #2)
   - `email.ts` — `AmericanaEmailAdapter` is a thin re-export shim around `services/americanaInboxWatcher.ts` per orchestrator resolution #5 (no relocation)
   - `index.ts` — exports `americanaTiers` in order [Email, Xlsx]

3. **registry.ts update** — replaces Wave 1's empty tier arrays with concrete tier lists from ALL 4 platform barrels. Imports `keetaTiers` + `americanaTiers` from this plan, plus `talabatTiers` + `deliverooTiers` from 06-02b's barrels (which exist by the time 02a runs because `depends_on: ["06-01", "06-02b"]`). Wave 2 = two parallel sub-waves; 02a runs **after** 02b ships its barrels but does NOT block 02b's start (02b runs in parallel with this plan's keeta+americana work; the registry update is the LAST task of 02a, gated by 02b's index.ts files existing).

**Why 02a depends on 02b in the dependency graph but runs in parallel for most of its work:** the planner's intent (per BLOCKER 5) is parallelism. The executor running this plan can ship Tasks 1-2 (keeta + americana) immediately; Task 3 (registry update) just needs 02b's `talabat/index.ts` + `deliveroo/index.ts` files to exist. In practice the orchestrator schedules 02a + 02b together; 02a's Task 3 waits on 02b's last task. Net effect: ~50% parallelism for the file creation work, with serialization only at the registry merge point.

**No new npm packages.** **Zero changes to existing services/parsers/workers** outside `services/ingest/` and `registry.ts`.

Output: 7 new TypeScript files (keeta×4 + americana×3) + 1 registry edit. ~310 lines total. Wave 0 keeta + americana RED tests turn GREEN. lint:tenant exits 0.
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
@.planning/phases/06-ingest-adapter-layer/06-02b-PLAN.md
@.planning/intel/decisions.md
@.planning/intel/constraints.md

# Wave 0 RED tests this plan turns GREEN
@backend/src/__tests__/services/ingest/keeta/keetaAdapter.test.ts
@backend/src/__tests__/services/ingest/americana/americanaAdapter.test.ts

# Existing files Wave 2a wraps (do NOT modify)
@backend/src/queues/keetaPortalScraperWorker.ts
@backend/src/queues/americanaIngestWorker.ts
@backend/src/services/keetaXlsxParser.ts
@backend/src/services/americanaDailyParser.ts
@backend/src/services/americanaInboxWatcher.ts
@backend/src/utils/portalCreds.ts
@backend/src/routes/keeta.ts
@backend/src/routes/americanaIngest.ts
@backend/prisma/schema.prisma

# Wave 1 outputs Wave 2a builds on
@backend/src/services/ingest/types.ts
@backend/src/services/ingest/composite.ts
@backend/src/services/ingest/audit.ts
@backend/src/services/ingest/normalize.ts
@backend/src/services/ingest/registry.ts

<interfaces>
<!-- See 06-02b for talabat/deliveroo barrel signatures (talabatTiers + deliverooTiers). -->
<!-- Existing types/exports Wave 2a imports: -->

From backend/src/services/keetaXlsxParser.ts (existing):
```typescript
export interface KeetaRow {
  date: Date;
  courierPlatformId: string;
  firstName: string;
  lastName: string;
  // 24 more fields per parser
}
export function parseKeetaXlsx(buffer: Buffer): KeetaRow[];
```

From backend/src/services/americanaDailyParser.ts (existing):
```typescript
export interface AmericanaDailyRow { /* schema-specific fields */ }
export function parseAmericanaDailyXlsx(buffer: Buffer): AmericanaDailyRow[];
```

From backend/src/queues/americanaIngestWorker.ts (existing):
```typescript
export async function processIngestionRows(args: {
  tenantId: string;
  ingestionId: string;
  rows: AmericanaDailyRow[];
}): Promise<{ rowsOk: number; errors: string[] }>;
```

From backend/src/utils/portalCreds.ts (existing):
```typescript
export function decryptCred(encrypted: string): string;
export function hasEncryptedShape(value: unknown): value is string;
```

From backend/src/services/americanaInboxWatcher.ts (existing):
```typescript
export async function pollTenantInbox(tenantId: string, cfg: InboxConfig): Promise<number>;
```

From backend/prisma/schema.prisma (pinned):
- KeetaDailyMetrics @@unique([tenantId, driverId, date]) → upsert key `tenantId_driverId_date` (schema.prisma:1300)

From 06-02b's barrels (consumed by Task 3):
- `backend/src/services/ingest/talabat/index.ts` exports `talabatTiers: readonly IngestAdapter[]`
- `backend/src/services/ingest/deliveroo/index.ts` exports `deliverooTiers: readonly IngestAdapter[]`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create Keeta adapters (scraper, xlsx, mobile, index)</name>
  <files>
    backend/src/services/ingest/keeta/scraper.ts,
    backend/src/services/ingest/keeta/xlsx.ts,
    backend/src/services/ingest/keeta/mobile.ts,
    backend/src/services/ingest/keeta/index.ts
  </files>
  <read_first>
    backend/src/__tests__/services/ingest/keeta/keetaAdapter.test.ts (Wave 0 RED — drives all 7 expectations: 5 XLSX behaviors, 2 scraper, 1 mobile),
    backend/src/queues/keetaPortalScraperWorker.ts (existing — copy loadCreds + IngestRun pattern verbatim into KeetaScraperAdapter; do NOT modify the queues file),
    backend/src/services/keetaXlsxParser.ts (existing — KeetaXlsxAdapter imports parseKeetaXlsx; never reimplements per Pitfall 1),
    backend/src/routes/keeta.ts (lines 376-470: existing /import handler — KeetaXlsxAdapter.ingestXlsx replicates the upsert logic but returns {rowsIn, rowsOk, errors} per RESEARCH.md Pattern 5; Wave 4 will refactor /import to use makeXlsxImportRoute),
    backend/src/utils/portalCreds.ts (decryptCred + hasEncryptedShape signatures),
    backend/prisma/schema.prisma (LocationLog model at line 964; KeetaDailyMetrics @@unique at line 1300),
    backend/src/services/ingest/types.ts (Wave 1 — IngestAdapter, NotAvailable, NormalizedRow shapes),
    backend/src/services/ingest/normalize.ts (Wave 1 — parseLocalDate)
  </read_first>
  <behavior>
    - KeetaScraperAdapter:
      - source = "PORTAL_SCRAPER", platform = "KEETA"
      - isAvailable(tenantId): query PlatformSettings for tenantId+KEETA; return true iff portalCredentials.username + hasEncryptedShape(portalCredentials.password)
      - fetchOrders/fetchShifts/fetchAttendance/fetchViolations: if !isAvailable → throw NotAvailable("No Keeta portal credentials configured for tenant"); else return [] (Phase 11 fills with real Playwright)
      - fetchCash: throws NotAvailable("Keeta scraper does not produce cash records; use XLSX") — consistent with the cash-XLSX-only contract
    - KeetaXlsxAdapter:
      - source = "XLSX_IMPORT", platform = "KEETA"
      - isAvailable: returns true (XLSX is always-available)
      - fetchOrders: throws NotAvailable("XLSX adapter is upload-driven; use ingestXlsx")
      - ingestXlsx(tenantId, buffer): rows = parseKeetaXlsx(buffer); for each row resolve driver via prisma.driver.findFirst({where: {tenantId, platformDriverId, platform: "KEETA"}}); upsert KeetaDailyMetrics on @@unique([tenantId, driverId, date]); return {rowsIn: rows.length, rowsOk, errors}
    - KeetaMobileAdapter:
      - source = "MOBILE_GPS", platform = "KEETA"
      - isAvailable(tenantId): prisma.locationLog.count({where: {driver: {tenantId}, recordedAt: {gte: 24h ago}}}) > 0
      - fetchOrders(tenantId, range): reads OrderLog where {tenantId, platform: "KEETA", source: "AGENT_CAPTURE", date in range}; returns NormalizedRow<unknown>[]
      - All other fetch* methods throw NotAvailable for Phase 6
    - keeta/index.ts exports keetaTiers = [new KeetaMobileAdapter(), new KeetaScraperAdapter(), new KeetaXlsxAdapter()]
  </behavior>
  <action>
**Step 1 — `backend/src/services/ingest/keeta/scraper.ts`** (~70 lines): see the original Wave 2 spec (now in this 02a). Implement KeetaScraperAdapter with `loadCreds(tenantId)` reading PlatformSettings.notificationConfig.portalCredentials and using decryptCred. Each fetch* method throws `NotAvailable` when creds absent, returns `[]` when present (scaffold; Phase 11 fills real Playwright).

**Step 2 — `backend/src/services/ingest/keeta/xlsx.ts`** (~90 lines): wrap parseKeetaXlsx; for each row do `prisma.driver.findFirst({where: {tenantId, platformDriverId, platform: "KEETA"}})`, then `prisma.keetaDailyMetrics.upsert({where: {tenantId_driverId_date: {tenantId, driverId, date}}, create: {...all 27 fields, source: "XLSX_IMPORT"}, update: {...all 26 mutable fields}})`. Return `{rowsIn: rows.length, rowsOk, errors}`. Errors: missing courierPlatformId, driver not found (cross-tenant rejection), upsert exception.

**Step 3 — `backend/src/services/ingest/keeta/mobile.ts`** (~60 lines): isAvailable counts LocationLog rows joined through Driver.tenantId in last 24h. fetchOrders reads OrderLog `{tenantId, platform: "KEETA", source: "AGENT_CAPTURE", date in range}`, take 5000. Other fetch* throw NotAvailable.

**Step 4 — `backend/src/services/ingest/keeta/index.ts`** (~12 lines): export `keetaTiers = [new KeetaMobileAdapter(), new KeetaScraperAdapter(), new KeetaXlsxAdapter()]` typed as `readonly IngestAdapter[]`.

**Quality gate:** All 4 files compile under TS strict; lint:tenant exits 0 (every prisma.* call filters by tenantId or joins through `driver: {tenantId}`); Wave 0 keetaAdapter.test.ts turns GREEN.

> **Implementation reference:** the full code listing for these files lives in the original `06-02-PLAN.md` Task 1 (now superseded by this 02a / 02b split). The split changes the dependency graph and file ownership — code shape unchanged.
  </action>
  <verify>
    <automated>cd /Users/mac/Documents/Darb/backend && [[ $(ls src/services/ingest/keeta/scraper.ts src/services/ingest/keeta/xlsx.ts src/services/ingest/keeta/mobile.ts src/services/ingest/keeta/index.ts 2>/dev/null | wc -l | tr -d ' ') -eq 4 ]] && cd /Users/mac/Documents/Darb/backend && npx jest --testPathPattern='services/ingest/keeta' 2>&1 | tail -5 && cd /Users/mac/Documents/Darb/backend && npm run lint:tenant 2>&1 | tail -3</automated>
  </verify>
  <done>
    4 Keeta adapter files exist; `cd backend && npx jest --testPathPattern='services/ingest/keeta'` GREEN (7 RED tests turn green); lint:tenant exits 0 (no Pitfall 3/5 violations).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create Americana adapters (xlsx, email, index)</name>
  <files>
    backend/src/services/ingest/americana/xlsx.ts,
    backend/src/services/ingest/americana/email.ts,
    backend/src/services/ingest/americana/index.ts
  </files>
  <read_first>
    backend/src/__tests__/services/ingest/americana/americanaAdapter.test.ts (Wave 0 RED — drives 5 tests including side-effect preservation),
    backend/src/services/americanaDailyParser.ts (existing),
    backend/src/services/americanaXlsxParser.ts (existing — older monthly path; adapter focuses on daily for Phase 6 parity),
    backend/src/queues/americanaIngestWorker.ts (existing — processIngestionRows handles attendance + violation side-effects; the adapter delegates to it to preserve those),
    backend/src/services/americanaInboxWatcher.ts (existing — pollTenantInbox + InboxConfig — AmericanaEmailAdapter is a thin re-export shim per orchestrator resolution #5),
    backend/src/routes/americanaIngest.ts (POST /manual-upload existing pattern),
    backend/prisma/schema.prisma (search "AmericanaDailyIngestion" to confirm field names — adapter creates one of these rows then delegates)
  </read_first>
  <behavior>
    - AmericanaXlsxAdapter:
      - source = "XLSX_IMPORT", platform = "AMERICANA"
      - isAvailable returns true; fetchOrders throws NotAvailable
      - ingestXlsx(tenantId, buffer): rows = parseAmericanaDailyXlsx(buffer); creates AmericanaDailyIngestion record (per existing americanaIngestWorker.ts pattern); calls processIngestionRows to preserve attendance+violation side-effects; returns {rowsIn, rowsOk, errors}
    - AmericanaEmailAdapter:
      - source = "EMAIL_INBOX", platform = "AMERICANA"
      - Thin wrapper exposing existing pollTenantInbox via class methods
      - isAvailable: read tenant settings.americana.ingest config — return true iff host/user/password set
      - run(tenantId): calls existing pollTenantInbox(tenantId, cfg) — returns count
      - fetchOrders/etc throw NotAvailable (email is push-driven, not date-range-pull)
    - americana/index.ts exports americanaTiers = [Email, Xlsx]
  </behavior>
  <action>
**Step 1 — `backend/src/services/ingest/americana/xlsx.ts`** (~70 lines): wrap parseAmericanaDailyXlsx. Stage AmericanaDailyIngestion row matching existing route pattern (verify field names — likely sourceFile, status: "PENDING", rowCount). Delegate to processIngestionRows({tenantId, ingestionId, rows}). Return {rowsIn: rows.length, rowsOk: result.rowsOk, errors: result.errors}.

**Step 2 — `backend/src/services/ingest/americana/email.ts`** (~45 lines): isAvailable reads tenant.settings.americana.ingest config; run(tenantId) calls pollTenantInbox(tenantId, cfg) when config present; throws NotAvailable when missing. fetchOrders throws NotAvailable("Email is push-driven; use run() to poll inbox").

**Step 3 — `backend/src/services/ingest/americana/index.ts`** (~10 lines): export `americanaTiers = [new AmericanaEmailAdapter(), new AmericanaXlsxAdapter()]` typed as `readonly IngestAdapter[]`.

**Quality gate:** All 3 files compile under TS strict; lint:tenant exits 0; Wave 0 americana tests turn GREEN; existing americana behavior preserved (manual upload route still works because `americanaIngestWorker.ts::processIngestionRows` is unchanged).

> **Implementation reference:** see original `06-02-PLAN.md` Task 3 for the full code listing — the body is identical here.
  </action>
  <verify>
    <automated>cd /Users/mac/Documents/Darb/backend && [[ $(ls src/services/ingest/americana/xlsx.ts src/services/ingest/americana/email.ts src/services/ingest/americana/index.ts 2>/dev/null | wc -l | tr -d ' ') -eq 3 ]] && cd /Users/mac/Documents/Darb/backend && npx jest --testPathPattern='services/ingest/americana' 2>&1 | tail -5 && cd /Users/mac/Documents/Darb/backend && npm run lint:tenant 2>&1 | tail -3</automated>
  </verify>
  <done>
    3 Americana adapter files exist; americanaAdapter.test.ts GREEN; lint:tenant exits 0; existing manual-upload route still works (no diff to americanaIngestWorker.ts or americanaInboxWatcher.ts).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Update registry.ts to wire all 4 platform tier arrays (gated on 06-02b barrels)</name>
  <files>
    backend/src/services/ingest/registry.ts
  </files>
  <read_first>
    backend/src/__tests__/services/ingest/registry.test.ts (Wave 0 RED — registry returns CompositeAdapter with non-empty tiers for each of 4 platforms),
    backend/src/services/ingest/keeta/index.ts (just-shipped Task 1 — exports keetaTiers),
    backend/src/services/ingest/americana/index.ts (just-shipped Task 2 — exports americanaTiers),
    backend/src/services/ingest/talabat/index.ts (06-02b output — exports talabatTiers; this task waits for 02b to complete),
    backend/src/services/ingest/deliveroo/index.ts (06-02b output — exports deliverooTiers),
    backend/src/services/ingest/registry.ts (Wave 1 stub — Task 3 fills tier arrays)
  </read_first>
  <behavior>
    - registry.ts updated: each platform's case in getAdapter returns `new CompositeAdapter(platform, [...platformTiers])` instead of empty array
    - Imports keetaTiers + americanaTiers (locally produced) + talabatTiers + deliverooTiers (from 06-02b's barrels)
    - All 4 platforms have non-empty tier lists in precedence order per RESEARCH.md Pattern 3
  </behavior>
  <action>
**Pre-flight:** Verify 06-02b has shipped its barrels:
```bash
ls backend/src/services/ingest/talabat/index.ts backend/src/services/ingest/deliveroo/index.ts
```
If either file is missing, abort with a clear message — 02a Task 3 cannot proceed until 02b's index.ts files exist. The orchestrator's wave scheduler should ensure 02b finishes before 02a Task 3 runs.

**Edit `backend/src/services/ingest/registry.ts`** (replaces Wave 1's empty-tier stub):

```typescript
// Phase 6 Wave 2 — Registry update: fills CompositeAdapter tiers per platform.

import { CompositeAdapter } from "./composite";
import type { Platform } from "./types";
import { keetaTiers } from "./keeta";
import { talabatTiers } from "./talabat";
import { deliverooTiers } from "./deliveroo";
import { americanaTiers } from "./americana";

export interface AdapterContext {
  tenantId: string;
}

export function getAdapter(platform: Platform, _ctx: AdapterContext): CompositeAdapter {
  switch (platform) {
    case "KEETA":     return new CompositeAdapter("KEETA", keetaTiers);
    case "TALABAT":   return new CompositeAdapter("TALABAT", talabatTiers);
    case "DELIVEROO": return new CompositeAdapter("DELIVEROO", deliverooTiers);
    case "AMERICANA": return new CompositeAdapter("AMERICANA", americanaTiers);
    default: {
      const exhaustive: never = platform;
      throw new Error(`Unknown platform: ${exhaustive}`);
    }
  }
}
```

**Quality gate:** TS strict-mode compile clean; lint:tenant exits 0; registry.test.ts GREEN with non-empty tiers.
  </action>
  <verify>
    <automated>cd /Users/mac/Documents/Darb/backend && [[ $(grep -c "keetaTiers\|talabatTiers\|deliverooTiers\|americanaTiers" src/services/ingest/registry.ts) -ge 4 ]] && cd /Users/mac/Documents/Darb/backend && npx jest --testPathPattern='services/ingest/registry' 2>&1 | tail -3 && cd /Users/mac/Documents/Darb/backend && npm run lint:tenant 2>&1 | tail -3</automated>
  </verify>
  <done>
    `registry.ts` imports tier arrays from all 4 platform barrels; `npx jest --testPathPattern='services/ingest/registry'` GREEN with non-empty tiers; lint:tenant exits 0.
  </done>
</task>

</tasks>

<verification>
1. **All 8 source files exist:** `[[ $(find backend/src/services/ingest/{keeta,americana} -type f -name "*.ts" 2>/dev/null | wc -l | tr -d ' ') -eq 7 ]]` AND registry.ts exists.
2. **Wave 0 keeta + americana RED tests turn GREEN:** `cd backend && npx jest --testPathPattern='services/ingest/(keeta|americana)'` exits 0.
3. **Registry test GREEN with non-empty tiers:** `cd backend && npx jest --testPathPattern='services/ingest/registry'` exits 0.
4. **lint:tenant exits 0 across services/ingest/{keeta,americana}/:** Pitfall 5 enforcement: `[[ $(grep -rn "prisma.locationLog" backend/src/services/ingest/keeta/ | grep -v "driver:.*tenantId" | wc -l | tr -d ' ') -eq 0 ]]`.
5. **Existing Phase 1 + Phase 2 tests still GREEN.**
6. **Existing files untouched:** `git diff --stat backend/src/queues/keetaPortalScraperWorker.ts backend/src/queues/americanaIngestWorker.ts backend/src/services/keetaXlsxParser.ts backend/src/services/americanaDailyParser.ts backend/src/services/americanaInboxWatcher.ts` shows zero changes through Wave 2a.
7. **Registry imports from 06-02b barrels:** `grep -c "from \"./talabat\"\|from \"./deliveroo\"" backend/src/services/ingest/registry.ts` returns 2.
</verification>

<success_criteria>
- Keeta + Americana directories under `backend/src/services/ingest/{keeta,americana}/` populated with concrete adapter classes
- Keeta = 3 adapters (Mobile + Scraper + Xlsx) + barrel; Americana = 2 adapters (Email + Xlsx) + barrel
- `registry.ts` returns CompositeAdapters with non-empty tiers in precedence order for ALL 4 platforms (imports from 06-02b's barrels too)
- All Wave 0 keeta + americana RED tests turn GREEN
- Registry RED test GREEN with non-empty tiers for all 4 platforms
- All Phase 1 + Phase 2 tests still GREEN
- lint:tenant exits 0 across `services/ingest/{keeta,americana}/**`; no Pitfall 3/5 violations
- Existing parsers/scrapers/workers in `queues/` and `services/` are untouched
- Americana side-effects (violation + attendance) preserved through `processIngestionRows` delegation
- Americana email adapter is a thin re-export shim (orchestrator resolution #5)
- No new npm packages added
</success_criteria>

<output>
After completion, create `.planning/phases/06-ingest-adapter-layer/06-02a-SUMMARY.md` per `@$HOME/.claude/get-shit-done/templates/summary.md`.
</output>
