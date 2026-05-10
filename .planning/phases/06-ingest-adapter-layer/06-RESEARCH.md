# Phase 6: Ingest Adapter Layer — Research

**Researched:** 2026-05-10
**Domain:** Data ingestion adapter pattern, multi-source normalization (mobile GPS / scraper / XLSX), per-platform fallback chain, Phase 2 backwash worker integration
**Confidence:** HIGH (all four existing ingest pathways inspected directly in code; adapter pattern is a textbook structural pattern with TypeScript precedent; scraper inventory verified end-to-end)

## Summary

Phase 6 is a **refactor + harness phase**. The codebase already contains the four building blocks the adapter layer needs to wrap: (1) a working **Americana XLSX → DB pipeline** at `services/americanaDailyParser.ts` + `queues/americanaIngestWorker.ts` + `routes/americanaIngest.ts` with the canonical `parseRows → stage → approve → merge → side-effects` lifecycle, (2) a **Keeta XLSX → DB pipeline** at `services/keetaXlsxParser.ts` + `routes/keeta.ts` POST `/import` (the PRD-blessed reference pattern, CON-xlsx-fallback), (3) a **Keeta scraper scaffold** at `queues/keetaPortalScraperWorker.ts` (Playwright TODOs, encrypted-cred loading, IngestRun audit rows) running on a 30-min `setInterval`, and (4) a **chunked backwash skeleton** at `queues/onboardingBackwashWorker.ts` (Phase 2) with a `pullChunk` injection seam where Phase 6 must wire real adapter calls. There is **no Talabat or Deliveroo XLSX import** today — they currently ingest via mobile-OCR endpoints (`POST /metrics/ingest-screenshot`) which are *not* file-import flows; CON-xlsx-fallback requires Phase 6 to add XLSX-import routes for both. Phase 5 (Mobile GPS Beacon, not yet started) will provide the **own-app data source** that the adapter must prefer over scraped data per CON-scraper-replaceable + DEC-scrapers-as-adapter-layer.

The single canonical interface is `IngestAdapter` per `Platform` enum — five capability methods (`fetchOrders`, `fetchShifts`, `fetchAttendance`, `fetchCash`, `fetchViolations`) returning a *normalized* `NormalizedRow<T>` shape that maps onto the existing `OrderLog` / `Shift` / `AttendanceRecord` / `CashRecord` / `Violation` Prisma models. Adapter selection is **per-platform constant first, per-tenant override second**: `getAdapter(platform, tenantCtx)` returns a `CompositeAdapter` that holds a precedence-ordered list (`MOBILE → SCRAPER → XLSX`) and falls through on per-method `NotAvailable` exceptions. The CompositeAdapter's `MOBILE` slot pulls from `LocationLog` + `OrderLog{source: AGENT_CAPTURE}` produced by Phase 5; if Phase 5 isn't shipped yet for a tenant, that slot returns `NotAvailable` and the next tier (scraper) runs. The `XLSX` slot is **always available** (file uploads are never unavailable) and is the terminal fallback. Every adapter call writes an `IngestRun` row (existing model at `schema.prisma:1307`) — `source` field gets a new value vocabulary (`MOBILE_GPS` | `PORTAL_SCRAPER` | `XLSX_IMPORT` | `OCR_MOBILE` | `OCR_WEB`).

**Primary recommendation:** Refactor the existing four ingest pathways into a `backend/src/services/ingest/` module organized as `ingest/{platform}/{adapter}.ts` (e.g., `ingest/keeta/scraper.ts`, `ingest/keeta/xlsx.ts`, `ingest/keeta/mobile.ts`), and introduce a single `IngestAdapter` TypeScript interface that the four existing adapters implement against. Wire `onboardingBackwashWorker.runBackwashJob`'s `pullChunk` injection seam to call `adapter.fetchOrders/fetchShifts/...` for each chunk. Land **two new XLSX-import routes** for Talabat and Deliveroo (cloning the Keeta `POST /import` shape verbatim) so all four platforms have the CON-xlsx-fallback contract. Do **NOT** implement real Playwright scraping for Talabat/Deliveroo in Phase 6 — that's a Phase 11 (REQ-ingest-partner-api-conversations) concern; for now Talabat and Deliveroo scraper adapters return `NotAvailable` and the chain falls through to XLSX or mobile. Keep the encryption pattern at `utils/portalCreds.ts` exactly as-is; the adapter's scraper slot pulls credentials via the same `loadCreds(tenantId, platform)` helper.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-ingest-adapter-layer | Treat scrapers of Keeta/Talabat partner portals as a swappable adapter layer. Scrapers can be replaced without affecting the rest of the system. Wherever an own-app data source exists (mobile GPS, courier check-ins) it is preferred over scraped data. XLSX-import remains a permanent fallback for any platform that breaks scraping. The Keeta `POST /import` route is the canonical pattern. | The full plan: §"Architecture Patterns" defines the `IngestAdapter` interface + `CompositeAdapter` precedence chain; §"Standard Stack" pins existing libs (xlsx 0.18.5, BullMQ 5.73.4, Playwright deferred); §"Don't Hand-Roll" lists what to reuse vs build; §"Existing Scraper Inventory" lists every file to refactor. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| `IngestAdapter` interface definition | Backend `services/ingest/types.ts` (new) | — | Single TypeScript contract the planner can write tasks against; type safety enforced at compile time |
| Per-platform adapter implementation | Backend `services/ingest/{platform}/{adapter}.ts` (new directories, refactored from existing) | Existing parsers (`keetaXlsxParser`, `americanaDailyParser`) | Each adapter is a thin wrapper that calls the existing parser/scraper/mobile reader and normalizes to `NormalizedRow<T>` |
| Adapter selection + fallthrough | Backend `services/ingest/composite.ts` (new) | — | `CompositeAdapter` holds the precedence list and catches `NotAvailable` exceptions; isolated from individual adapter implementations |
| Adapter registry | Backend `services/ingest/registry.ts` (new) | — | `getAdapter(platform, tenantCtx)` factory; tenant-scoped because scraper credentials live on `PlatformSettings.notificationConfig.portalCredentials` (per-tenant) |
| Mobile-GPS data reader | Backend `services/ingest/{platform}/mobile.ts` (new) | DB queries against `LocationLog` + `OrderLog{source: AGENT_CAPTURE}` | Phase 5 produces these rows; Phase 6 just reads them. If Phase 5 hasn't shipped for a tenant, `mobile.ts::isAvailable() === false` |
| Scraper data fetcher | Backend `services/ingest/{platform}/scraper.ts` (refactored from `queues/keetaPortalScraperWorker`) | Playwright (existing scaffolded TODOs) | Refactor existing Keeta scraper into adapter shape. Talabat/Deliveroo scrapers stay NotAvailable until Phase 11. |
| XLSX upload + parse | Backend `services/ingest/{platform}/xlsx.ts` (refactored from existing parsers) | `xlsx@0.18.5` (existing) | Adapter wraps `parseKeetaXlsx` / `parseAmericanaDailyXlsx` etc. and returns `NormalizedRow<T>[]` |
| XLSX upload route — Keeta | Backend `routes/keeta.ts::POST /import` (existing — keep) | — | Already canonical; Phase 6 just refactors the route handler to call `adapter.ingestXlsx(buffer)` instead of inline parser+upsert |
| XLSX upload route — Americana | Backend `routes/americanaIngest.ts::POST /manual-upload` (existing — keep) | — | Already there; refactor handler to call `adapter.ingestXlsx(buffer)` |
| XLSX upload route — Talabat | Backend `routes/talabat.ts::POST /import` (NEW) | — | Clone Keeta shape; required by CON-xlsx-fallback |
| XLSX upload route — Deliveroo | Backend `routes/deliveroo.ts::POST /import` (NEW) | — | Clone Keeta shape; required by CON-xlsx-fallback |
| Backwash chunk pull | `queues/onboardingBackwashWorker.ts::pullChunk` (existing seam) | `services/ingest/composite.ts` | Replace `defaultPullChunkPhase2` with a real `pullChunkPhase6` that calls `adapter.fetchOrders({from, to})` and writes to `OrderLog` etc. |
| `IngestRun` audit row writes | Backend `services/ingest/audit.ts` (new helper) | DB `IngestRun` model (existing) | Single helper `writeIngestRun({tenantId, platform, source, status, rowsIn, rowsOk, errorLog})`; every adapter call uses it |
| Talabat/Deliveroo XLSX schema definition | Backend `services/ingest/{platform}/xlsxSchema.ts` (NEW per platform) | docs/xlsx-fallback-schemas.md (NEW) | Template formats need to be specified; users will be asked by the founder for sample exports |
| Frontend XLSX upload UI (per-platform import button) | Frontend (per-platform settings page) | Existing upload primitives | Out of scope for Phase 6 backend; existing Keeta `/keeta/settings` already has the button — clone only if user wants it for Talabat/Deliveroo |

## Standard Stack

