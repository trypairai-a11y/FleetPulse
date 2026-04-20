# PRD-RESTRUCTURE.md — Darb Platform Restructure (v0.1)

> **Purpose for Claude Code:** This spec captures the platform restructure decided with the Admin/Owner (Osama) on 20 April 2026. It extends `CLAUDE.md` and layers on top of `KEETA-PARITY-SPEC.md`. Covers **Talabat and Keeta only**; Deliveroo, Americana, and Global tabs are out of scope for this file (v0.2).
>
> **How to use:** Implement features in the order in §0. Each feature is self-contained with Prisma deltas, route signatures, file paths, UI requirements, and acceptance criteria. Where a route file already exists (e.g. `backend/src/routes/keetaMonitor.ts`, `backend/src/routes/violations.ts`), extend it — do not create duplicates.
>
> **Global conventions (reminder):** TypeScript strict • Prisma only (no raw SQL unless aggregation requires it) • `authMiddleware + tenantScope` on every route • `getPagination() + paginatedResponse()` utils • Shadcn + Tailwind + Lucide • Arabic/English bilingual • Platform-specific code under `platform/<name>/` directories.

---

## 0. Implementation Order

| # | Feature | Priority | Depends on |
|---|---|---|---|
| R1 | Talabat mobile AI-OCR ingestion (driver shift screenshot → metrics) | P0 | `aiOcrService`, mobile app build |
| R2 | Talabat Overview as landing + Attention List | P0 | R1 for clean data |
| R3 | Driver 360 — shared profile component (Talabat + Keeta) | P0 | existing drivers routes |
| R4 | Keeta Monitor — strip the map, keep alert pills + flight-mode | P1 | `keetaMonitor.ts` already scaffolded |
| R5 | Shared Violation engine + GPS-stale escalation chain | P1 | `violations.ts` already scaffolded |
| R6 | Keeta portal scraper (scheduled ingest) | P1 | BullMQ workers |
| R7 | Talabat Attendance & Shifts — "On shift now" view | P2 | R1 |
| R8 | Talabat Cash — COD per driver ledger | P2 | existing `cash.ts` |
| R9 | Performance tiers from UTR + on-time % | P2 | R1 data |
| R10 | Phones & Vehicles → Driver 360 "Assets" tab (deprecate top-level pages) | P3 | R3 |
| R11 | IA cleanup — drop/hide routes that don't belong in the new model | P3 | R2, R3, R10 |

**Out of scope for v0.1 (explicit non-goals):**

- Keeta **Order Flow Timeline** — do not build.
- Keeta standalone **Penalty Management** page — do not build; penalties live inside Violation detail.
- Any **map** on Keeta Monitor — removed.
- **Appeals workflow** inside Darb — appeals stay on Keeta's platform; Darb is read-only.
- Deliveroo / Americana / Global-tab restructure — v0.2.

---

## Primary Users

| User | Needs |
|---|---|
| Osama — Admin / Owner | Cross-platform KPIs, profitability, attention list. Checks in several times/day. |
| Ops Manager / Supervisor | Live courier status, attendance deviations, violations queue, fast per-driver actions. Lives in the tool all day. |

Top pain: **too many tabs** + **Talabat data comes from driver screenshots re-keyed into Excel**.

---

## R1. Talabat AI-OCR Ingestion (P0)

**Goal:** Eliminate the screenshot→Excel bottleneck. Drivers upload their Talabat in-app stats screen at end of shift; Claude OCR extracts metrics directly into the DB.

### Mobile — `mobile/src/screens/EndOfShiftUpload.tsx` (new)

- "End of shift" tile on the driver home screen; opens camera.
- Preview → confirm → upload to `POST /api/talabat/metrics/ingest-screenshot` (multipart, `image` field + `shiftDate` optional).
- Shows parse result (UTR, orders, hours, earnings) with an edit-before-submit step.
- If OCR confidence < threshold → flag for Ops review (status `PENDING_REVIEW`).

