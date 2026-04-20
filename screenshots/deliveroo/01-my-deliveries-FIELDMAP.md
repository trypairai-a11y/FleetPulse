# Deliveroo Rider App — "My deliveries" Screen (Field Map)

> **Source:** User-provided screenshot on 20 April 2026 showing a rider's own daily screen. This is the screen drivers screenshot and send for manual Excel re-keying.
>
> **Purpose:** Drives the OCR prompt for R1 (ingestion) and the data model for the Deliveroo daily-metrics table.
>
> **Image file:** `01-my-deliveries.jpg` (to be saved — see note at bottom).

## Visible elements, top to bottom

| Region | Field | Example value | Data type | Target column |
|---|---|---|---|---|
| Status bar | Time | `01:05` | — | ignore |
| Header | Screen title | `My deliveries` | string | ignore (identifier only) |
| Header | Period selector | `DAY ▼` | enum `DAY/WEEK/MONTH` | `periodType` |
| Date row | Selected date | `Friday 17 April` | date | `shiftDate` |
| KPI strip (left) | Cash amount | `KD 10.500` | decimal (KWD) | `codCollectedKwd` |
| KPI strip (left) | Label | `CASH` | — | — |
| KPI strip (right) | Tips amount | `KD 0.400` | decimal (KWD) | `tipsKwd` |
| KPI strip (right) | Label | `TIPS` | — | — |
| Chart | Hourly bar chart | x-axis `8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24`; bars with counts `1, 1, 0, 2, 0, 2, 1, 3, 1` | hourly buckets of 2h | `hourlyDeliveries[]` (array of 9 ints) |
| Summary (left) | Deliveries count | `11` | int | `deliveriesCount` |
| Summary (left) | Label | `DELIVERIES` | — | — |
| Summary (right) | Unassigned count | `0` | int | `unassignedCount` |
| Summary (right) | Label | `UNASSIGNED` | — | — |
| Section header | Period marker | `TODAY` | enum `TODAY/…` | `sectionLabel` |
| Section header | Cash total | `KD 10.500 cash` | decimal (KWD) | duplicate of `codCollectedKwd` — validation check |
| Per-order row | Merchant name | `Chacka Chacka - Hawally` | string | `orders[].merchantName` |
| Per-order row | Order ID | `Order #5581` | string/int | `orders[].orderId` |
| Per-order row | Assigned time | `Assigned at 23:04` | time `HH:MM` | `orders[].assignedAt` |
| Per-order row | Delivered time + duration | `Delivered 23:27 (17 min)` | time + int min | `orders[].deliveredAt`, `orders[].durationMin` |
| Per-order row (next) | Merchant name | `On Cost - HAW` | string | `orders[].merchantName` |
| Per-order row (next) | Order ID | `Order #4317` | string/int | `orders[].orderId` |
| Per-order row (next) | Assigned time | `Assigned at 22:35` | time `HH:MM` | `orders[].assignedAt` |

## Derived / computed fields

| Field | How to compute | Notes |
|---|---|---|
| `totalDeliveries` | Sum of hourly bars | Must equal the big `DELIVERIES` number — validation |
| `avgDeliveryMinutes` | Average of `orders[].durationMin` | Powers on-time %; only computed from rows with a delivered timestamp |
| `onTimeRate` | `deliveriesUnder30min / totalDeliveries` | Threshold configurable in platformSettings |
| `earningsKwd` | `codCollectedKwd + tipsKwd` + platform fee lookup | Platform fee is not on this screen — fetch from payout screen |
| `peakHourBucket` | Bucket with max bar height | Useful for scheduling |

## Validation rules for the OCR service

1. `deliveriesCount` MUST equal sum of hourly buckets. On mismatch → mark `PENDING_REVIEW`.
2. `sectionLabel === 'TODAY'` implies `shiftDate` is today's date (tenant-local). Flag if mismatch.
3. `unassignedCount > 0` → auto-create one `Violation{ type: DELIVEROO_UNASSIGNED_ORDER }` per unit per day; link to zone and shift.
4. Currency strings: strip `KD`, trim spaces, parse `10.500` as `10.5` (KWD is 3 decimal).
5. Time strings `HH:MM` parsed in tenant local TZ (Asia/Kuwait).
6. `Order #XXXX` — capture as string (preserve leading zeros) — it's Deliveroo's internal order ID, not our tenant's.

## Prisma additions implied

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
  hourlyBuckets   Json     // int[9] indexed 8,10,12,14,16,18,20,22,24
  source          String   // "OCR_MOBILE" | "MANUAL_UPLOAD"
  status          String   @default("PARSED") // PARSED | PENDING_REVIEW | APPROVED | REJECTED
  rawImageUrl     String?
  ocrConfidence   Float?
  createdAt       DateTime @default(now())
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  driver          Driver   @relation(fields: [driverId], references: [id])
  orders          DeliverooOrder[]

  @@unique([tenantId, driverId, shiftDate])
  @@index([tenantId, shiftDate])
}

model DeliverooOrder {
  id               String   @id @default(cuid())
  metricId         String
  merchantName     String
  orderId          String   // platform id e.g. "5581"
  assignedAt       DateTime
  deliveredAt      DateTime?
  durationMin      Int?
  cashKwd          Decimal? @db.Decimal(10, 3)
  tipKwd           Decimal? @db.Decimal(10, 3)
  metric           DeliverooDailyMetrics @relation(fields: [metricId], references: [id])

  @@index([metricId, assignedAt])
}
```

## What to do when the actual JPG is attached

Save at: `screenshots/deliveroo/01-my-deliveries.jpg`

It will then be consumed by:

1. The OCR prompt fixture at `backend/src/services/ocrPrompts/deliveroo.md` (as a few-shot example).
2. The unit-test fixture at `backend/__tests__/ocr/deliveroo.my-deliveries.test.ts`.