### Core (already pinned)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` | `^0.18.5` (verified `package.json`) | XLSX parsing for fallback uploads | Already used by `parseKeetaXlsx`, `parseAmericanaXlsx`, `parseAmericanaDailyXlsx`, `parseShiftScheduleXlsx`, `parsePendingDuesXlsx` — universal across all four platforms |
| `bullmq` | `^5.73.4` (verified) | Queue + scheduler for backwash + scraper schedulers | Already drives `onboardingBackwashWorker`; the Phase 6 adapter is invoked from inside the existing worker — no new queue needed |
| `ioredis` | `^5.4.1` (verified) | BullMQ connection | Existing |
| `@prisma/client` | `^5.22.0` (verified) | DB writes — `IngestRun`, `OrderLog`, `Shift`, `CashRecord`, `Violation`, `KeetaDailyMetrics`, `AmericanaDailyOrders`, etc. | Existing pattern; tenant-scoped via `prismaExtensions.ts::hasTenantFilter` |
| `zod` | `^3.23.8` (verified) | Adapter input/output validation (per-method method signatures + parser row schemas) | Existing pattern in `agent/registry.ts::defineTool` — same idiom for adapter contracts |
| `pino` | (existing) | Structured logging via `config/logger.ts` | All ingest writes already log via `logger.info({platform, source, ...})`; keep pattern |

[VERIFIED: `backend/package.json` direct read]

### NOT Required (Phase 6 deferred / not introduced)

| Library | Why deferred |
|---------|-------------|
| `playwright` (real Playwright integration) | The Keeta scraper has Playwright TODOs but no actual `chromium.launch()` call yet (`queues/keetaPortalScraperWorker.ts:62-69`). Phase 6 keeps the scaffold-only pattern for Keeta and adds Talabat/Deliveroo as `NotAvailable` adapters. **Real scraper code is a Phase 11 concern (REQ-ingest-partner-api-conversations)**, not Phase 6. |
| `puppeteer` | Same reason; Playwright is the 2026 default for browser automation [CITED: browserstack.com/guide/playwright-vs-puppeteer], not Puppeteer. If Phase 11 ships Playwright, do NOT add Puppeteer alongside. |
| `crawlee` (Apify framework) | Higher-level scraping framework. Out of scope; the Keeta scraper is built around plain Playwright + IngestRun audit rows, and that pattern is sufficient for our 4-platform footprint. Reconsider in Phase 11+ if scraper count grows >10. |
| `node-cron` | Already installed; existing `keetaPortalScraperWorker.ts` uses `setInterval` for the 30-min cadence. Keep existing pattern for consistency with `agent/scheduler.ts`. |
| New JSON schema validator (Ajv etc.) | Zod is already in use for tool I/O validation; no reason to add a second validator. |

[ASSUMED: Crawlee not needed at our scraper count] — the platform-level scraper count is unlikely to exceed 4 within the v2 milestone window.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single `IngestAdapter` interface with all 5 methods | Five separate single-responsibility interfaces (`IOrderAdapter`, `IShiftAdapter`, etc.) | Single-interface keeps the registry small (one map, one factory); composability isn't needed at our scale. Five interfaces would be over-engineered for 4 platforms. |
| Per-method `NotAvailable` exception fallthrough | Per-adapter `isAvailable()` precondition check | Exception-based fallthrough is simpler and matches how the existing Keeta scraper already signals "no creds → mark FAILED" (i.e., the scraper *can* try and fail per-call). Precondition checks would require the registry to know about every adapter's internal state. |
| Wire adapter into `onboardingBackwashWorker` directly | Spin up a new BullMQ queue per platform | Reusing the existing chunked window iterator is the whole point — Phase 2 explicitly designed the `pullChunk` seam for this. Per-platform queues would duplicate the chunking + concurrency-cap logic. |
| Refactor Keeta scraper from scratch with Playwright fully wired | Keep Phase 6 as adapter shape only; defer real Playwright to Phase 11 | Phase 6 is REFACTOR phase per the user objective. Adding Playwright = scope creep + opens legal/relationship risk before partner-API conversations begin in Q3. Stay refactor-only. |
| New `Adapter*` Prisma model | Reuse existing `IngestRun` model + introduce `source` enum vocabulary | YAGNI; `IngestRun` already has all the fields (tenantId, platform, source, status, startedAt, finishedAt, rowsIn, rowsOk, errorLog). |
| Synchronous adapter calls in HTTP routes | Async via BullMQ queue | XLSX uploads are inherently synchronous (user clicks "upload", expects immediate parse result); existing Keeta `POST /import` is synchronous. Match the pattern. Backwash chunks ARE async because they're inside a BullMQ worker. |
| New `enum AdapterSource` Prisma enum for `IngestRun.source` | Keep `IngestRun.source` as `String` (existing) | Existing model uses `String` not `enum` — additive change to add an `enum` would force a non-trivial migration on a column with live data. Keep `String`; document the new vocabulary in code comments. |

[VERIFIED: existing Keeta scraper structure, `IngestRun` schema, `onboardingBackwashWorker` design]

**No new third-party packages required.** Phase 6 is a pure refactor + structural addition.

**Installation (no new packages):**

```bash
# Phase 6 introduces ZERO new npm packages.
# No schema migration required (IngestRun, all platform tables already exist;
# OrderSource enum already includes EXCEL_IMPORT, MANUAL, AGENT_CAPTURE, etc.).
# IF Talabat/Deliveroo XLSX schemas require new columns on existing tables, that's a Phase 6 micro-migration, but with the spec we have today none are needed.
```

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INGEST SOURCES (4 paths)                    │
└─────────────────────────────────────────────────────────────────────┘

  [Mobile App / GPS]    [Partner Portal]     [XLSX File Upload]    [OCR Screenshot]
       (Phase 5)         (Keeta Scraper)        (User upload)       (Mobile OCR)
          │                    │                      │                    │
          │                    │                      │                    │
          ▼                    ▼                      ▼                    ▼
  ┌──────────────┐    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │  mobile.ts   │    │  scraper.ts  │      │   xlsx.ts    │      │   ocr.ts     │
  │  (per-       │    │  (per-       │      │  (per-       │      │  (per-       │
  │   platform)  │    │   platform)  │      │   platform)  │      │   platform)  │
  └──────┬───────┘    └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
         │                   │                     │                     │
         │   Returns NormalizedRow<OrderLog | Shift | CashRecord | ...>  │
         │                   │                     │                     │
         └───────────────────┴─────────┬───────────┴─────────────────────┘
                                       │
                                       ▼
                         ┌─────────────────────────┐
                         │  CompositeAdapter       │
                         │  (precedence chain:     │
                         │   MOBILE → SCRAPER →    │
                         │   XLSX; on per-method   │
                         │   NotAvailable, fall    │
                         │   through to next tier) │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌───────────────────┐  ┌────────────┐   ┌───────────────┐
        │ HTTP route handler│  │ Backwash   │   │ Scheduled     │
        │ (XLSX upload)     │  │ chunk pull │   │ scraper tick  │
        │ POST /import      │  │ (Phase 2)  │   │ (every 30 min)│
        └─────────┬─────────┘  └──────┬─────┘   └───────┬───────┘
                  │                   │                 │
                  ▼                   ▼                 ▼
        ┌─────────────────────────────────────────────────────────┐
        │ writeIngestRun({tenantId, platform, source, status,     │
        │                rowsIn, rowsOk, errorLog})               │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │ Prisma upserts to:                                      │
        │  - OrderLog          - Shift          - AttendanceRecord│
        │  - CashRecord        - Violation      - KeetaDailyMetrics│
        │  - AmericanaDailyOrders   - TalabatDailyMetrics   etc.  │
        └─────────────────────────────────────────────────────────┘
```

Data flow: every entry point converges through one CompositeAdapter per `(tenantId, platform)`, which delegates to the highest-precedence available source per method. The composite collects `NormalizedRow<T>` arrays, the audit helper writes one `IngestRun`, and the upserts target the existing platform-specific Prisma tables. **Replacing a scraper means swapping one file (`scraper.ts`) inside one platform directory.** Per CON-scraper-replaceable, no other module changes.

### Recommended Project Structure

```
backend/src/services/ingest/
├── types.ts                      # IngestAdapter interface + NormalizedRow<T> types + NotAvailable exception
├── registry.ts                   # getAdapter(platform, tenantCtx) factory
├── composite.ts                  # CompositeAdapter (precedence-ordered fallthrough)
├── audit.ts                      # writeIngestRun({tenantId, platform, source, status, rowsIn, rowsOk, errorLog})
├── normalize.ts                  # Generic normalizers (date parsing, money parsing, name matching)
├── keeta/
│   ├── scraper.ts                # IngestAdapter — refactored from queues/keetaPortalScraperWorker.ts
│   ├── xlsx.ts                   # IngestAdapter — wraps existing parseKeetaXlsx
│   ├── mobile.ts                 # IngestAdapter — reads LocationLog + OrderLog{source:AGENT_CAPTURE}
│   └── index.ts                  # Composes the three into a CompositeAdapter
├── talabat/
│   ├── scraper.ts                # IngestAdapter — returns NotAvailable until Phase 11
│   ├── xlsx.ts                   # IngestAdapter — NEW (Phase 6 ships parser + route)
│   ├── ocr.ts                    # IngestAdapter — wraps existing /metrics/ingest-screenshot logic (relocate)
│   ├── mobile.ts                 # IngestAdapter — reads LocationLog (Phase 5)
│   └── index.ts
├── deliveroo/
│   ├── scraper.ts                # IngestAdapter — returns NotAvailable until Phase 11
│   ├── xlsx.ts                   # IngestAdapter — NEW (Phase 6 ships parser + route)
│   ├── ocr.ts                    # IngestAdapter — wraps existing /metrics/ingest-screenshot logic (relocate)
│   ├── mobile.ts                 # IngestAdapter — reads LocationLog (Phase 5)
│   └── index.ts
└── americana/
    ├── xlsx.ts                   # IngestAdapter — wraps existing parseAmericanaDailyXlsx + processIngestionRows
    ├── email.ts                  # IngestAdapter — wraps existing americanaInboxWatcher.ts
    └── index.ts                  # NB: no scraper, no mobile (Americana has no driver cash + no platform portal)