### Backend — extend `backend/src/routes/talabat.ts`

```
POST /api/talabat/metrics/ingest-screenshot   (auth: DRIVER role)
  body: multipart { image, shiftDate? }
  → { status: 'PARSED' | 'PENDING_REVIEW', extracted: { utr, ordersCompleted, onlineHours, earnings }, metricId }
```

Implementation:

- Re-use existing `src/services/aiOcrService.ts`.
- Prompt Claude with a Talabat stat-screen template (store as a fixture under `backend/src/services/ocrPrompts/talabat.md`).
- Write to `TalabatDailyMetrics` (add model if missing — mirror `KeetaDailyMetrics`).
- On `PENDING_REVIEW`, emit a notification with `category: "OPS_TODO"`.

### Ops — `frontend/src/app/(dashboard)/talabat/ingest-review/page.tsx` (new)

- Queue of `PENDING_REVIEW` metrics with the original screenshot + extracted values side-by-side.
- Approve / Edit / Reject actions.

### Acceptance

- [ ] Driver completes OCR upload in <30 s from tap-to-confirm.
- [ ] ≥90% of screenshots ingest without Ops review.
- [ ] Ops can bulk-approve the PENDING_REVIEW queue.
- [ ] No Excel file is required anywhere in the flow.

---

## R2. Talabat Overview — Landing + Attention List (P0)

**Goal:** Overview (not "Today") is the landing page for `/talabat`. Drivers-first table is gone.

### Routing

- Move default `/talabat` route to render `overview/page.tsx`.
- Drivers table lives at `/talabat/drivers` and is no longer the landing.

### Frontend — `frontend/src/app/(dashboard)/talabat/overview/page.tsx`

Three stacked sections:

1. **Live Ops strip** (top)
   - Per-zone cards: scheduled / online / late / no-show counts.
   - Rejections in last 60 min.
   - GPS-stale count (pill, clickable → filters drivers).
2. **Attention list** (ranked, actionable)
   - Auto-generated bullets like "Waqar missed 08:00 shift — call", "3 disputed orders unresolved", "Hawally understaffed for lunch peak".
   - Each item has a one-tap action (call / message / open detail).
3. **Daily KPI strip**
   - Orders completed, on-time %, UTR — today vs. yesterday (DoD).

### Backend — extend `backend/src/routes/platformOverview.ts`

```
GET /api/platform/talabat/overview
  → {
      zones: [{ name, scheduled, online, late, noShow, gpsStale }],
      attention: [{ id, severity, title, action: { type, payload } }],
      kpis: { ordersCompleted, onTimeRate, utr, dodPct: {...} }
    }
```

### Acceptance

- [ ] `/talabat` renders Overview; prior Drivers landing redirects to `/talabat/drivers`.
- [ ] Attention list updates every 60 s without full-page reload (SSE or SWR).
- [ ] Zone cards clickable → filtered drivers list.

---

## R3. Driver 360 — Shared Profile (P0)

**Goal:** One reusable component used by Talabat and Keeta driver detail pages. Eliminates scattered driver context.

### Component — `frontend/src/components/shared/Driver360.tsx` (new)

Props: `{ driverId, platform }`.

Internal tabs:

| Tab | Contents |
|---|---|
| Overview | Live KPIs (UTR, orders today/week, acceptance, current shift, zone, phone, vehicle). |
| Attendance & Shifts | Schedule, punctuality score, leave history. |
| Orders & Performance | Historical orders, on-time rate, trend charts (recharts). |
| Cash, Violations & Documents | COD ledger, fines, appeals (read-only for Keeta), civil ID / licence / contract files. |
| Assets | Phones (IMEI, assigned date) + vehicles (plate, type, maintenance log). See R10. |

### Wiring

