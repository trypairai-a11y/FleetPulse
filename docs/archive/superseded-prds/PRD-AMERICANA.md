# PRD-AMERICANA — Americana Platform Module Spec

**Version:** 0.2 (system-decision alignment)
**Date:** 20 April 2026
**Owner:** Khalifa
**Audience:** Claude Code (repo-native implementation) + product + ops stakeholders
**Convention:** Same format as `KEETA-PARITY-SPEC.md` and `PRD-RESTRUCTURE.md`. Feature IDs prefixed `A1`–`A9`. Decisions prefixed `DA1`–`DA14`.

> **v0.2 amendments (from `PRD-SYSTEM.md` + `DECISIONS.md`):**
> - **DS3** overrides **DA5**: contract-PDF OCR is **deferred to v2**. v1 uses manual chain-rate CRUD only.
> - **DS13** removes **WhatsApp**. `AmericanaStore.managerWhatsapp` field deleted; no click-to-chat WhatsApp references.
> - **DS12** removes **transactional email**. All notifications (ingest-ready, feed-missing) go through the in-app bell + SSE + mobile push — never email. Americana HQ's inbound email is unaffected; it's one-way ingestion, not outbound notification.
> - **DS14** makes v1 **English-only**. Arabic strings park for v2.

---

## 1. Positioning — why Americana is the odd platform

Keeta, Talabat, and Deliveroo are **public gig platforms** — drivers are paid per-order by the platform, tips matter, violations come from the platform, operations is real-time and SLA-enforced by the platform.

Americana is a **B2B corporate contract fleet**:
- We supply our drivers to Americana's franchise stores (KFC, Pizza Hut, Hardees, Krispy Kreme, TGI Fridays, Peet's, Wimpy, etc.).
- We invoice Americana HQ monthly. Revenue = `orders × rate`, where rate is defined per `(chain, vehicleType)` in a signed contract.
- Drivers are **our** employees — salary, benefits, vehicle, visa, fuel are our cost.
- Americana HQ sends a **daily email with an XLSX attachment** containing per-driver, per-store order counts and attendance status. This replaces any need for driver app check-in on this platform.
- SLAs are **internal targets** (no automatic billing deductions from Americana).
- Reconciliation with Americana's statement lives in the **accounting system**, not Darb. Darb is the delivery-ops + data source.

**Implication:** Americana is the *finance backbone* of Darb, not another ops console. The module's job is to produce clean revenue numbers and clean cost numbers so accounting and top management can make decisions. v1 ships the **revenue** layer plus ops plumbing; the **cost** layer ships in v2 with HR/payroll integration (see DA3).

---

## 2. Current state (20 April 2026)

**Backend routes (`backend/src/routes/americana.ts`, 271 lines):**
- `GET/POST/PUT /orders` — CRUD on `AmericanaDailyOrders`
- `GET /orders/summary` — monthly aggregates
- `GET /drivers/summary` — adapter-based driver roll-up
- `POST /import` — XLSX upload (single sheet, monthly)

**Prisma models:**
- `AmericanaDailyOrders` with `tenantId, driverId, month, chain, empId, storeName, costCenter, company, position, dailyOrders(JSON), totalOrders, source`, unique on `(tenantId, driverId, month)`.

**Frontend (`frontend/src/app/(dashboard)/americana/`):**
- 10 tabs: overview, drivers, orders, performance, attendance, shifts, phones, vehicles, violations, settings — same shape as Keeta/Talabat. Most are shells without Americana-specific logic.

**Gaps vs. where we need to be:**
1. Ingestion is one-shot monthly manual; we need a daily IMAP pipeline.
2. No chain/store/contract/rate entities — pricing is not modelled.
3. No store-to-driver assignment model; assignments are implicit in `AmericanaDailyOrders` rows.
4. No Americana-flavored violations.
5. Driver 360 doesn't know a driver is on Americana (no platform-specific tab).
6. No exec-ready revenue view.
7. Sidebar bloat: 10 tabs, most empty.