# Files refactored (their current logic relocates):
queues/onboardingBackwashWorker.ts  # pullChunk seam now wraps adapter.fetchOrders(...) etc.
queues/keetaPortalScraperWorker.ts  # imports from services/ingest/keeta/scraper.ts; scheduler stays here
queues/americanaIngestWorker.ts     # imports from services/ingest/americana/xlsx.ts; processIngestionRows stays here
routes/keeta.ts::POST /import        # imports adapter; legacy parser call relocated
routes/americanaIngest.ts            # imports adapter; legacy parser call relocated
routes/talabat.ts::POST /import      # NEW — clones Keeta /import shape against new adapter
routes/deliveroo.ts::POST /import    # NEW — clones Keeta /import shape against new adapter

# Files unchanged:
services/keetaXlsxParser.ts          # Pure parser; adapter just wraps it (no logic change)
services/americanaXlsxParser.ts      # Pure parser; adapter wraps it
services/americanaDailyParser.ts     # Pure parser; adapter wraps it
services/xlsxParser.ts               # Generic shift / pending-dues parsers; reused by Talabat + Deliveroo XLSX adapters
utils/portalCreds.ts                 # Encryption utilities; scraper.ts adapters import from here unchanged
```

### Pattern 1: IngestAdapter Interface

**What:** A single TypeScript interface every per-source adapter implements. Five capability methods, each optional (returns `NotAvailable` if the source can't fetch this data type).

**When to use:** Always. Every adapter file in `services/ingest/{platform}/{source}.ts` implements this contract.

**Example:**
```typescript
// services/ingest/types.ts

export type Platform = "KEETA" | "TALABAT" | "DELIVEROO" | "AMERICANA";

export type AdapterSource =
  | "MOBILE_GPS"      // Own-app data, preferred per CON-scraper-replaceable
  | "PORTAL_SCRAPER"  // Headless browser scrape (Keeta only in v2)
  | "XLSX_IMPORT"     // User uploads file (permanent fallback per CON-xlsx-fallback)
  | "OCR_MOBILE"      // Courier mobile-app screenshot OCR
  | "OCR_WEB"         // Operator web-side screenshot OCR
  | "EMAIL_INBOX";    // Americana daily email feed

export class NotAvailable extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "NotAvailable";
  }
}

export interface DateRange {
  from: Date;        // inclusive
  to: Date;          // exclusive
}

export interface NormalizedRow<T> {
  /** Source attribution for audit trail and precedence resolution */
  source: AdapterSource;
  /** Tenant boundary — every row is tenant-scoped at the adapter layer */
  tenantId: string;
  /** Platform attribution */
  platform: Platform;
  /** Domain payload (OrderLog | Shift | CashRecord | Violation | AttendanceRecord shape) */
  data: T;
  /** Optional raw payload retained for debugging; persisted to OrderLog.rawData when present */
  raw?: unknown;
}

export interface IngestAdapter {
  /** Static metadata about this adapter — used by the registry/composite layer */
  readonly platform: Platform;
  readonly source: AdapterSource;
  /** Returns false if this adapter's underlying source is currently unusable for this tenant
   *  (e.g., scraper has no credentials, mobile slot has no LocationLog rows in the window) */
  isAvailable(tenantId: string): Promise<boolean>;

  /** Each method MAY throw NotAvailable to signal "this source cannot produce this data class" */
  fetchOrders?(tenantId: string, range: DateRange): Promise<NormalizedRow<OrderLogPayload>[]>;
  fetchShifts?(tenantId: string, range: DateRange): Promise<NormalizedRow<ShiftPayload>[]>;
  fetchAttendance?(tenantId: string, range: DateRange): Promise<NormalizedRow<AttendancePayload>[]>;
  fetchCash?(tenantId: string, range: DateRange): Promise<NormalizedRow<CashPayload>[]>;
  fetchViolations?(tenantId: string, range: DateRange): Promise<NormalizedRow<ViolationPayload>[]>;

  /** XLSX upload path — adapters that support file ingest expose this */
  ingestXlsx?(tenantId: string, buffer: Buffer): Promise<{
    rowsIn: number;
    rowsOk: number;
    errors: string[];
  }>;
}
```
[ASSUMED: NormalizedRow shape; the planner is the right step to refine actual payload shapes against existing Prisma column lists] — refine in plan against `OrderLog`/`Shift`/etc.

### Pattern 2: CompositeAdapter Precedence Chain

**What:** A wrapper adapter that holds an ordered list of `IngestAdapter` instances and dispatches each method call to the first available implementation. On `NotAvailable`, falls through to the next tier.

**When to use:** Always — every consumer (HTTP route, backwash worker, scheduled scraper) sees only the composite, never an individual source adapter.

**Example:**
```typescript
// services/ingest/composite.ts

export class CompositeAdapter implements IngestAdapter {
  constructor(
    public readonly platform: Platform,
    private readonly tiers: readonly IngestAdapter[]  // ordered MOBILE → SCRAPER → OCR → XLSX → EMAIL
  ) {}

  // The composite has no single 'source' — leave undefined; consumers read from per-row .source
  readonly source = "COMPOSITE" as AdapterSource;

  async isAvailable(tenantId: string): Promise<boolean> {
    for (const t of this.tiers) {
      if (await t.isAvailable(tenantId)) return true;
    }
    return false;
  }

  async fetchOrders(tenantId: string, range: DateRange) {
    for (const t of this.tiers) {
      if (!t.fetchOrders) continue;
      try {
        const rows = await t.fetchOrders(tenantId, range);
        if (rows.length > 0) return rows;     // first non-empty wins
      } catch (err) {
        if (err instanceof NotAvailable) continue;  // fall through
        throw err;                                  // unexpected error — surface
      }
    }
    return [];                                       // no source produced rows
  }
  // ... fetchShifts / fetchAttendance / fetchCash / fetchViolations follow same pattern
}
```

### Pattern 3: Adapter Registry

**What:** Factory that returns the right `CompositeAdapter` per `(platform, tenantCtx)`. Each platform has a hard-coded composition order; per-tenant overrides come from `PlatformSettings.notificationConfig.ingestPreferences` (a future Phase 7+ extension; v1 hard-codes).

**When to use:** Every consumer asks the registry for an adapter — never instantiates one directly.

**Example:**
```typescript
// services/ingest/registry.ts

import { KeetaScraperAdapter } from "./keeta/scraper";
import { KeetaXlsxAdapter } from "./keeta/xlsx";
import { KeetaMobileAdapter } from "./keeta/mobile";
// ...

export function getAdapter(platform: Platform, _tenantCtx: { tenantId: string }): CompositeAdapter {
  switch (platform) {
    case "KEETA":
      return new CompositeAdapter("KEETA", [
        new KeetaMobileAdapter(),
        new KeetaScraperAdapter(),
        new KeetaXlsxAdapter(),
      ]);
    case "TALABAT":
      return new CompositeAdapter("TALABAT", [
        new TalabatMobileAdapter(),
        new TalabatOcrAdapter(),         // existing /metrics/ingest-screenshot logic
        new TalabatXlsxAdapter(),         // NEW (Phase 6)
        // No scraper in v2; Phase 11 adds via partner-API
      ]);
    case "DELIVEROO":
      return new CompositeAdapter("DELIVEROO", [
        new DeliverooMobileAdapter(),
        new DeliverooOcrAdapter(),
        new DeliverooXlsxAdapter(),       // NEW
      ]);
    case "AMERICANA":
      return new CompositeAdapter("AMERICANA", [
        // No mobile (no GPS attribution to Americana via mobile yet)
        // No scraper (no partner portal)
        new AmericanaEmailAdapter(),      // existing americanaInboxWatcher
        new AmericanaXlsxAdapter(),       // existing manual upload
      ]);
  }
}
```

### Pattern 4: Backwash Wiring

**What:** Replace the Phase 2 `defaultPullChunkPhase2` (which counts existing rows) with a real `pullChunkPhase6` that calls `adapter.fetchOrders/Shifts/...` for each chunk and writes to the platform-specific Prisma tables.

**When to use:** Inside `onboardingBackwashWorker.ts` — wire `startOnboardingBackwashWorker` to the new `pullChunkPhase6`.

**Example:**
```typescript
// queues/onboardingBackwashWorker.ts (modified)

import { getAdapter } from "../services/ingest/registry";
import { writeIngestRun } from "../services/ingest/audit";