- `frontend/src/app/(dashboard)/talabat/drivers/[id]/page.tsx` renders `<Driver360 platform="talabat" />`.
- `frontend/src/app/(dashboard)/keeta/drivers/[id]/page.tsx` renders `<Driver360 platform="keeta" />`.

### Backend

Re-use existing `drivers.ts`, `attendance.ts`, `orders.ts`, `cash.ts`, `violations.ts`, `devices.ts`, `vehicles.ts`. Add one aggregator:

```
GET /api/drivers/:id/profile?platform=talabat|keeta
  → { overview, attendance, orders, performance, cash, violations, assets, documents }
```

### Acceptance

- [ ] Same component mounts in both platforms with no duplication.
- [ ] Tabs deep-link via URL query (`?tab=performance`).
- [ ] Loads <800 ms on a warm cache.

---

## R4. Keeta Monitor — Alert Pills + Flight-Mode (P1)

**Goal:** Simplify the Keeta Monitor to what Ops actually uses. Drop the map.

### Backend — extend `backend/src/routes/keetaMonitor.ts`

Keep existing endpoints. Add / confirm:

```
GET /api/keeta/monitor/alerts
  → {
      scheduledNotOnline: { count, courierIds[] },
      gpsStale:           { count, courierIds[] },
      rejectionsX3:       { count, courierIds[] },
      flightMode:         { count, courierIds[] }   // online >10 min but GPS hasn't moved
    }
```

`flightMode` criterion: `CourierOnlineSession.isOnline = true` AND last `LocationLog` delta (Haversine) < 50 m in the last 10 min.

### Frontend — edit `frontend/src/app/(dashboard)/keeta/monitor/page.tsx`

- **Remove** the React Leaflet map block. Leave the component import out.
- Top of page: **four alert pills** (scheduled-not-online, GPS-stale, rejections ×3, flight-mode). Each clickable → filters the courier list below.
- Courier cards below (name, phone, vehicle, online hours, completed count, shift with zone labels). Click opens `<Driver360 platform="keeta" />` in a side-panel.
- Two view tabs kept: **By Courier** / **By Order**.

### Acceptance

- [ ] Map component and its deps removed from the page.
- [ ] Alert pills show accurate live counts (verified against seed fixture).
- [ ] Flight-mode pill fires on the seeded "GPS-frozen" test courier.

---

## R5. Violation Engine + GPS-Stale Escalation (P1)

**Goal:** Shared auto-detection engine used by both Talabat and Keeta, with a defined GPS-stale escalation chain.

### Engine — extend `backend/src/services/violationEngine.ts`

Detectors:

| Type | Rule |
|---|---|
| `LATE_PICKUP` | Courier arrival at merchant > X min after accepting. |
| `ORDER_REJECTION_TIMEOUT` | Acceptance timer expired. |
| `DROP_OFF_IN_ADVANCE` | GPS at delivery time > 500 m from customer (Haversine). |
| `ORDER_SLIGHTLY_LATE` | Delivered > ETA + 5 min. |
| `INVALID_DELIVERY_PHOTO` | AI-vision flag from `aiOcrService`. |
| `GPS_NOT_UPLOADING` | See below. |

### GPS-stale escalation (new worker: `backend/src/queues/gpsMonitorWorker.ts`)

Runs every 5 min. For each `CourierOnlineSession` where `isOnline = true`:

1. If `lastGpsAt` > 10 min ago → raise alert pill, create notification `category: "IMPORTANT"`, severity `HIGH`, bilingual.
2. Call mobile app push endpoint to wake the app: `POST /api/mobile/push/wake { driverId }`.
3. If still stale > 30 min → auto-create `Violation { type: GPS_NOT_UPLOADING }`.
4. After N min (configurable per tenant, default 45) → escalate: notify assigned Supervisor with one-tap "Call driver".

### Appeals — read-only for Keeta

