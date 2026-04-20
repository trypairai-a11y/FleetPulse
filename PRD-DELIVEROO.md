# PRD-DELIVEROO.md — Darb Deliveroo Module (v0.1)

> **Purpose for Claude Code:** Extends `PRD-RESTRUCTURE.md` with the Deliveroo-specific design decided with the Admin/Owner (Osama) on 20 April 2026. Talabat and Keeta are covered in `PRD-RESTRUCTURE.md`; this file is Deliveroo-only.
>
> **How to use:** Implement features in the order in §0. Where a route file or page already exists (see Current-state audit below), **extend** — do not create duplicates. Where the Deliveroo flow is functionally identical to Talabat, **re-use the shared component/service** from `PRD-RESTRUCTURE.md` and pass `platform="deliveroo"`.
>
> **Conventions (reminder):** TypeScript strict • Prisma only • `authMiddleware + tenantScope` • `getPagination / paginatedResponse` • Shadcn + Tailwind + Lucide • Bilingual (AR/EN) • Platform-specific code under `platform/deliveroo/`.

---

## Context — How Deliveroo Works

Based on the rider's own "My deliveries" screen (see `screenshots/deliveroo/01-my-deliveries-FIELDMAP.md`):

- **Contract model:** Per-order commission only (no base salary). Rider self-employment-style; they keep COD + tips, paid through Deliveroo's own weekly settlement.
- **Daily data drivers see on their phone:** Cash collected (KWD), Tips (KWD), Deliveries count, Unassigned count, an hourly bar chart of deliveries (2-hour buckets 08→24), and per-order rows (merchant, order #, assigned/delivered timestamps).
- **Data source today:** Drivers screenshot this screen and forward; Ops re-keys into Excel. Same bottleneck as Talabat — same AI-OCR fix applies.
- **Operational difference vs. Talabat/Keeta:** The headline KPI is **Unassigned orders** (orders Deliveroo offered that none of our drivers accepted). Unassigned > 0 = direct revenue loss and a platform-fault signal against us.

---

## Current-State Audit (before edits)

Exists in repo today:

- `backend/src/routes/deliveroo.ts` — adapter-based routes (`/drivers/summary`, likely others).
- Frontend pages under `frontend/src/app/(dashboard)/deliveroo/`: `attendance`, `drivers`, `orders-cash` (combined), `overview`, `phones`, `settings`, `shifts`, `vehicles`, `violations`.
- Adapter: `getAdapter("DELIVEROO")` used by the backend.

Does NOT exist yet:

- `DeliverooDailyMetrics` Prisma model (add in §D1).
- Dedicated `orders` or `cash` routes (currently collapsed into `orders-cash` page).
- Unassigned-order violation detector and root-cause taxonomy.

---

## 0. Implementation Order

| # | Feature | Priority | Depends on |
|---|---|---|---|
| D1 | Deliveroo Daily Metrics model + AI-OCR ingestion (totals only) | P0 | R1 shared OCR plumbing |
| D2 | Deliveroo Overview — unassigned-by-zone + top/bottom riders | P0 | D1 data |
| D3 | Unassigned-order violation engine + root-cause tagging | P0 | R5 shared engine, D1 data |
| D4 | Driver 360 wiring — `<Driver360 platform="deliveroo" />` | P1 | R3 shared component |
| D5 | Split `orders-cash` → dedicated `orders` and `cash` pages | P1 | D1 data |
| D6 | Merge `shifts` + `attendance` → single **Schedule** page | P2 | — |
| D7 | Performance tiers (acceptance + UTR) on Deliveroo | P2 | D1, R9 |
| D8 | Sidebar cleanup + IA consistency | P3 | D1–D7 |

---

## D1. Deliveroo Daily Metrics + AI-OCR Ingestion (P0)

**Goal:** Replace the screenshot → Excel workflow. Driver snaps the "My deliveries" screen; Claude OCR extracts totals; values write to DB.

Stakeholder decision: **totals only** in v0.1 (cash, tips, deliveries, unassigned, hourly bar buckets). Per-order row extraction deferred to v0.2 to keep OCR fast and high-confidence.

### Mobile — `mobile/src/screens/DeliverooEndOfShift.tsx` (new)

- Re-use the generic `EndOfShiftUpload` pattern from R1 with a `platform="deliveroo"` variant.
- Pre-flight instructions with a thumbnail of the expected screen.
- Preview → edit extracted values → submit.

### Backend — extend `backend/src/routes/deliveroo.ts`

```
POST /api/deliveroo/metrics/ingest-screenshot   (auth: DRIVER role)
  body: multipart { image, shiftDate? }
  → { status: 'PARSED' | 'PENDING_REVIEW',
      extracted: { codCollectedKwd, tipsKwd, deliveriesCount, unassignedCount, hourlyBuckets },
      metricId }
```

Implementation notes:

- Use `aiOcrService` with the Deliveroo prompt fixture at `backend/src/services/ocrPrompts/deliveroo.md`.
- Load the Deliveroo reference screenshot as a few-shot example from `screenshots/deliveroo/01-my-deliveries.jpg`.
- Validation rules (must all pass, else `PENDING_REVIEW`):
  - `deliveriesCount === sum(hourlyBuckets)`
  - `codCollectedKwd` parses to positive decimal with 3 decimal places (KWD)
  - `unassignedCount >= 0`
- Writes to `DeliverooDailyMetrics`; triggers D3 detector if `unassignedCount > 0`.

### Prisma — add

```prisma
model DeliverooDailyMetrics {
  id              String   @id @default(cuid())
  tenantId        String
  driverId        String
  shiftDate       DateTime
  codCollectedKwd Decimal  @db.Decimal(10, 3)
  tipsKwd         Decimal  @db.Decimal(10, 3)
  deliveriesCount Int
  unassignedCount Int      @default(0)
  hourlyBuckets   Json     // int[9] mapped to 08,10,12,14,16,18,20,22,24
  source          String   // "OCR_MOBILE" | "MANUAL_UPLOAD"
  status          String   @default("PARSED") // PARSED | PENDING_REVIEW | APPROVED | REJECTED
  rawImageUrl     String?
  ocrConfidence   Float?
  createdAt       DateTime @default(now())
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  driver          Driver   @relation(fields: [driverId], references: [id])

  @@unique([tenantId, driverId, shiftDate])
  @@index([tenantId, shiftDate])
  @@index([tenantId, status])
}
```

### Ops review queue — `frontend/src/app/(dashboard)/deliveroo/ingest-review/page.tsx` (new)

Same pattern as Talabat's ingest-review (from R1). Shared component if trivial to parameterize.

### Acceptance

- [ ] Driver completes upload ≤30 s from tap to submit.
- [ ] ≥90% of Deliveroo screens parse without Ops review.
- [ ] Sum of hourly buckets === `deliveriesCount` on every APPROVED row (enforced).
- [ ] No Excel file in the Deliveroo daily flow.

---

## D2. Deliveroo Overview (P0)

**Goal:** Landing for `/deliveroo` surfaces the two signals Osama asked for.

### Frontend — edit `frontend/src/app/(dashboard)/deliveroo/overview/page.tsx`

Three stacked sections, top-to-bottom:

1. **Unassigned by zone (today)**
   - Card grid keyed by zone (Hawally, Avenues, Salmiya, Jahra, Mahboula, Mutla, etc.).
   - Each card: today's unassigned count, delta vs. 7-day average, severity pill (green 0 / amber 1–2 / red 3+). Configurable threshold per tenant.
   - Click a card → filtered Violations list (D3).
2. **Top / Bottom riders**
   - Two mini-tables side by side (Top 5, Bottom 5) sorted by a composite of acceptance rate and UTR this week.
   - Click a row → Driver 360 (D4).
3. **Daily KPI strip**
   - Deliveries today, cash collected, tips, unassigned total. Each with DoD delta chip.

### Backend — extend `backend/src/routes/platformOverview.ts`

```
GET /api/platform/deliveroo/overview
  → {
      unassignedByZone: [{ zone, today, avg7, severity }],
      topRiders:    [{ driverId, name, acceptance, utr }],
      bottomRiders: [{ driverId, name, acceptance, utr }],
      kpis: { deliveries, cashKwd, tipsKwd, unassigned, dodPct: {...} }
    }
```

### Acceptance

- [ ] `/deliveroo` renders Overview as the landing (drivers-first landing removed).
- [ ] Unassigned cards update at least every 5 min.
- [ ] Top / Bottom lists respect the current date range selector.

---

## D3. Unassigned-Order Violation Engine + Root-Cause (P0)

**Goal:** Auto-track every unassigned order as a Violation with a root-cause tag. Feeds scheduling decisions.

### Engine — extend `backend/src/services/violationEngine.ts`

New detector:

```ts
// Runs on every DeliverooDailyMetrics write where unassignedCount > 0.
// Creates ONE Violation per unassigned order:
{
  violationType: 'DELIVEROO_UNASSIGNED_ORDER',
  driverId: null,           // company/platform-level by default; linked to a driver only if a specific rider rejected
  platform: 'DELIVEROO',
  details: 'Deliveroo offered an order that no rider in {zone} accepted during {hourBucket}.',
  metadata: { zone, hourBucket, shiftDate, sourceMetricId }
}
```

### Root-cause taxonomy (Ops-assigned, enum on Violation.metadata.rootCause)

| Code | Label | Use when |
|---|---|---|
| `NO_RIDER_IN_ZONE` | No rider on shift in zone | Roster gap → feeds scheduling next week |
| `ALL_RIDERS_BUSY` | All on-duty riders already delivering | Capacity issue → feeds hiring/shift density |
| `ALL_REJECTED` | Riders explicitly rejected the offer | Performance issue → tag riderIds |
| `SYSTEM_ERROR` | Platform/app issue | Escalate to Deliveroo account manager |
| `UNKNOWN` | Default; pending review | |

### Frontend — edit `frontend/src/app/(dashboard)/deliveroo/violations/page.tsx`

- Filters: date range, zone, root-cause, rider (when applicable).
- Row click → detail panel with metadata + an Ops inline form to set/change `rootCause`.
- Summary strip at top: this-week totals by root-cause.

### Enum — add to Prisma

```prisma
enum ViolationType {
  // ... existing types
  DELIVEROO_UNASSIGNED_ORDER
}
```

### Acceptance

- [ ] On every Deliveroo metrics write with `unassignedCount > 0`, the engine creates exactly `unassignedCount` violation rows.
- [ ] Ops can set root-cause inline; change is audit-logged.
- [ ] Overview "Unassigned by zone" counts match the raw Violation rows for the same day.

---

## D4. Driver 360 — Deliveroo wiring (P1)

**Goal:** Re-use the shared profile component; no custom Deliveroo driver page.

### Action

- `frontend/src/app/(dashboard)/deliveroo/drivers/[id]/page.tsx` renders `<Driver360 platform="deliveroo" />`.
- Pass through the existing adapter so Cash, Violations, Performance tabs resolve Deliveroo-specific data.
- **Hide Attendance tab by default for Deliveroo** drivers — per-order contract means attendance is less rigid. Tenant can override via `platformSettings.deliveroo.showAttendanceTab = true`.

### Acceptance

- [ ] Same `Driver360` component; no new driver-detail file under `deliveroo/`.
- [ ] Attendance tab hidden unless setting overrides.
- [ ] Cash tab shows per-day COD + tips ledger from `DeliverooDailyMetrics`.

---

## D5. Split `orders-cash` into `orders` and `cash` (P1)

**Goal:** Structural consistency with Talabat and Keeta. One concern per page.

### Routing

- Create `frontend/src/app/(dashboard)/deliveroo/orders/page.tsx` and `frontend/src/app/(dashboard)/deliveroo/cash/page.tsx`.
- Keep `orders-cash/page.tsx` as a redirect stub for two weeks, then delete.

### Pages

- **Orders** — list of `DeliverooOrder` rows (when per-order ingest arrives in v0.2); for v0.1, shows aggregate per-day totals from `DeliverooDailyMetrics` + an inline list of metric uploads.
- **Cash** — COD collected + tips per driver per day; filters by date range, driver, status; weekly summary export.

### Backend — extend `backend/src/routes/deliveroo.ts`

```
GET /api/deliveroo/orders?from&to&driverId&zone   → paginated
GET /api/deliveroo/cash/daily?from&to&driverId    → paginated
```

### Acceptance

- [ ] Sidebar shows "Orders" and "Cash" as separate entries under Deliveroo.
- [ ] `/deliveroo/orders-cash` 302s to `/deliveroo/orders` for 14 days.
- [ ] Cash export CSV matches the Accountant's current Excel format.

---

## D6. Merge `shifts` + `attendance` → **Schedule** (P2)

**Goal:** Smaller Deliveroo fleet; two pages are noise. One Schedule page covers planning and live roster.

### Routing

- Create `frontend/src/app/(dashboard)/deliveroo/schedule/page.tsx`.
- Retire `/deliveroo/shifts` and `/deliveroo/attendance` (redirect for 14 days, then delete).

### Page layout

- **Top:** Today's roster — who is scheduled, who is online now, by zone.
- **Middle:** Week view — drag-and-drop rider assignment to zone × shift slots.
- **Bottom:** Attendance history (last 30 days) with punctuality score per rider.

### Backend

Re-use existing `attendance.ts` and `shifts.ts` (or `keetaAvailableShifts.ts` if more generic) — no new routes needed for v0.1; add a thin aggregator if the page needs one call:

```
GET /api/deliveroo/schedule?weekStart=
  → { today: {...}, week: {...}, history30: {...} }
```

### Acceptance

- [ ] One page covers roster planning, live attendance, and history.
- [ ] Legacy `/shifts` and `/attendance` routes redirect cleanly.

---

## D7. Deliveroo Performance Tiers (P2)

**Goal:** Tier Deliveroo riders on the two metrics Osama flagged: acceptance rate and UTR.

### Extend `performanceService.ts` (from R9)

For Deliveroo riders only:

- `acceptance = ordersAccepted / ordersOffered`
- `utr = deliveriesCount / onlineHours` (onlineHours estimated from hourly-bucket first/last non-zero when per-order ingest absent)
- Tier thresholds (tenant-configurable, Deliveroo-specific):
  - **Gold**: acceptance ≥ 0.90 AND utr ≥ 2.5
  - **Silver**: acceptance ≥ 0.80 AND utr ≥ 2.0
  - **Bronze**: acceptance ≥ 0.70 AND utr ≥ 1.5
  - **Watchlist**: anything else OR unassigned-linked violations this week ≥ 3

### Acceptance

- [ ] Tier recomputes Mondays 06:00 local.
- [ ] Deliveroo has its own threshold set distinct from Talabat/Keeta.
- [ ] Tier badge visible in Driver 360 Overview and in the Deliveroo drivers list.

---

## D8. IA Cleanup (P3)

**Goal:** Align the Deliveroo sidebar with the decisions above.

### Sidebar (edit `frontend/src/components/layout/Sidebar.tsx`)

Under **Deliveroo**:

- Overview (new landing)
- Drivers
- **Schedule** (replaces Shifts + Attendance)
- Orders
- Cash
- Violations
- Phones (kept per stakeholder decision — not dropped)
- Vehicles (kept per stakeholder decision — not dropped)
- Settings

### Notes on kept items

- Phones and Vehicles pages are kept per the Deliveroo-specific answer ("Keep all tabs"), even though riders own their bikes. If this turns out to be unused after launch, reopen for removal in v0.3.
- No map on any Deliveroo page.

### Acceptance

- [ ] Sidebar matches the list above exactly.
- [ ] No dead links (link-crawl test passes).

---

## Data Model — Consolidated Deliveroo Deltas

Additive only.

```prisma
model DeliverooDailyMetrics {
  // see D1
}

// Add to existing enum:
enum ViolationType {
  // ... existing values
  DELIVEROO_UNASSIGNED_ORDER
}
```

Per-order rows (`DeliverooOrder`) are **deferred to v0.2** along with the richer Driver Performance view that depends on them.

---

## Acceptance (Release Gate for Deliveroo v0.1)

Shippable when:

1. D1–D5 complete and seeded fixtures pass.
2. `/deliveroo` lands on Overview; drivers-first landing removed.
3. Unassigned-order violations auto-created; Ops can tag root-cause inline.
4. Driver 360 renders for a Deliveroo driver (Attendance tab hidden by default).
5. `orders-cash` split into two pages; old URL redirects.
6. Sidebar matches §D8.

---

## Decisions Log (20 Apr 2026, Deliveroo round)

| # | Decision |
|---|---|
| DD1 | Deliveroo contract: per-order commission only (no base). |
| DD2 | Deliveroo is operationally similar to Talabat for Ops — shared Driver 360. |
| DD3 | Data source today = driver screenshots + manual Excel. Fix with mobile AI-OCR. |
| DD4 | OCR v0.1 extracts **totals only**: cash, tips, deliveries, unassigned, hourly buckets. Per-order rows deferred. |
| DD5 | `orders-cash` combined page is split into separate Orders and Cash pages for consistency. |
| DD6 | Overview primary signals: unassigned orders by zone + top/bottom riders. |
| DD7 | Unassigned orders auto-create Violations with root-cause tagging. |
| DD8 | Shifts + Attendance merge into one **Schedule** page for Deliveroo (smaller fleet). |
| DD9 | All other Deliveroo sub-tabs kept (including Phones, Vehicles, Violations). |
| DD10 | Performance tiers use Deliveroo-specific thresholds (acceptance + UTR). |

---

## Open Items (for v0.2)

- Per-order row ingestion (merchant, order #, assigned/delivered timestamps).
- On-time % metric derived from per-order durations.
- Deliveroo portal API / partner access — replaces OCR if negotiated.
- Weekly payout reconciliation against Deliveroo's own rider settlement report.
- Dispute auto-draft to Deliveroo account manager for SYSTEM_ERROR unassigned orders.
- Bilingual (AR) labels for Deliveroo-specific screens.

---

## Screen Reference

Primary OCR target: `screenshots/deliveroo/01-my-deliveries.jpg` (pending user re-upload).
Detailed field map: `screenshots/deliveroo/01-my-deliveries-FIELDMAP.md` (captured).