export async function pullChunkPhase6(args: BackwashChunkArgs): Promise<{
  rowsOk: number;
}> {
  const { tenantId, platform, from, to } = args;
  const adapter = getAdapter(platform, { tenantId });
  const range = { from: new Date(from), to: new Date(to) };

  let rowsOk = 0;
  const startedAt = new Date();
  try {
    const orders = await adapter.fetchOrders(tenantId, range);
    const shifts = await adapter.fetchShifts?.(tenantId, range) ?? [];
    const attendance = await adapter.fetchAttendance?.(tenantId, range) ?? [];
    const cash = await adapter.fetchCash?.(tenantId, range) ?? [];
    const violations = await adapter.fetchViolations?.(tenantId, range) ?? [];
    rowsOk += await upsertOrders(orders);
    rowsOk += await upsertShifts(shifts);
    // ... etc
    await writeIngestRun({
      tenantId, platform, source: "BACKWASH",
      status: "SUCCESS", startedAt, finishedAt: new Date(),
      rowsIn: orders.length + shifts.length + attendance.length + cash.length + violations.length,
      rowsOk,
    });
    return { rowsOk };
  } catch (err: any) {
    await writeIngestRun({
      tenantId, platform, source: "BACKWASH",
      status: "FAILED", startedAt, finishedAt: new Date(),
      rowsIn: 0, rowsOk, errorLog: err.message,
    });
    throw err;
  }
}

// In startOnboardingBackwashWorker(), swap the pullChunk:
//   pullChunk: defaultPullChunkPhase2,   // OLD (Phase 2)
//   pullChunk: pullChunkPhase6,          // NEW (Phase 6)
```

### Pattern 5: XLSX Route Handler (Reference Pattern)

**What:** The Keeta `POST /import` shape, extracted as a reusable handler factory.

**When to use:** Every platform's `POST /import` route — Keeta (existing), Americana (existing), Talabat (NEW), Deliveroo (NEW).

**Example:**
```typescript
// services/ingest/xlsxRouteFactory.ts (new)

import { Router, Request, Response } from "express";
import fs from "fs";
import { authMiddleware } from "../../middleware/auth";
import { tenantScope } from "../../middleware/tenantScope";
import { upload } from "../../utils/upload";
import { getAdapter } from "./registry";
import { writeIngestRun } from "./audit";