- No appeal UI in Darb for Keeta. Violation detail shows `appealStatus` read from Keeta portal sync (populated by R6).
- Talabat appeals: stored in DB but no driver-side UI in v0.1 (parking).

### Routes — extend `backend/src/routes/violations.ts`

Existing routes kept. Confirm list/detail shape matches the Driver 360 tab needs.

### Acceptance

- [ ] Worker schedule visible in BullMQ dashboard.
- [ ] All six detectors produce a `Violation` row for the seeded trigger fixtures.
- [ ] GPS-stale chain produces: alert → push → violation at >30 min → Supervisor notify at >45 min, verifiable with a time-travel test.

---

## R6. Keeta Portal Scraper (P1)

**Goal:** Stop manual Keeta exports. Scheduled RPA logs into the Keeta merchant portal and pulls daily data.

### Worker — `backend/src/queues/keetaPortalScraperWorker.ts` (new)

- Uses Playwright (already in devDependencies if present; otherwise add).
- Cron: every 30 min; full snapshot at 00:15 local.
- Credentials from `platformSettings` table, encrypted at rest.
- Scrapes: daily courier metrics, violations (type + status + appealStatus), shifts, rejections.
- On failure: log to `IngestRun` table (new), notify Ops, fall back to manual upload which stays available at `/keeta/ingest` (existing).

### Data model — add

```prisma
model IngestRun {
  id         String   @id @default(cuid())
  tenantId   String
  platform   Platform
  source     String   // "PORTAL_SCRAPER" | "MANUAL_UPLOAD" | "OCR_MOBILE"
  status     String   // "SUCCESS" | "PARTIAL" | "FAILED"
  startedAt  DateTime
  finishedAt DateTime?
  rowsIn     Int?
  rowsOk     Int?
  errorLog   String?
  tenant     Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, platform, startedAt])
}
```

### Settings — extend `backend/src/routes/platformSettings.ts`

```
PUT /api/platform-settings/keeta/portal-credentials
  body: { username, password }  // encrypted with KMS key before storing
```

### Acceptance

- [ ] Scraper runs on schedule; `IngestRun` row created per run.
- [ ] Credentials never logged in plain text.
- [ ] UI change detection: if login selector fails, alert Ops with a test-run button.

---

## R7. Talabat Attendance & Shifts — "On shift now" (P2)

**Goal:** Replace the generic attendance list with a zone-grouped live view.

### Frontend — edit `frontend/src/app/(dashboard)/talabat/attendance/page.tsx`

- Header: summary (expected, online, late, no-show).
- Body: cards per zone (Jahra, Mahboula, Salmiya, etc.) with the courier roster for the current shift window.
- Row-level one-tap actions: call, message, assign backup.
- Secondary action (top-right): "Plan shifts" → opens the existing `/talabat/shifts` planner.

### Backend — extend `backend/src/routes/attendance.ts`

```
GET /api/attendance/live?platform=talabat&zone=<optional>
  → { window: { startAt, endAt },
      zones: [{ name, expected, online, late, noShow, drivers: [...] }] }
```

### Acceptance

- [ ] Page updates every 60 s.
- [ ] "Late" threshold is 15 min and configurable via `platformSettings`.
- [ ] Assign-backup flow picks from on-call drivers in the same zone.

---

## R8. Talabat Cash — COD per Driver (P2)

**Goal:** Focus v1 of Cash on COD reconciliation only.

### Frontend — edit `frontend/src/app/(dashboard)/talabat/cash/page.tsx`

- Table: driver × day. Columns: expected COD, collected, variance, status.
- Filters: date range, driver, zone, status (outstanding / settled / disputed).
- Row click → Driver 360 → Cash tab.

### Backend — extend `backend/src/routes/cash.ts`

```
GET /api/cash/cod?platform=talabat&from=&to=&driverId=
  → paginated rows with expected, collected, variance, status
POST /api/cash/cod/:id/settle   { amount, note }
```

### Acceptance