---

## 3. Implementation order

| # | Feature ID | Title | Priority | Notes |
|---|---|---|---|---|
| 1 | A1 | Daily IMAP XLSX ingestion pipeline | P0 | Unblocks everything else — daily data flow |
| 2 | A2 | Chain + Store + Contract + ChainRate entities | P0 | Pricing layer; required for revenue math. **Contract-OCR worker deferred to v2 per DS3** — v1 is manual CRUD only. |
| 3 | A3 | Monthly Store Assignment model + history | P0 | Enables headcount-gap and assignment board later |
| 4 | A4 | Overview redesign (revenue, orders, headcount gap) | P0 | Exec landing |
| 5 | A5 | Driver 360 Americana wiring | P1 | Profile + Assets (shared) + Monthly Orders Grid |
| 6 | A6 | Internal violations engine (3 types) | P1 | No Appeal model; supervisor override only |
| 7 | A7 | Performance tier engine (composite) | P1 | Gold/Silver/Bronze on orders + attendance + violations |
| 8 | A8 | Monthly XLSX export for accounting | P2 | Simple button, not a reconciliation UI |
| 9 | A9 | Sidebar cleanup (10 → 5 tabs) | P2 | Remove shells: attendance, shifts, performance, phones, vehicles |

**v2 roadmap (explicitly out of scope for v1):**
- HR/payroll integration → fully-loaded driver cost → margin-per-store column.
- Monthly drag-drop store-assignment board.
- Replacement-sourcing tool.
- **Contract-PDF OCR** (per DS3) — v1 uses manual rate CRUD; v2 lights up the `americanaContractOcrWorker`.
- AI exceptions digest — v2 only; **not email** (DS12) even in v2 until an email decision reverses.
- Direct accounting system connector (QuickBooks / Xero / Odoo).
- Per-store contract rollup and renewal-risk scoring.
- **WhatsApp manager contact click-to-chat** (per DS13) — field not stored in v1.
- **Arabic copy** for Americana-specific UI (per DS14).

---

## 4. Feature specs

### A1 — Daily IMAP XLSX ingestion pipeline

**Source:** Americana HQ sends a daily email with an XLSX attachment to a dedicated mailbox (e.g., `americana-feed@<tenant>.darb.app`). The XLSX contains that day's counts and attendance status per driver × store (full-day snapshot; re-ingestion is idempotent — DA7).

**New files:**
- `backend/src/services/americanaInboxWatcher.ts` — IMAP client (uses `imapflow`), polls every 10 min, fetches attachments, writes raw file + parsed rows to `AmericanaDailyIngestion`.
- `backend/src/queues/americanaIngestWorker.ts` — BullMQ worker consuming the parsed rows, validating, merging into `AmericanaDailyOrders` + `Attendance` records, emitting a supervisor notification.
- `backend/src/services/americanaDailyParser.ts` — extends existing `americanaXlsxParser.ts` to handle daily single-day sheets (distinct from monthly).
- `backend/src/routes/americanaIngest.ts` — admin routes:
  - `GET /api/americana/ingest` — list recent ingestions with status
  - `POST /api/americana/ingest/:id/approve` — promote staging to production
  - `POST /api/americana/ingest/:id/reject` — reject with reason
  - `POST /api/americana/ingest/manual-upload` — manual XLSX upload fallback (used when email fails)

**Prisma additions:**

```prisma
model AmericanaDailyIngestion {
  id              String   @id @default(cuid())
  tenantId        String
  source          String   // "EMAIL" | "MANUAL_UPLOAD"
  emailMessageId  String?  // for dedupe
  rawFileUrl      String   // S3 / local path to original XLSX
  capturedAt      DateTime @default(now())
  ingestDate      DateTime // the day the XLSX represents (derived)
  status          String   @default("PENDING_REVIEW") // PENDING_REVIEW | APPROVED | REJECTED | FAILED
  parsedRows      Json     // normalized rows for review before merge
  rowCount        Int
  errorLog        String?  // parse errors, if any
  approvedBy      String?
  approvedAt      DateTime?
  rejectedReason  String?

  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, ingestDate])
  @@index([tenantId, status])
  @@unique([tenantId, emailMessageId])
}
```