export function makeXlsxImportRoute(platform: Platform) {
  return async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const tenantId = req.user!.tenantId;
    const adapter = getAdapter(platform, { tenantId });
    if (!adapter.ingestXlsx) {
      return res.status(501).json({ error: `XLSX import not implemented for ${platform}` });
    }
    const buffer = fs.readFileSync(req.file.path);
    const startedAt = new Date();
    try {
      const result = await adapter.ingestXlsx(tenantId, buffer);
      await writeIngestRun({
        tenantId, platform, source: "XLSX_IMPORT",
        status: result.errors.length === 0 ? "SUCCESS" : "PARTIAL",
        startedAt, finishedAt: new Date(),
        rowsIn: result.rowsIn, rowsOk: result.rowsOk,
        errorLog: result.errors.join("\n").slice(0, 4000) || null,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      await writeIngestRun({
        tenantId, platform, source: "XLSX_IMPORT",
        status: "FAILED", startedAt, finishedAt: new Date(),
        errorLog: err.message,
      });
      res.status(400).json({ error: err.message });
    }
  };
}

// Used in routes:
// routes/talabat.ts:  router.post("/import", upload.single("file"), makeXlsxImportRoute("TALABAT"));
// routes/deliveroo.ts: router.post("/import", upload.single("file"), makeXlsxImportRoute("DELIVEROO"));
```

### Anti-Patterns to Avoid

- **Re-implementing parsers in adapter files.** The adapter is a wrapper. `parseKeetaXlsx`, `parseAmericanaDailyXlsx`, `parseShiftScheduleXlsx` are pure functions in `services/*Parser.ts` — adapters call them, never duplicate them. (CON-scraper-replaceable specifies "zero changes outside the adapter module" — that includes parsers.)
- **Letting adapter source bleed into Prisma writes.** The adapter's job is to produce `NormalizedRow<T>`; the *caller* (route handler / backwash worker) writes to Prisma. Don't have `KeetaScraperAdapter.fetchOrders` write to `OrderLog` directly — return rows, let the caller upsert. This makes adapters easily testable with snapshot fixtures.
- **Returning Prisma model instances.** `NormalizedRow<T>` is a *plain object*, not a Prisma `OrderLog` row. Decouples from the schema; lets us test adapters without a DB.
- **Mixing adapter selection logic into the calling code.** Routes must call `getAdapter(platform, ctx)` then `adapter.method()`. Never `if (someConfig) callScraper() else callXlsx()` — that's exactly what the registry exists to avoid.
- **Making mobile-first the *default for everything*.** Mobile-GPS ≠ mobile-OCR. GPS gives location/online-time; OCR gives per-shift order counts. Don't put OCR data in `MobileAdapter` — that's `OcrMobileAdapter`. Keep one source = one adapter.
- **Hardcoding chunk size in the adapter.** Chunking is the worker's responsibility (`onboardingBackwashWorker` already does 5-day chunks). Adapters take a `DateRange` and produce all rows in that range — never paginate internally.
- **Throwing generic `Error` for "no source available".** Always throw `NotAvailable` with a reason — the composite uses the type to decide whether to fall through.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XLSX parsing | New parser per platform | `xlsx@0.18.5` (existing) — already used by 5 parsers in `services/` | Existing parsers handle Excel serial dates, multi-row headers, daily-column detection. Battle-tested. |
| Encrypted credential storage | New crypto layer per scraper | `utils/portalCreds.ts` (existing — AES-256-GCM, env-sourced key, decrypt-only-in-memory) | Already production-grade; same pattern works for any future portal scraper. |
| Audit trail for ingest | New audit table | `IngestRun` model (existing — `schema.prisma:1307`) | Has every field needed: `tenantId, platform, source, status, startedAt, finishedAt, rowsIn, rowsOk, errorLog`. |
| Chunked window iteration | Roll your own date chunker | `chunkWindows` in `onboardingBackwashWorker.ts` (existing — 5-day chunks; tested in Phase 2 Wave 0 RED test) | Already has the concurrency semaphore + progress emission. |
| Concurrency capping for parallel platform calls | New rate limiter | `withSemaphore` in `onboardingBackwashWorker.ts` (existing) | Already caps at 2 platforms in flight per Pitfall 5 of Phase 2. |
| Adapter pattern in TypeScript | New ad-hoc interfaces | The classic Gang-of-Four Adapter pattern documented at refactoring.guru and dev.to | Standard structural pattern; "swapping AWS SQS for BullMQ means implementing a new adapter, not rewriting your application" [CITED: web research]. The pattern is the textbook fit for CON-scraper-replaceable. |
| Date range parsing across XLSX shapes | Custom logic per platform | `parseDate`, `parseLocalDate`, `excelDateToJs` in existing `services/*Parser.ts` files | Excel-serial / `D-MMM` / `YYYY-MM-DD` / `Date` instance handling is non-trivial and already covered. |
| Driver name → Driver-id resolution | Custom matchers per platform | `resolveDriver(tenantId, empId, name)` pattern in `americanaIngestWorker.ts:9-19` | Generic two-tier match (platformDriverId → name case-insensitive); copy this exact pattern into every adapter. |
| Tenant scoping enforcement | Manual `where: { tenantId }` per query | The existing ESLint custom rule `no-prisma-without-tenant` (already wired for `lint:tenant` scope) | Phase 6 must add `services/ingest/**` to the lint:tenant scope (in `package.json` scripts) so any new adapter that forgets tenant scoping fails CI. |
| Driver-side OrderSource attribution | A new column | Existing `OrderSource` enum — `MANUAL | SCREENSHOT_OCR | EXCEL_IMPORT | AGENT_CAPTURE | WHATSAPP` (`schema.prisma:76`) | Already has every value the adapter would set. **Note:** The enum lacks a `MOBILE_GPS` value distinct from `AGENT_CAPTURE`; check whether a new value is needed during the planning step. |

**Key insight:** This phase is 80% **wiring + relocating existing code** and 20% **net-new code (Talabat + Deliveroo XLSX adapters and routes)**. Resist the temptation to "improve" parsers, the credential layer, or the chunking iterator while refactoring — they all work and are tested.

## Runtime State Inventory

> Phase 6 is a refactor phase. The grep-able file moves are obvious; the runtime state below is what could break silently.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `IngestRun.source` is a `String` field with current values `"PORTAL_SCRAPER"`, `"MANUAL_UPLOAD"`, `"OCR_MOBILE"`, `"OCR_WEB"` (per `schema.prisma:1311` comment). New vocabulary adds `"XLSX_IMPORT"` (Keeta `POST /import` already writes this — verified `keeta.ts:443`), `"BACKWASH"`, `"EMAIL_INBOX"`. Existing rows keep their values; no migration. | Document new vocabulary in code comments; existing data unchanged |
| Live service config | `keetaPortalScraperWorker` runs on a 30-min `setInterval` started by `startKeetaPortalScraperScheduler()` (called from `server.ts` at boot — verify path during planning). Env var `DISABLE_KEETA_SCRAPER=1` short-circuits it. After refactor, the scheduler imports from `services/ingest/keeta/scraper.ts` instead of the inline logic; behavior must remain identical. | Verify `server.ts` boot path calls the same `startKeetaPortalScraperScheduler` after refactor |
| OS-registered state | None — no Windows Tasks, no launchd plists, no cron jobs registered with the OS. All schedulers live in the Node.js process. | None |
| Secrets / env vars | `PORTAL_CRED_KEY` (AES-256 key for `utils/portalCreds.ts`) — must be present for any scraper. `DISABLE_KEETA_SCRAPER` toggle. `REDIS_URL` for BullMQ. Talabat/Deliveroo creds: not yet stored anywhere (no scrapers exist for them in v2). When Phase 11 adds them, they go in `PlatformSettings.notificationConfig.portalCredentials` per the existing Keeta pattern. | None for Phase 6 (no new secrets) |
| Build artifacts / installed packages | `prisma generate` regenerates `src/generated/prisma/index.d.ts`. After Phase 6's adapter directory ships, the type generation is unaffected (no schema change). If the planner decides to add `MOBILE_GPS` to `OrderSource` enum, that's a one-migration micro-change. | None unless OrderSource enum gets extended |

**Critical refactor verification steps:**

1. **Existing Keeta `POST /import` behavior is preserved.** The route's response shape today is `{ success: true, imported, errors }` — Phase 6 must keep this. Snapshot test before/after.
2. **Existing Americana `/manual-upload` → `processIngestionRows` flow is preserved.** This includes the side-effects (`scanIngestionForViolations`, attendance record upsert from `LATE`/`NO_SHOW`).
3. **Existing `keetaPortalScraperWorker` IngestRun audit row is preserved.** Phase 6 must produce the same `{status: "PARTIAL", errorLog: "Scaffold only..."}` row when called against a tenant with creds, until Phase 11 wires Playwright.
4. **Existing `onboardingBackwashWorker` RED tests still pass.** `__tests__/queues/onboardingBackwashWorker.test.ts` tests chunk count, progress events, and concurrency cap. The Phase 6 `pullChunkPhase6` must satisfy them too.

## Common Pitfalls

### Pitfall 1: Parser-in-adapter sprawl
**What goes wrong:** Adapter files start re-implementing date parsing / driver resolution / cell extraction because "we're refactoring anyway."
**Why it happens:** The temptation to "clean up" the existing parsers while moving them.
**How to avoid:** Adapters are *thin*. They call the existing parser and translate its output to `NormalizedRow<T>`. Code reviewer rule: any adapter file >150 lines is suspicious; >300 lines is a code-smell.
**Warning signs:** Adapter file imports `xlsx` directly instead of from `services/{platform}XlsxParser.ts`.

### Pitfall 2: Forgetting to write IngestRun rows
**What goes wrong:** XLSX uploads succeed silently; the dashboard's "last ingest" widget never updates because no audit row was written.
**Why it happens:** Easy to wire `adapter.ingestXlsx` and forget the route also has to call `writeIngestRun`.
**How to avoid:** Use the `makeXlsxImportRoute` factory (Pattern 5) — it bakes the `writeIngestRun` call in. For non-route callers (backwash worker, scheduled scraper), require the call as a comment-line in the adapter's interface contract.
**Warning signs:** A successful ingest with no corresponding `IngestRun` row.

### Pitfall 3: Tenant scoping bypass
**What goes wrong:** A new adapter forgets `where: { tenantId }` on a `prisma.driver.findFirst({ where: { platformDriverId: X } })` and matches a different tenant's driver.
**Why it happens:** Refactoring code from a route (where `req.user.tenantId` is implicit) to an adapter (where it's a parameter) — easy to drop the filter.
**How to avoid:** Add `services/ingest/**` to `lint:tenant` scope in `package.json::scripts.lint:tenant`. Phase 6 plan must include this lint scope expansion.
**Warning signs:** ESLint `no-prisma-without-tenant` rule fires on a new adapter file.

### Pitfall 4: CompositeAdapter swallowing real errors
**What goes wrong:** A scraper hits a network timeout; the composite catches it as `NotAvailable` and silently falls through to XLSX (which has no data); user sees "no rows ingested" with no explanation.
**Why it happens:** Over-broad `catch (err) { /* fall through */ }`.
**How to avoid:** Composite catches **only** `instanceof NotAvailable`; everything else propagates. Adapters convert their internal error states (no creds, no LocationLog, etc.) to `throw new NotAvailable(reason)` explicitly.
**Warning signs:** A `pullChunkPhase6` returns `rowsOk: 0` with no `errorLog` set.

### Pitfall 5: Mobile adapter consuming non-tenant LocationLog
**What goes wrong:** `LocationLog` (model at `schema.prisma:964`) is keyed by `driverId` and `deviceId` — not directly tenant-scoped. The mobile adapter must JOIN through `Driver` to filter by `Driver.tenantId`.
**Why it happens:** `LocationLog` schema doesn't have `tenantId` directly.
**How to avoid:** All `LocationLog` queries in mobile adapters MUST go via `prisma.locationLog.findMany({ where: { driver: { tenantId } } })`. The `lint:tenant` rule must be configured to detect this nested form (or add a comment exception with explicit driver-tenant filter).
**Warning signs:** A `prisma.locationLog.findMany({ where: { driverId, ... } })` without tenant-aware driver join — cross-tenant leak.

### Pitfall 6: Backwash chunk failure aborts the whole window
**What goes wrong:** One chunk fails (e.g., scraper-side rate limit on day 12-17 of the 30-day window); the rest of the chunks fail because the worker crashes.
**Why it happens:** No try/catch in `pullChunkPhase6` per the simplest refactor.
**How to avoid:** `pullChunkPhase6` MUST catch its own errors, write a FAILED `IngestRun` row, and return `{ rowsOk: 0 }` — never throw. The chunk iterator in `runBackwashJob` already keeps going; the outer worker logs at end.
**Warning signs:** Backwash job state goes from `active` → `failed` instead of completing with partial counts.

### Pitfall 7: Scraper credentials assumed for all platforms
**What goes wrong:** The Keeta scraper has `loadCreds(tenantId)` that pulls from `PlatformSettings.notificationConfig.portalCredentials`. A naive Talabat refactor copies this and breaks because no tenant has Talabat creds stored — every `isAvailable()` check returns `true` (creds exist!) but the actual fetch errors.
**Why it happens:** Pattern reuse without checking what data actually exists in production.
**How to avoid:** Talabat + Deliveroo `scraper.ts` adapters return `NotAvailable` unconditionally in v2 — `isAvailable()` returns `false`. Phase 11 wires the credential pattern when partner-API conversations conclude.
**Warning signs:** Talabat/Deliveroo `IngestRun` rows with `source: "PORTAL_SCRAPER"` and `status: "FAILED"` showing up in the dashboard.

### Pitfall 8: `OrderSource` enum lacks `MOBILE_GPS`
**What goes wrong:** Mobile adapter writes `OrderLog{source: "MOBILE_GPS"}` — but `OrderSource` enum (`schema.prisma:76`) doesn't have that value. Prisma client throws at runtime.
**Why it happens:** Enum was defined before mobile-GPS was a first-class source.
**How to avoid:** Either (a) add `MOBILE_GPS` to `OrderSource` enum (one-line additive migration); or (b) reuse `AGENT_CAPTURE` (the existing closest semantic). Decide during planning. Recommendation: option (a) for clarity in the audit log.
**Warning signs:** Prisma runtime error `Invalid value for argument source. Expected OrderSource.`

### Pitfall 9: Same XLSX file re-imported produces duplicate rows
**What goes wrong:** User uploads the same XLSX twice; second import doubles the OrderLog/CashRecord/Shift rows.
**Why it happens:** XLSX adapter naively `prisma.orderLog.create` instead of `upsert`.
**How to avoid:** **Idempotent loads** are a standard data-pipeline best practice [CITED: web research]. The Keeta `POST /import` already uses `upsert` with `tenantId_driverId_date` compound unique key (`keeta.ts:407-414`). Talabat + Deliveroo XLSX adapters MUST use the same pattern — find the platform's compound unique constraint (`schema.prisma`) and `upsert` against it.
**Warning signs:** Two consecutive XLSX uploads with the same file produce ×2 row counts in the platform table.

### Pitfall 10: XLSX schema drift between platforms
**What goes wrong:** Each platform has slightly different XLSX column conventions ("Rider ID" vs "Driver ID" vs "Courier ID"). A user uploads a Talabat-shaped XLSX to the Deliveroo route; the adapter parses it as garbage.
**Why it happens:** No schema declaration enforced.
**How to avoid:** Each platform XLSX adapter MUST declare its expected header row (use Zod schema or a hard-coded header list) and reject the file with HTTP 400 if headers don't match. Existing `xlsxParser.ts::parseShiftScheduleXlsx` already does this (throws "Shift schedule xlsx missing required columns"). Replicate.
**Warning signs:** Platform-specific XLSX uploads accept any file shape without column validation.

## Code Examples

### XLSX Parser Pattern (existing — use as-is)

```typescript
// services/keetaXlsxParser.ts (existing, reference)
// The parser is a pure function: Buffer → KeetaRow[]. No DB writes, no side effects.
// Source: existing code at backend/src/services/keetaXlsxParser.ts:88-144