- [ ] Variance row shows red when `|collected - expected| > KWD 1`.
- [ ] Settling writes an audit log entry.
- [ ] Export CSV of the current filter.

---

## R9. Performance Tiers (P2)

**Goal:** Derive a tier from UTR + on-time %. No bespoke scorecards for v1.

### Backend — extend `backend/src/services/performanceService.ts` (new if absent)

Weekly job computes per-driver:

- `utr = ordersCompletedWeek / onlineHoursWeek`
- `onTimeRate = onTimeOrders / deliveredOrders`
- Tier thresholds (tenant-configurable; defaults below):
  - **Gold**: utr ≥ 2.8 AND onTimeRate ≥ 0.95
  - **Silver**: utr ≥ 2.2 AND onTimeRate ≥ 0.90
  - **Bronze**: utr ≥ 1.6 AND onTimeRate ≥ 0.85
  - **Watchlist**: anything else (or ≥3 violations in the week)

### Data model — add field

```prisma
// Add to Driver:
performanceTier  String?   // "GOLD" | "SILVER" | "BRONZE" | "WATCHLIST"
tierComputedAt   DateTime?
```

### Frontend

- Badge in Driver 360 Overview tab.
- Filter chip on `/talabat/drivers` list.
- **No auto-suspension / auto-bonus flows in v1** — tier is information only.

### Acceptance

- [ ] Tier recomputes every Monday 06:00 local.
- [ ] Thresholds editable via `platformSettings`.

---

## R10. Phones & Vehicles → Driver 360 Assets (P3)

**Goal:** Reduce top-level nav. Phones + vehicles are driver context, not global inventory.

### Action

- Add an **Assets** tab to `Driver360.tsx` with two sub-sections (Phones, Vehicles).
- Data comes from existing `devices.ts` and `vehicles.ts` routes filtered by `driverId`.
- Mark `/talabat/phones`, `/talabat/vehicles`, `/keeta/phones`, `/keeta/vehicles` pages as **deprecated**: keep routes but hide from sidebar; redirect after v0.2.

### Acceptance

- [ ] Sidebar no longer shows Phones / Vehicles under either platform.
- [ ] Driver 360 → Assets shows assigned phone + vehicle + history.

---

## R11. IA Cleanup (P3)

**Goal:** Remove or hide nav entries that don't fit the new model.

### Sidebar changes (edit `frontend/src/components/layout/Sidebar.tsx`)

Under **Talabat**:

- Overview (new landing)
- Drivers
- Attendance & Shifts (merged)
- Orders
- Cash
- Violations
- Performance
- ~~Phones~~ (remove)
- ~~Vehicles~~ (remove)
- ~~Available-shifts~~ (fold into Shifts)
- ~~Sessions~~ (move under Driver 360 → Attendance)
- Settings

Under **Keeta** (keep platform-specific extras):

- Overview
- Monitor (simplified, no map)
- Drivers
- Attendance & Shifts
- Orders
- Cash / Financial
- Violations
- Performance
- Operation Centre (kept — maps live here, not on Monitor)
- Reports
- Settings
- ~~Phones~~ (remove)
- ~~Vehicles~~ (remove)
- ~~Penalties~~ (remove; penalties surface inside Violation detail)
- ~~Copilot~~ (re-evaluate in v0.2)
- ~~Courier-details~~ (replaced by Driver 360)
- ~~Shift-monitor~~ / ~~Available-shifts~~ (fold into Attendance & Shifts)

### Route handling

- Removed pages return HTTP 302 to their replacement during a 2-week deprecation window, then 404.
- Add a migration note at the top of each deprecated `page.tsx`.

### Acceptance

- [ ] Sidebar matches the lists above.
- [ ] No dead links in the app (verified via a link-crawl test).

---

## Data Model — Consolidated Deltas

Additive only. No existing models are refactored.