**Behavior:**
1. Watcher polls every 10 min, fetches new messages for the tenant's configured inbox.
2. Each message is deduped on `emailMessageId`.
3. XLSX parsed; rows staged into `AmericanaDailyIngestion.parsedRows`.
4. **In-app** notification created (DS12 — no outbound email): *"Americana daily ingest ready for approval — 47 drivers, 12 stores"*. Delivered via SSE to the ops dashboard bell + Expo push to the supervisor's mobile app. Category = `OPS_TODO`, severity = `MEDIUM`.
5. Ops approves → worker writes rows into `AmericanaDailyOrders.dailyOrders[day]` and creates `Attendance` records for `NO_SHOW`/`LATE_ARRIVAL` auto-detection.
6. Re-ingestion of the same day fully replaces that day's value in `dailyOrders`; `totalOrders` is recomputed from the array. Idempotent. (DA7)
7. If no email arrives by 09:00 tenant-local the next day → **in-app** notification (again, no outbound email): *"Americana daily feed missing for {date} — check mailbox"*. Category = `IMPORTANT`, severity = `HIGH`.

**Note on the word "email":** A1 describes *inbound* email that Americana HQ sends to Darb's IMAP inbox — that's data ingestion, not a Darb-issued notification. Darb still issues **zero outbound email** in v1 (DS12).

**Acceptance:**
- Happy path: email arrives by 06:00, ingested, approved, orders visible in UI by 06:15.
- Missing-day alarm fires if no feed by 09:00 next day.
- Manual upload fallback works end-to-end (UI on Settings → Americana → Ingest).

---

### A2 — Chain + Store + Contract + ChainRate entities

**Today:** `chain` and `storeName` are free-text strings on `AmericanaDailyOrders`. That makes aggregation noisy (KFC vs Kfc vs KFC Kuwait) and breaks chain mix analysis.

**Prisma additions:**

```prisma
model AmericanaChain {
  id              String   @id @default(cuid())
  tenantId        String
  name            String   // "KFC", "Pizza Hut", ...
  slug            String   // normalized: "kfc"
  logoUrl         String?
  active          Boolean  @default(true)
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  stores          AmericanaStore[]
  rates           AmericanaChainRate[]

  @@unique([tenantId, slug])
  @@index([tenantId, active])
}

model AmericanaStore {
  id                  String   @id @default(cuid())
  tenantId            String
  chainId             String
  name                String   // "KFC Hawally"
  area                String?  // "Hawally", "Salmiya", etc.
  costCenter          String?  // Americana HQ cost-center code
  managerName         String?
  managerPhone        String?
  // managerWhatsapp removed per DS13 — no WhatsApp in v1
  backupContactName   String?
  backupContactPhone  String?
  notes               String?
  active              Boolean  @default(true)

  tenant              Tenant   @relation(fields: [tenantId], references: [id])
  chain               AmericanaChain @relation(fields: [chainId], references: [id])
  assignments         AmericanaStoreAssignment[]

  @@unique([tenantId, name])
  @@index([tenantId, chainId])
  @@index([tenantId, active])
}

model AmericanaContract {
  id              String   @id @default(cuid())
  tenantId        String
  contractRef     String   // e.g. "AMR-2024-03"
  signedDate      DateTime
  effectiveFrom   DateTime
  effectiveTo     DateTime?
  originalFileUrl String   // uploaded PDF
  ocrStatus       String   @default("PENDING") // PENDING | PROCESSING | DONE | FAILED
  ocrExtractedAt  DateTime?
  ocrConfidence   Float?
  notes           String?

  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  rates           AmericanaChainRate[]

  @@index([tenantId, effectiveFrom])
  @@unique([tenantId, contractRef])
}

model AmericanaChainRate {
  id              String   @id @default(cuid())
  tenantId        String
  chainId         String
  vehicleType     String   // "CAR" | "BIKE"
  ratePerOrder    Decimal  @db.Decimal(10, 3) // KWD, 3 decimals
  effectiveFrom   DateTime
  effectiveTo     DateTime?
  contractId      String?  // nullable because manually entered rates are allowed
  createdBy       String
  createdAt       DateTime @default(now())

  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  chain           AmericanaChain @relation(fields: [chainId], references: [id])
  contract        AmericanaContract? @relation(fields: [contractId], references: [id])

  @@index([tenantId, chainId, vehicleType, effectiveFrom])
}
```