export function parseKeetaXlsx(buffer: Buffer): KeetaRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rawData.length < 3) return [];
  const rows: KeetaRow[] = [];
  for (let i = 2; i < rawData.length; i++) {
    const r = rawData[i];
    if (!r || !r[0] || !r[1]) continue;
    rows.push({
      date: parseKeetaDate(r[0]),
      courierPlatformId: String(r[1]).trim(),
      // ... 25 more fields
    });
  }
  return rows;
}
```
[VERIFIED: `backend/src/services/keetaXlsxParser.ts` direct read]

### Adapter Wraps Parser (Phase 6 new pattern)

```typescript
// services/ingest/keeta/xlsx.ts (new in Phase 6)

import { parseKeetaXlsx } from "../../keetaXlsxParser";
import { IngestAdapter, NormalizedRow, NotAvailable } from "../types";
import { prisma } from "../../../config";

export class KeetaXlsxAdapter implements IngestAdapter {
  readonly platform = "KEETA" as const;
  readonly source = "XLSX_IMPORT" as const;

  async isAvailable(_tenantId: string): Promise<boolean> {
    return true;  // XLSX upload is always-available — user-driven
  }

  // The XLSX adapter doesn't fetch; it ingests on demand
  async fetchOrders(): Promise<never> {
    throw new NotAvailable("XLSX adapter is upload-driven; use ingestXlsx");
  }

  async ingestXlsx(tenantId: string, buffer: Buffer) {
    const rows = parseKeetaXlsx(buffer);
    let rowsOk = 0;
    const errors: string[] = [];
    for (const row of rows) {
      if (!row.courierPlatformId) {
        errors.push(`Row missing Courier ID: ${row.firstName} ${row.lastName}`);
        continue;
      }
      const driver = await prisma.driver.findFirst({
        where: { tenantId, platformDriverId: row.courierPlatformId, platform: "KEETA" },
      });
      if (!driver) {
        errors.push(`Driver not found: ${row.courierPlatformId}`);
        continue;
      }
      await prisma.keetaDailyMetrics.upsert({
        where: { tenantId_driverId_date: { tenantId, driverId: driver.id, date: row.date } },
        create: { tenantId, driverId: driver.id, /* ...row fields... */, source: "XLSX_IMPORT" },
        update: { /* ...row fields... */ },
      });
      rowsOk++;
    }
    return { rowsIn: rows.length, rowsOk, errors };
  }
}
```

### Adapter Wraps Scraper Scaffold (Phase 6 refactor of existing)

```typescript
// services/ingest/keeta/scraper.ts (refactored from queues/keetaPortalScraperWorker.ts)

import { prisma } from "../../../config";
import { decryptCred, hasEncryptedShape } from "../../../utils/portalCreds";
import { IngestAdapter, NormalizedRow, NotAvailable, DateRange } from "../types";

export class KeetaScraperAdapter implements IngestAdapter {
  readonly platform = "KEETA" as const;
  readonly source = "PORTAL_SCRAPER" as const;

  async isAvailable(tenantId: string): Promise<boolean> {
    const settings = await prisma.platformSettings.findUnique({
      where: { tenantId_platform: { tenantId, platform: "KEETA" } },
    });
    const pc = (settings?.notificationConfig as any)?.portalCredentials;
    return !!(pc?.username && hasEncryptedShape(pc.password));
  }