```prisma
// R1 — Talabat metrics (mirror KeetaDailyMetrics if not present)
model TalabatDailyMetrics {
  id              String   @id @default(cuid())
  tenantId        String
  driverId        String
  shiftDate       DateTime
  utr             Float?
  ordersCompleted Int?
  onlineHours     Float?
  earnings        Float?
  source          String   // "OCR_MOBILE" | "MANUAL_UPLOAD" | "PORTAL_API"
  status          String   @default("PARSED") // "PARSED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED"
  rawImageUrl     String?
  ocrConfidence   Float?
  createdAt       DateTime @default(now())
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  driver          Driver   @relation(fields: [driverId], references: [id])
  @@unique([tenantId, driverId, shiftDate])
  @@index([tenantId, shiftDate])
  @@index([tenantId, status])
}

// R6 — Ingest run audit
model IngestRun {
  id         String   @id @default(cuid())
  tenantId   String
  platform   Platform
  source     String
  status     String
  startedAt  DateTime
  finishedAt DateTime?
  rowsIn     Int?
  rowsOk     Int?
  errorLog   String?
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId, platform, startedAt])
}

// R9 — Performance tier on Driver
model Driver {
  // ... existing fields
  performanceTier  String?
  tierComputedAt   DateTime?
}
```

Existing `Violation`, `Penalty`, `Appeal`, `CourierOnlineSession` from `CLAUDE.md` are used as-is. `OrderEvent` is **not** built.

---

## Acceptance (Release Gate)

Release v0.1 of the restructure is shippable when:

1. R1–R6 all ticked off and seeded fixtures pass.
2. `/talabat` lands on Overview; old Drivers landing redirects.
3. `/keeta/monitor` has no map and shows the four alert pills live.
4. Driver 360 mounts in both Talabat and Keeta driver detail pages from the same component.
5. No Excel file sits in the daily Ops workflow.
6. Sidebar matches R11; no dead links.

---

## Decisions Log (from the 20 Apr 2026 interview)

| # | Decision |
|---|---|
| D1 | Start with Platform tabs (not Global). |
| D2 | Primary users: Osama (Admin) + Ops Manager. |
| D3 | Top pain: too many tabs / hard to find things. |
| D4 | Depth: quick audit + recommendations. |
| D5 | Fix Talabat ingestion via AI OCR on the driver mobile app. |
| D6 | Attendance daily focus: "on shift now" + late / no-show alerts. |
| D7 | Orders daily focus: end-of-day reconciliation. |
| D8 | Keep tabs; add a top-level **Overview** per platform (renamed from "Today"). |
| D9 | Cash v1 = COD per driver only. |
| D10 | Violations = full auto-detection engine. |
| D11 | Performance core metrics: UTR + on-time %. |
| D12 | Phones + Vehicles merge into Driver 360 → Assets. |
| D13 | Overview is the platform landing page. |
| D14 | Keeta must-haves: Monitor + Violation engine. Drop Map, Order Flow, Penalties page. |
| D15 | Keeta ingestion: scheduled scraper/RPA against partner portal. |
| D16 | Keeta appeals stay on Keeta's platform — Darb shows read-only status. |
| D17 | GPS-stale chain: alert + Ops notify → driver app ping → auto-violation >30 min → escalate to Supervisor. |
| D18 | Keeta mostly mirrors Talabat structure, with Keeta-specific extras where warranted. |

---

## Open Items (v0.2)

- Deliveroo tab-by-tab audit.
- Americana tab-by-tab audit.
- Global tabs: Overview, Companies, KPIs, Analytics, Insights, Live Map, Tickets, Recruitment, Supervisors.
- Settings tab redesign.
- Role-based landing pages (Admin vs. Ops vs. Accountant).
- Bilingual (Arabic / RTL) coverage for notifications and the driver mobile app.
- Reporting and exports (weekly PDF / Excel to companies and platforms).
- Long-term: negotiate Keeta partner API access to replace R6 scraper.