**Contract OCR uploader (DA5) — DEFERRED TO v2 per DS3.**

v1 behaviour:
- Contracts can still be **uploaded as PDF** for archival (`POST /api/americana/contracts/upload` creates the `AmericanaContract` row). `ocrStatus` stays `PENDING` and no worker runs against it.
- `AmericanaChainRate` rows are created via **manual CRUD** in Settings → Chain Rates (see A9 / §A9). Each rate references a `contractId` that ops types in.
- `AmericanaContract.originalFileUrl` gives accountants a link to the signed PDF for audit; no structured extraction.
- UI `settings/contracts/[id]/page.tsx` shows the PDF + a hand-entered rate table linked to the contract; no "extracted rates to review" pane in v1.

v2 (when DS3 relaxes):
- Claude vision OCR worker (`americanaContractOcrWorker.ts`) populates candidate rates; side-by-side human-review UI lands then.
- Until then, the `ocrStatus`, `ocrExtractedAt`, `ocrConfidence` columns stay on the schema but remain null in v1 — they're v2-ready.

**Rate lookup helper:** `getRate(tenantId, chainId, vehicleType, date) → Decimal | null`
- Used in every revenue calculation. Returns the rate whose `effectiveFrom ≤ date < effectiveTo` (or open-ended). Null if missing → revenue shown as `—`, alert raised in Settings banner.

**Acceptance:**
- Seeding a chain + store + contract + rate produces correct revenue on the Orders page.
- Contract PDF upload stores the file and creates an `AmericanaContract` row linked to rates; OCR pipeline is **not required in v1** (DS3). Manual rate entry via Settings → Chain Rates is the only v1 path.
- Missing-rate banner: Overview shows banner when any store in the month has orders but no applicable rate.

---

### A3 — Monthly Store Assignment model

**Intent:** Assignments are fixed per month, changes rare (DA4). Every change needs a reason trail so we can explain driver movement to HQ and finance.

**Prisma additions:**

```prisma
model AmericanaStoreAssignment {
  id              String   @id @default(cuid())
  tenantId        String
  driverId        String
  storeId         String
  month           DateTime // first-of-month
  startDate       DateTime // may differ if mid-month swap
  endDate         DateTime?
  vehicleType     String   // "CAR" | "BIKE"
  reasonForChange String?  // free text — used only when swapping mid-month
  previousAssignmentId String?
  createdBy       String
  createdAt       DateTime @default(now())

  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  driver          Driver   @relation(fields: [driverId], references: [id])
  store           AmericanaStore @relation(fields: [storeId], references: [id])

  @@unique([tenantId, driverId, month, startDate])
  @@index([tenantId, storeId, month])
  @@index([tenantId, driverId, month])
}
```

**Routes (`backend/src/routes/americanaAssignments.ts`):**
- `GET /api/americana/assignments?month=YYYY-MM&storeId=...&driverId=...`
- `POST /api/americana/assignments` — create (and auto-close any overlapping assignment with `endDate = today`).
- `PUT /api/americana/assignments/:id` — edit `endDate`, `reasonForChange`.

**Validation:**
- Vehicle type on assignment must match `Driver.vehicleType`.
- Store's area radius constraint: **Bike** drivers can only be assigned to stores whose `area` is in the configured bike-radius list (DA10).
- One primary assignment per driver per month — overlapping active assignments rejected.