  async fetchOrders(tenantId: string, range: DateRange): Promise<NormalizedRow<OrderLogPayload>[]> {
    if (!await this.isAvailable(tenantId)) {
      throw new NotAvailable("No Keeta portal credentials configured for tenant");
    }
    // TODO Phase 11: real Playwright scrape — login, navigate, extract.
    // For Phase 6, scaffold only — same behavior as existing keetaPortalScraperWorker.
    return [];
  }
  // fetchShifts / fetchAttendance / fetchCash / fetchViolations follow same pattern
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer for headless browser scraping | Playwright | 2023+ | Playwright "is the default choice for scraping in 2026" [CITED: use-apify.com/blog/playwright-vs-puppeteer-vs-selenium-2026]; auto-wait, multi-browser, better proxy support. **For Phase 6: no impact (we're not adding scraping — just preserving the existing scaffold).** |
| Tightly-coupled scraper code per platform | Adapter pattern with thin wrappers | Decades-old GoF pattern, but newly relevant here | Refactor.guru / dev.to TypeScript guides confirm this is the textbook pattern for "swap one source without touching the rest." |
| Hand-rolled file parsers per platform | `xlsx` package (now `SheetJS Community Edition` since 2023) | 2023 | Existing codebase already uses `xlsx@0.18.5`. No change needed. |
| Synchronous chunk-by-chunk scraping | BullMQ + chunked async fan-out with concurrency cap | 2024 (BullMQ standard) | `onboardingBackwashWorker` already implements this pattern correctly — Phase 6 inherits it. |

**Deprecated/outdated:**
- **Manual `fetch` + cookie-jar scraping** — replaced by full browser automation (Playwright). Don't introduce in Phase 6.
- **CSV-only fallback** — XLSX is the universal format for partner exports in 2026; CSV is a rare edge case. The `xlsx` package handles both, but the schema declarations target XLSX.

## Project Constraints (from CLAUDE.md)

- TypeScript strict mode throughout — every adapter file must compile under strict mode.
- Prisma for all DB access — adapters never use raw SQL.
- All routes use `authMiddleware + tenantScope` middleware — new XLSX routes for Talabat + Deliveroo MUST inherit both. (Existing pattern: `routes/keeta.ts:1-12` and `routes/americanaIngest.ts:1-12`.)
- Pagination via `getPagination()` + `paginatedResponse()` — adapter list endpoints (if any) follow this; Phase 6 likely doesn't add list endpoints.
- Error handling: try/catch in every route, return `{ error: message }`. The `makeXlsxImportRoute` factory (Pattern 5) bakes this in.
- Platform-specific code under platform-named directories — `services/ingest/keeta/`, `services/ingest/talabat/`, etc. follows this convention exactly.
- The CLAUDE.md "NEW FEATURES" section (Keeta Operations Module Enhancement) is **out of scope** for Phase 6. Phase 6 only refactors ingest paths — it does NOT touch the violation engine, monitor pages, etc., even though those features mention adjacent concepts.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | NormalizedRow<T> shape with `data: T`, `source`, `tenantId`, `platform`, `raw?` is the right contract | Pattern 1 | Low — purely an internal type; adjustable in plan if planner finds a better shape |
| A2 | CompositeAdapter precedence is MOBILE → SCRAPER → OCR → XLSX (in that order), per platform | Pattern 3 | Medium — order matters for "mobile-app data preferred" (CON-scraper-replaceable). Recommendation matches DEC-scrapers-as-adapter-layer; planner / discuss-phase should confirm with founder before locking in. |
| A3 | XLSX upload routes for Talabat + Deliveroo are the right user flow (vs. emailing files to a backend address) | Architectural Responsibility Map | Medium — the existing Americana flow uses `americanaInboxWatcher` (email) for production but also has `/manual-upload` (XLSX) as a backup. Talabat + Deliveroo could follow either; recommendation is XLSX-first because (a) Keeta uses XLSX, (b) email watching needs IMAP credentials and a larger footprint. **Confirm with founder during Phase 6 discuss.** |
| A4 | Phase 5 (Mobile GPS Beacon) ships `LocationLog` rows with sufficient density for `KeetaMobileAdapter.fetchOrders` to work | Pattern 3, mobile adapters | Medium — Phase 5 hasn't shipped yet. If GPS density is too low (e.g., one ping per hour), mobile adapters will produce sparse data. The composite falls through gracefully if rows are empty, so this is a gradual-degradation risk, not a blocker. |
| A5 | Talabat / Deliveroo XLSX schemas can be specified by founder before Phase 6 ships | Architectural Responsibility Map | High — without a schema spec, the planner can't write parser tests. **Discuss-phase should ask founder to provide one sample export from a real fleet partner OR confirm an "MVP shape" the planner can declare.** |
| A6 | `MOBILE_GPS` should be added to the `OrderSource` enum (vs. reusing `AGENT_CAPTURE`) | Pitfall 8 | Low — purely audit-log clarity. Either choice is reversible. Recommendation: add `MOBILE_GPS`. |
| A7 | The Keeta scraper's existing `IngestRun` write pattern is the right audit-row idiom for all four platforms | Pattern 4 (writeIngestRun) | Low — existing pattern is already production-shaped. |
| A8 | No new Prisma migration is required for Phase 6 (with the exception of optional `OrderSource.MOBILE_GPS`) | Standard Stack — Installation | Low — verified by reading the schema; all needed columns exist. If A6 chooses to add the enum value, it's a one-line additive migration. |
| A9 | The 4-platform footprint won't grow within v2 milestone window, so we don't need a heavier framework like Crawlee | Standard Stack — NOT Required | Low — confirmed by REQ-ingest-partner-api-conversations being a Phase 11 concern. |
| A10 | Talabat / Deliveroo will not have real scrapers in Phase 6 — only XLSX adapters | Architectural Responsibility Map; Pattern 3 | Low — explicitly per phase goal "REFACTOR — extracts existing scraper code", and Phase 11 owns partner-API. |

**The discuss-phase MUST surface A2, A3, A5 to the user.** A2 (precedence order) and A3 (XLSX vs email for Talabat/Deliveroo) are product choices; A5 (XLSX schema) is data the founder may have or need to extract.

## Open Questions

1. **Should `MOBILE_GPS` be added to `OrderSource` enum, or reuse `AGENT_CAPTURE`?**
   - What we know: Existing enum has `MANUAL | SCREENSHOT_OCR | EXCEL_IMPORT | AGENT_CAPTURE | WHATSAPP`. `AGENT_CAPTURE` is used today for the OCR-from-mobile-screenshot flow.
   - What's unclear: Whether mobile-GPS-attributed orders (Phase 5+ feature) deserve a distinct value.
   - Recommendation: Add `MOBILE_GPS` for clarity in audit logs and the "Darb's read on your fleet" report (which surfaces source breakdowns). One-line additive migration — low risk.

2. **Talabat / Deliveroo XLSX schema — do we have a sample export?**
   - What we know: Keeta has a 27-column XLSX shape (`parseKeetaXlsx` covers it). Americana has its monthly + daily shapes.
   - What's unclear: What columns does a Talabat partner-portal export have? Deliveroo?
   - Recommendation: Discuss-phase asks founder for a sample export from each platform. If unavailable, declare a minimum shape (date, driver_id, orders_count, online_minutes, attendance_status) and let the planner build a permissive parser that ignores unknown columns. The shape can be refined once the first design partner uploads a real file.

3. **Do we need per-tenant precedence overrides in v1 (e.g., "this tenant prefers XLSX over scraper")?**
   - What we know: The registry hard-codes precedence per platform. CON-scraper-replaceable says scrapers must be swappable but doesn't require per-tenant control.
   - What's unclear: Whether design partner #1 wants explicit control.
   - Recommendation: NO in v1 — hard-code precedence per platform. Add `PlatformSettings.notificationConfig.ingestPreferences` later (Phase 11 candidate) if requested.

4. **Should the email-inbox adapter for Americana stay as-is, or be relocated?**
   - What we know: `services/americanaInboxWatcher.ts` watches an IMAP inbox for daily Americana feeds.
   - What's unclear: Whether to fold it into `services/ingest/americana/email.ts` (consistent layout) or leave it where it is (lower churn).
   - Recommendation: Leave the existing file in place; create `services/ingest/americana/email.ts` as a *thin wrapper* that imports from the existing watcher. Same pattern as scraper.ts wraps the existing scaffold. Minimizes refactor blast radius.

5. **Where does `MOBILE_GPS` data actually live for non-order data (shifts, cash)?**
   - What we know: Phase 5 hasn't shipped. The mobile app today is "basic" per CLAUDE.md.
   - What's unclear: Will Phase 5 produce `Shift` rows or `AttendanceRecord` rows automatically? Or only `LocationLog`?
   - Recommendation: For Phase 6, mobile adapters return `NotAvailable` for `fetchShifts` / `fetchCash` / `fetchAttendance` / `fetchViolations` and only implement `fetchOrders` (derived from `LocationLog` + `OrderLog{source: AGENT_CAPTURE}`). Phase 5 can extend this when it ships.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Whole project | (assume) | ≥18 (per existing) | — |
| TypeScript | Build | (assume) | ^5.x (existing) | — |
| `xlsx` | Every XLSX adapter | ✓ | 0.18.5 | — |
| `bullmq` | Backwash worker | ✓ | 5.73.4 | — |
| `@prisma/client` | All DB writes | ✓ | 5.22.0 | — |
| Redis | BullMQ queue (only used in production; tests use injection) | (assume conditional) | (env-dependent) | `getOnboardingBackwashQueue()` already returns `null` when `REDIS_URL` is not set or is the default — graceful degradation already wired |
| PostgreSQL | All `prisma.*` writes | (assume) | 15 (per CLAUDE.md) | — |
| Playwright (for real scraper) | NOT REQUIRED in Phase 6 | ✗ | — | Scraper adapters are scaffold-only; real scraping is Phase 11 (REQ-ingest-partner-api-conversations) |
| `PORTAL_CRED_KEY` env var | KeetaScraperAdapter.isAvailable() (existing pattern) | (env-dependent) | — | If missing, scraper throws with a clear error (existing behavior preserved) |
| Mobile GPS data (Phase 5 output) | Mobile adapters | ✗ (Phase 5 not yet shipped) | — | Mobile adapters return `NotAvailable`; CompositeAdapter falls through to scraper/XLSX |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- Playwright (real scraper): Phase 11 concern; v2 keeps scaffold-only behavior.
- Phase 5 mobile data: composite falls through gracefully when LocationLog density is zero.

## Validation Architecture

> Phase 6 includes the Validation Architecture section because `workflow.nyquist_validation` is not explicitly disabled in `.planning/config.json` (file does not exist; default = enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 (verified via `backend/package.json::scripts.test = "jest"`) |
| Config file | `backend/jest.config.*` (existing — verified by `npm test` working in CI per Phase 1/Phase 2 outputs) |
| Quick run command | `cd backend && npm test -- --testPathPattern=ingest` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-ingest-adapter-layer | All four platforms expose `IngestAdapter` instances via `getAdapter(platform, ctx)` | unit | `npm test -- --testPathPattern=services/ingest/registry` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | CompositeAdapter falls through on `NotAvailable`, halts on first non-empty result | unit | `npm test -- --testPathPattern=services/ingest/composite` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | KeetaXlsxAdapter parses XLSX → upserts KeetaDailyMetrics → preserves existing `POST /import` response shape | integration (snapshot vs existing route) | `npm test -- --testPathPattern=services/ingest/keeta/xlsx` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | Talabat XLSX upload route returns `{success, rowsIn, rowsOk, errors}` and writes `IngestRun` row | integration | `npm test -- --testPathPattern=routes/talabat.import` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | Deliveroo XLSX upload route returns same shape | integration | `npm test -- --testPathPattern=routes/deliveroo.import` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | KeetaScraperAdapter preserves existing `IngestRun{status: "PARTIAL", errorLog: "Scaffold only..."}` behavior when called against a tenant with no creds | unit | `npm test -- --testPathPattern=services/ingest/keeta/scraper` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | onboardingBackwashWorker chunked-window iteration still passes its existing 3 RED tests after pullChunk swap | regression | `npm test -- --testPathPattern=queues/onboardingBackwashWorker` | ✅ existing — must continue to pass |
| REQ-ingest-adapter-layer | Mobile adapter returns `NotAvailable` when LocationLog window has zero rows | unit | `npm test -- --testPathPattern=services/ingest/keeta/mobile` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | Tenant scope enforced: KeetaXlsxAdapter cannot match a Driver from another tenant | unit + lint | `npm run lint:tenant && npm test -- --testPathPattern=services/ingest/.*\\.tenant` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | XLSX duplicate import is idempotent (upsert not create) | integration | `npm test -- --testPathPattern=services/ingest/.*\\.idempotent` | ❌ Wave 0 |
| REQ-ingest-adapter-layer | XLSX with bad schema (wrong header row) returns 400 with explanatory error | integration | `npm test -- --testPathPattern=services/ingest/.*\\.schema-validation` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && npm test -- --testPathPattern=ingest` (~3-5s for ingest unit tests)
- **Per wave merge:** `cd backend && npm test` (full suite green; ~30-60s)
- **Phase gate:** Full suite green + `npm run lint:tenant` passes with `services/ingest/**` in scope before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/src/__tests__/services/ingest/registry.test.ts` — covers REQ-ingest-adapter-layer (registry returns CompositeAdapter for each Platform)
- [ ] `backend/src/__tests__/services/ingest/composite.test.ts` — covers REQ-ingest-adapter-layer (precedence + NotAvailable fallthrough + propagation of unexpected errors)
- [ ] `backend/src/__tests__/services/ingest/keeta/xlsx.test.ts` — covers existing `POST /import` snapshot behavior + new adapter shape
- [ ] `backend/src/__tests__/services/ingest/keeta/scraper.test.ts` — covers existing scraper scaffold behavior preservation
- [ ] `backend/src/__tests__/services/ingest/keeta/mobile.test.ts` — covers `isAvailable()` returning false when no LocationLog rows
- [ ] `backend/src/__tests__/services/ingest/talabat/xlsx.test.ts` — NEW (Phase 6 ships this adapter)
- [ ] `backend/src/__tests__/services/ingest/deliveroo/xlsx.test.ts` — NEW
- [ ] `backend/src/__tests__/services/ingest/americana/xlsx.test.ts` — covers existing manual-upload behavior preservation
- [ ] `backend/src/__tests__/routes/talabatImport.test.ts` — NEW route POST /api/talabat/import
- [ ] `backend/src/__tests__/routes/deliverooImport.test.ts` — NEW route POST /api/deliveroo/import
- [ ] Test fixtures: sample XLSX buffers for Talabat / Deliveroo / Keeta (existing) — `backend/src/__tests__/services/ingest/fixtures/`
- [ ] Existing `backend/src/__tests__/queues/onboardingBackwashWorker.test.ts` continues to pass with `pullChunkPhase6` — verify, no new file needed
- [ ] `lint:tenant` script in `package.json` updated to include `src/services/ingest/**`

*(All test infrastructure pieces use Jest, which is already wired. No framework install needed.)*

## Security Domain

> `security_enforcement` is enabled by default (no explicit opt-out in config). Phase 6 refactor has limited security surface but the encrypted-credential layer requires explicit handling.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `authMiddleware` on every new XLSX route (per CLAUDE.md "All routes use authMiddleware") |
| V3 Session Management | no | Adapter layer doesn't manage sessions; routes inherit from existing JWT middleware |
| V4 Access Control | yes | Existing `tenantScope` middleware on every route + ESLint `no-prisma-without-tenant` rule extended to `services/ingest/**` |
| V5 Input Validation | yes | XLSX route validates: (a) file presence, (b) file size limit (existing `upload` middleware), (c) header schema match (Pitfall 10), (d) row count sanity. Use Zod for `NormalizedRow<T>` validation. |
| V6 Cryptography | yes | Portal credentials use existing `utils/portalCreds.ts::encryptCred/decryptCred` — AES-256-GCM with env-sourced key. **Never roll new crypto for adapter-side credential handling.** |
| V8 Data Protection | yes | Plaintext credentials never leave server process; decrypted only in scraper-adapter scope; existing pattern preserved verbatim. |
| V12 Files and Resources | yes | XLSX uploads use existing `multer` upload middleware with size + type limits (existing pattern in `routes/keeta.ts`); Phase 6 adapters trust the upload middleware. |

### Known Threat Patterns for {Express + Prisma + xlsx + multi-tenant}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leak via missing `tenantId` filter on `prisma.driver.findFirst` | Information disclosure | ESLint `no-prisma-without-tenant` rule; expand `lint:tenant` scope to `services/ingest/**` |
| XLSX upload as XXE / formula injection (CVE-style) | Tampering | The `xlsx@0.18.5` library disables external entity resolution by default; document this assumption. Don't pipe XLSX cell values into shell or eval. |
| Credential exposure via error log | Information disclosure | The existing scraper logs only `err.message` (not full error object); preserve. Adapters MUST NOT log full `PortalCredentials` objects. |
| Replay attack on XLSX upload (re-upload same file maliciously) | Tampering | Idempotent upserts (Pitfall 9); duplicate file produces same DB state, not appended. |
| Path traversal via uploaded filename | Tampering | Existing `multer` config already sanitizes; adapters never read `req.file.originalname` for filesystem operations — only `req.file.path`. |
| Adapter dispatching to wrong tenant's source | Information disclosure | Adapter constructor takes `tenantId` parameter; every method receives `tenantId`; type system enforces no method bypasses it. |
| BullMQ job picking up wrong tenant's data due to job-data corruption | Information disclosure | Existing `runBackwashJob` already takes `tenantId` as first-class field in `BackwashJobData`; preserve. Never read `tenantId` from a side channel. |

**Phase 6 security checklist:**
- [ ] All four new XLSX routes (Keeta refactored + Americana refactored + Talabat NEW + Deliveroo NEW) use `authMiddleware + tenantScope` middleware chain.
- [ ] `lint:tenant` script in `backend/package.json` is extended to include `src/services/ingest/`.
- [ ] No adapter file imports `crypto` directly (use `utils/portalCreds.ts` only).
- [ ] No new env vars introduced for Phase 6 (preserves existing secrets boundary).
- [ ] XLSX schema validation rejects malformed files with HTTP 400 before any DB write.
- [ ] `PORTAL_CRED_KEY` rotation: existing scraper handles missing key → throws on first use; preserved in adapter.

## Sources

### Primary (HIGH confidence)
- `backend/src/queues/onboardingBackwashWorker.ts` — Phase 2 backwash skeleton with `pullChunk` injection seam (the exact integration point for Phase 6) [VERIFIED: direct read]
- `backend/src/queues/keetaPortalScraperWorker.ts` — Existing Keeta scraper scaffold with Playwright TODOs and IngestRun audit pattern [VERIFIED: direct read]
- `backend/src/queues/americanaIngestWorker.ts` — Existing Americana ingest worker with the canonical `parse → stage → approve → merge → side-effect` pipeline [VERIFIED: direct read]
- `backend/src/services/keetaXlsxParser.ts`, `americanaXlsxParser.ts`, `americanaDailyParser.ts`, `xlsxParser.ts` — Existing pure-function parsers; adapters wrap these [VERIFIED: direct read]
- `backend/src/routes/keeta.ts` (POST /import) — Canonical XLSX-fallback route per CON-xlsx-fallback [VERIFIED: direct read]
- `backend/src/routes/americanaIngest.ts` — Reference for the upload + approve pattern [VERIFIED: direct read]
- `backend/src/utils/portalCreds.ts` — AES-256-GCM credential encryption layer [VERIFIED: direct read]
- `backend/prisma/schema.prisma:1307-1321` — `IngestRun` model with all needed audit fields [VERIFIED: direct read]
- `backend/prisma/schema.prisma:76-82` — `OrderSource` enum (existing source vocabulary) [VERIFIED: direct read]
- `backend/prisma/schema.prisma:739-770` — `OrderLog` model (target for adapter writes) [VERIFIED: direct read]
- `backend/prisma/schema.prisma:964-979` — `LocationLog` model (Phase 5 mobile data source) [VERIFIED: direct read]
- `.planning/intel/decisions.md::DEC-scrapers-as-adapter-layer` — The explicit decision driving this phase [VERIFIED: direct read]
- `.planning/intel/constraints.md::CON-scraper-replaceable, CON-xlsx-fallback` — Both constraints explicitly cited [VERIFIED: direct read]
- `.planning/REQUIREMENTS.md::REQ-ingest-adapter-layer` — Full requirement text [VERIFIED: direct read]
- `PRD_Darb_v2.md` §7.3 "The scraping problem" — Adapter-layer mandate, mobile-as-preferred, partner-API in Q3 [VERIFIED: direct read]
- `backend/src/__tests__/queues/onboardingBackwashWorker.test.ts` — Existing RED tests Phase 6 must preserve [VERIFIED: direct read]
- `backend/package.json` — Verified versions: `xlsx@0.18.5`, `bullmq@5.73.4`, `@prisma/client@5.22.0` [VERIFIED: direct read]

### Secondary (MEDIUM confidence)
- [Adapter Pattern in TypeScript](https://medium.com/@robinviktorsson/a-guide-to-the-adapter-design-pattern-in-typescript-and-node-js-with-practical-examples-f11590ace581) — Standard pattern; the canonical TypeScript implementation
- [Adapter in TypeScript / Design Patterns](https://refactoring.guru/design-patterns/adapter/typescript/example) — GoF Adapter reference
- [Playwright vs Puppeteer 2026 — BrowserStack](https://www.browserstack.com/guide/playwright-vs-puppeteer) — "Playwright wins on stability and proxy management" — informs the deferred Phase 11 scraper choice
- [Selenium vs Playwright vs Puppeteer 2026 — Apify](https://use-apify.com/blog/selenium-vs-playwright-vs-puppeteer-2026) — Confirms Playwright as 2026 default
- [Designing Scalable Data Ingestion Pipelines](https://unstructured.io/insights/designing-scalable-data-ingestion-pipelines-for-ai-workloads) — Confirms idempotency + incremental loads as standard practice
- [TypeScript instead of Python for ETL pipelines — LogRocket](https://blog.logrocket.com/use-typescript-instead-python-etl-pipelines/) — Confirms TypeScript adapter ergonomics for multi-source ingest
- [Building Production ETL Pipelines in Node.js](https://dev.to/arslan_mecom/building-production-etl-pipelines-in-nodejs-with-hazeljs-data-36hi) — Pattern reference for the ingest pipeline shape

### Tertiary (LOW confidence)
- None used as load-bearing claims — every architectural assertion in this research is grounded in existing code or HIGH/MEDIUM source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library version verified directly from `package.json`; no new packages introduced.
- Architecture: HIGH — adapter pattern is textbook; precedence chain is a standard composite pattern; all integration points (backwash worker, IngestRun audit, encrypted creds) are existing in the codebase and verified.
- Pitfalls: HIGH — derived from direct inspection of the existing scraper + parser + worker files; each pitfall has a concrete file:line reference.
- Existing scraper inventory: HIGH — every scraper / parser / route / worker referenced was opened and inspected.
- Talabat / Deliveroo XLSX schemas: LOW — no sample exports available; planner must declare a minimum shape or ask founder. Flagged in Open Questions #2.
- Phase 5 mobile-data shape: MEDIUM — Phase 5 not yet shipped; mobile adapter behavior is partially speculative. Flagged in Assumptions A4, Open Questions #5.

**Research date:** 2026-05-10
**Valid until:** 2026-06-09 (30 days — ingest is stable; only short-leash if `xlsx` library has a CVE or Phase 5 ships and changes the LocationLog schema)