**Backfill:** A one-time migration infers assignments from existing `AmericanaDailyOrders` rows (driver + storeName + month) for historical data.

---

### A4 — Overview redesign

**Path:** `frontend/src/app/(dashboard)/americana/overview/page.tsx`

**Three primary cards (top of page):**

1. **Revenue MTD by Store** (primary card, 60% width)
   - Sortable table: Store · Chain · Orders MTD · Rate · Revenue MTD · Revenue LM (last month) · Δ% · Trend sparkline
   - Filters: chain, area, vehicle-type
   - Revenue cell shows `—` if no rate resolves; tooltip explains why
   - Click row → store detail page (v2 — for now opens a drawer with 3-month history)
   - **No Margin column in v1** (DA3) — clearly labelled "Margin available in v2"

2. **Chain Mix & Revenue Trend** (top-right)
   - Donut: revenue share by chain for current month
   - 6-month line chart: total Americana revenue per month
   - Concentration badge: "Top chain = KFC (42%)"
   - Alerts if any chain exceeds 60% of revenue (concentration risk)

3. **Headcount vs Demand Gap** (below)
   - For each store:
     - `neededDrivers = round((trailing30Orders / 30) / targetPerDriverPerDay[store.vehicleType])` (DA11)
     - `currentDrivers = count of active assignments this month at the store`
     - `gap = neededDrivers - currentDrivers`
     - Color: green (`gap ≤ 0`), amber (`gap === 1`), red (`gap ≥ 2`)
   - Sortable by gap desc (red stores on top)
   - Recommended action column: "Add 2 Bike drivers" / "Overstaffed by 1, consider reassignment"

**Route:** `GET /api/americana/overview?month=YYYY-MM` returns all three cards' data in one call (keep it fast).

**Not on Overview:** daily exceptions digest (explicitly deferred to v2 scheduled email).

---

### A5 — Driver 360 Americana wiring

**Path:** `frontend/src/components/driver360/DriverProfile.tsx` + Americana-specific tab content.

**Tabs when driver's active platform includes AMERICANA:**

1. **Profile** (shared base) — Personal info, documents, phone, contract, tenure. Inline sections at the bottom of Profile (compact, not their own tab per DA12):
   - *Recent attendance:* last 14 days attendance status pulled from HQ feed; muted visual weight.
   - *Open violations:* current month's open violations + "override" button for supervisors.

2. **Assets** (shared base) — Vehicle, SIM, uniform.

3. **Americana Orders** (Americana-specific) — the monthly day-grid (1-31 across top, current + past 5 months down; cells colored by volume). Toggle between month view and trend view. Store column shows which store the driver was at each month.

**Routes:**
- `GET /api/americana/drivers/:id/monthly-grid?from=YYYY-MM&to=YYYY-MM` — returns the grid data.
- `GET /api/americana/drivers/:id/recent-attendance?days=14`
- `GET /api/americana/drivers/:id/violations?status=OPEN`

---

### A6 — Internal violations (3 types)

**Types (extend existing `ViolationType` enum):**
- `AMERICANA_LATE_ARRIVAL` — auto-detected when HQ feed shows driver check-in >15 min after shift start (threshold configurable, DA9).
- `AMERICANA_NO_SHOW` — auto-detected when HQ feed shows driver was expected but never checked in.
- `AMERICANA_EARLY_DEPARTURE_QUIT` — manual flag by supervisor; not derivable from HQ end-of-day feed.

**Engine:** `backend/src/services/americanaViolationEngine.ts` — runs after each successful `A1` ingestion, scans the new day's rows, creates violation records.

**Supervisor override (DA8):** No Appeal model. On violation detail, supervisors can flip `violationStatus` from `ESTABLISHED` to `OVERTURNED` and write a `overrideReason` string. The existing `Violation` model already supports this status change.

**Prisma addition to existing `Violation` model:**

```prisma
model Violation {
  // ... existing fields ...
  overrideReason  String?
  overriddenBy    String?
  overriddenAt    DateTime?
}
```

**Page:** `frontend/src/app/(dashboard)/americana/violations/page.tsx` — filterable list, columns: Date · Driver · Store · Type · Status (pill) · Override · Reason (if overturned).

---

### A7 — Performance tier engine

**Computed nightly per driver, current month:**

```
orders_pct      = totalMonthOrders / targetMonthlyOrders
attendance_pct  = presentDays / scheduledDays   (from HQ feed)
violations_hits = count of ESTABLISHED violations this month

composite = weight_o * orders_pct + weight_a * attendance_pct - weight_v * violations_hits

tier =
  GOLD   if composite ≥ tenantThreshold.gold   AND violations_hits == 0
  SILVER if composite ≥ tenantThreshold.silver
  BRONZE otherwise
```

**Default weights and thresholds (tenant-configurable in Settings, DA13):**
- `weight_o = 0.4`, `weight_a = 0.6`, `weight_v = 0.05`
- `targetMonthlyOrders` = tenant setting per vehicleType (e.g., Bike=600, Car=800)
- `gold = 0.95`, `silver = 0.80`

**Route:** `GET /api/americana/performance?month=YYYY-MM` — returns leaderboard with tier assignments.

**Tier drives:** Driver 360 badge (Gold/Silver/Bronze), Overview driver breakdown, and later (v2) the replacement-sourcing recommendations.

---

### A8 — Monthly XLSX export for accounting

**Trigger:** Button on Orders page: *"Export for accounting"*.

**Endpoint:** `GET /api/americana/export?month=YYYY-MM` → streams an XLSX with three sheets:

1. **Summary** — one row per `(store, chain)`: orders, rate (per vehicle type), revenue, delta vs. last month.
2. **Driver detail** — one row per `(driver, store, month)`: days worked, orders, attendance %, violations count, revenue share.
3. **Invoice lines** — one row per `(chain, vehicleType)`: total orders, rate, total revenue. This is what accounting enters into QuickBooks/Odoo.

**Not building:** auto-email, auto-send to accounting, reconciliation UI, variance-flagging. All v2 (DA6).

---

### A9 — Sidebar cleanup

**Current 10 tabs → 5 tabs:**

| Current | v1 decision |
|---|---|
| Overview | Keep ✅ |
| Drivers | Keep ✅ |
| Orders | Keep ✅ (add daily grid + monthly rollup toggles) |
| Performance | **Remove** — leaderboard lives inside Overview + Driver 360 |
| Attendance | **Remove** — read-only inline section on Driver 360 Profile |
| Shifts | **Remove** — assignments are monthly, managed via Overview / Settings |
| Phones | **Merge** → Driver 360 Assets |
| Vehicles | **Merge** → Driver 360 Assets |
| Violations | Keep ✅ |
| Settings | Keep ✅ (add Chain Rates + Contracts + Ingest subpages) |

**Settings subpages (new):**
- `settings/chains` — CRUD on chains
- `settings/stores` — CRUD on stores, with manager contact book fields
- `settings/contracts` — upload + list contracts
- `settings/chain-rates` — rate table editor
- `settings/ingest` — IMAP inbox config + manual upload + ingestion history
- `settings/targets` — per-vehicleType monthly/daily order targets + tier weights

**Nav component update:** `frontend/src/components/layout/Sidebar.tsx` — Americana section gets 5 items only.

---

## 5. Prisma delta summary (all new/changed models)

**New:**
- `AmericanaDailyIngestion`
- `AmericanaChain`
- `AmericanaStore`
- `AmericanaContract`
- `AmericanaChainRate`
- `AmericanaStoreAssignment`

**Modified:**
- `AmericanaDailyOrders` — add `storeId String?` (FK to `AmericanaStore`), add `chainId String?` (FK to `AmericanaChain`), keep `storeName`/`chain` as legacy strings for 3 months then drop.
- `Violation` — add `overrideReason`, `overriddenBy`, `overriddenAt`.
- `ViolationType` enum — add `AMERICANA_LATE_ARRIVAL`, `AMERICANA_NO_SHOW`, `AMERICANA_EARLY_DEPARTURE_QUIT`.
- `Driver` — add `vehicleType Enum (CAR | BIKE)` if not present.
- `Tenant` settings JSON — add `americana.demandTargetPerDriverPerDay.car`, `.bike`; `americana.monthlyOrderTarget.car`, `.bike`; `americana.tierWeights`; `americana.tierThresholds`; `americana.lateArrivalGraceMin`; `americana.bikeAreaWhitelist`.

---

## 6. Decisions log

| ID | Decision |
|---|---|
| DA1 | Americana is a B2B contract fleet, not a gig platform — the module is positioned as the finance backbone of Darb, not a Keeta-clone. |
| DA2 | Revenue model is **per-order rate per chain**, rates differ by vehicle type (Car vs Bike). A `AmericanaChainRate` table holds versioned rates with effective dates. |
| DA3 | **v1 ships without a margin column.** Driver-cost data depends on HR/payroll integration which lands in v2. v1 Overview shows revenue + orders + headcount gap only. |
| DA4 | Driver-to-store assignment is **fixed monthly, changes rare**. Model as `AmericanaStoreAssignment` with `reasonForChange` audit trail. |
| DA5 | ~~Chain rates are sourced from **contract PDFs uploaded to Settings**; Claude vision OCR extracts the rate table; human confirms before save.~~ **Overridden by DS3: OCR deferred to v2.** In v1 the flow is: upload PDF for archive → enter rates manually via Settings → Chain Rates. Rates still link to `contractId` for audit. |
| DA6 | **Reconciliation lives in the accounting system, not Darb.** v1 delivers a monthly XLSX export only. No variance UI, no auto-email, no direct integration. Those are v2. |
| DA7 | Daily HQ XLSX is a **full-day snapshot**, not incremental. Parser fully replaces that day's entry in `dailyOrders[day]`. Re-ingestion is idempotent. |
| DA8 | Americana internal violations use **supervisor override only** (no Appeal workflow, no mobile-app appeal flow). Much lighter than Keeta. |
| DA9 | **LATE_ARRIVAL grace threshold is a tenant setting**, default 15 min. Same threshold applies to Car and Bike (Bike/Car don't differ on late-arrival per round 6). |
| DA10 | Bike vs Car differ **only on delivery radius** for assignment validation — not on order targets, not on violation thresholds, not on tier thresholds. |
| DA11 | Headcount-gap math: `neededDrivers = round((trailing30Orders / 30) / targetPerDriverPerDay[vehicleType])`. Tenant-configurable targets per vehicle type. |
| DA12 | **Driver 360 Americana = Profile + Assets + Monthly Orders Grid**. Attendance + violations are inline sections on Profile, not separate tabs. Lean. |
| DA13 | Performance tier is a **composite** of orders, attendance, and violations. Gold requires 0 ESTABLISHED violations regardless of composite score. |
| DA14 | Sidebar reduces from 10 → 5 tabs: **Overview · Drivers · Orders · Violations · Settings**. All others are merged, removed, or moved into Settings subpages. |

---

## 7. Out of scope (v2+)

- Fully-loaded driver cost model + margin-per-store column.
- Monthly drag-drop store-assignment board.
- Replacement-sourcing tool (driver quit → recommend backup).
- AI exceptions digest email (Monday-morning one-paragraph summary).
- Direct accounting system connector (QuickBooks / Xero / Odoo / SAP).
- Per-contract rollup and contract-renewal risk scoring.
- Per-store P&L detail page (needs cost data).
- Regional / governorate / cost-center hierarchy rollups (v1 is chain-only per round 2).
- Peer-store benchmarking for demand math.
- Day-of-week seasonality model for demand projection.
- Low-volume-vs-peers violation type.
- Driver app check-in flow for Americana (HQ feed replaces it).

---

## 8. Open items — resolve before code

- [ ] **Sample XLSX** — need one real daily email attachment to lock the parser schema. Does HQ's daily XLSX contain driver-level attendance status or only order counts? If only orders, we can't auto-detect `LATE_ARRIVAL`/`NO_SHOW` and they become supervisor-flagged like `EARLY_DEPARTURE_QUIT`.
- [ ] **Chain list** — enumerate the active Americana brands we're serving today (KFC, Pizza Hut, Hardees, Krispy Kreme, TGI Fridays, Peet's, Wimpy, Costa, Cinnabon, etc.) for seeding.
- [ ] **Bike area whitelist** — which Kuwait areas are valid for Bike assignments? (Salmiya, Hawally, Jabriya?)
- [ ] **IMAP mailbox** — is there an existing `americana-feed@` address or do we provision one per tenant?
- [ ] **Target values** — default `targetPerDriverPerDay` for Car vs Bike, default `targetMonthlyOrders` for the tier engine. Need ops input.
- [ ] **Contract sample PDF** — archival-only in v1 (OCR is v2 per DS3). Still useful to have one on file for the rate-entry UI.
- [ ] **Settings JSON schema** — formalize the tenant settings keys introduced here (should extend existing `Tenant.settings` Json).

---

## 9. File manifest (new/modified)

**New files:**
```
backend/src/services/americanaInboxWatcher.ts
backend/src/services/americanaDailyParser.ts
backend/src/services/americanaViolationEngine.ts
backend/src/queues/americanaIngestWorker.ts
# backend/src/queues/americanaContractOcrWorker.ts   (v2, deferred per DS3)
backend/src/routes/americanaIngest.ts
backend/src/routes/americanaAssignments.ts
backend/src/routes/americanaChains.ts
backend/src/routes/americanaStores.ts
backend/src/routes/americanaContracts.ts
backend/src/routes/americanaRates.ts
backend/src/routes/americanaExport.ts
frontend/src/app/(dashboard)/americana/settings/chains/page.tsx
frontend/src/app/(dashboard)/americana/settings/stores/page.tsx
frontend/src/app/(dashboard)/americana/settings/contracts/page.tsx
frontend/src/app/(dashboard)/americana/settings/contracts/[id]/page.tsx
frontend/src/app/(dashboard)/americana/settings/chain-rates/page.tsx
frontend/src/app/(dashboard)/americana/settings/ingest/page.tsx
frontend/src/app/(dashboard)/americana/settings/targets/page.tsx
frontend/src/components/americana/RevenueByStoreTable.tsx
frontend/src/components/americana/ChainMixPanel.tsx
frontend/src/components/americana/HeadcountGapTable.tsx
frontend/src/components/americana/MonthlyOrdersGrid.tsx
```

**Modified files:**
```
backend/src/routes/americana.ts                  # refactor, keep orders, move others out
backend/src/adapters/americanaAdapter.ts         # chain/store-aware aggregates
backend/prisma/schema.prisma                     # 6 new models, 1 modified, enum additions
frontend/src/app/(dashboard)/americana/overview/page.tsx      # full redesign
frontend/src/app/(dashboard)/americana/orders/page.tsx        # daily grid + monthly toggle + export
frontend/src/app/(dashboard)/americana/drivers/page.tsx       # wire to Driver 360
frontend/src/app/(dashboard)/americana/violations/page.tsx    # populate with engine output
frontend/src/components/layout/Sidebar.tsx        # 10 → 5 tabs for Americana
frontend/src/components/driver360/DriverProfile.tsx           # Americana-specific tab
```

**Removed (v1):**
```
frontend/src/app/(dashboard)/americana/performance/
frontend/src/app/(dashboard)/americana/attendance/
frontend/src/app/(dashboard)/americana/shifts/
frontend/src/app/(dashboard)/americana/phones/
frontend/src/app/(dashboard)/americana/vehicles/
```
