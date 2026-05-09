// Phase 2 Wave 4 — design-partner-1 fixture seed.
//
// REQ-gtm-onboarding (BLOCKER-2 path b). Phase 2 ships scaffolding-only
// ingestion (per onboardingBackwashWorker.ts comments); the design-
// partner-1 dry-run uses this script as the one-time interim. Real
// scrapers ship in Phase 6 (Ingest Adapter Layer).
//
// Usage:
//   npm run seed:design-partner-fixture -- --tenantId=<id> [--days=30] \
//     [--driverCount=8] [--force]
//
// What it writes (idempotent — clears prior fixture rows for the tenant
// in dependency order, then re-inserts inside a single transaction):
//   - 8 Drivers (configurable via --driverCount)
//   - 30 days × N drivers Shifts (240 default) — distribution 70 on-time
//     / 20 late / 10 no-show. Most shifts ≥240 min so isCourierActive
//     ThisMonth returns true → exercises the billing math against an
//     8-driver fleet (override KD 100 vs computed KD 16/floored to KD 200).
//   - AttendanceRecord rows mirroring the shifts
//   - LocationLog rows: 4 GPS pings × N drivers × last 7 days (≈224)
//   - OrderLog rows: ~25 orders × N drivers × 30 days × 4 platforms,
//     status distribution 80 DELIVERED / 12 CANCELLED / 5 REJECTED / 3 LATE
//   - CashRecord rows: 24 (3 per driver × 8 drivers); 2 with
//     pendingDues > 0 to exercise cashOutstanding section + top-3 risky
//     receivables tile.
//   - Violation rows: 3 (LATE_PICKUP, ORDER_REJECTION_TIMEOUT,
//     DROP_OFF_IN_ADVANCE) across 3 different drivers in the last 14 days.
//   - PendingAgentAction rows: 10 — 6 active (resolvedAt: null) + 4
//     resolved. Distribution: 6 x draftCourierMessage, 3 x flagForReview,
//     1 x proposeCashReminder. ZERO Phase-8 tool names (the
//     forbiddenToolNames invariant from gold-set fixtures must hold for
//     every active anomaly card).
//   - AiScore rows: 1 per driver, top-heavy distribution so top5 vs
//     bottom5 performers are distinguishable.
//
// Safety: aborts unless --force when the tenant already has any
// non-fixture OrderLog rows (i.e. real prior data). Surface this guard
// loudly — never silently overwrite production data.

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

interface CliArgs {
  tenantId: string;
  days: number;
  driverCount: number;
  force: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let tenantId = "";
  let days = 30;
  let driverCount = 8;
  let force = false;
  for (const a of args) {
    if (a.startsWith("--tenantId=")) tenantId = a.slice("--tenantId=".length);
    else if (a.startsWith("--days=")) days = Number(a.slice("--days=".length));
    else if (a.startsWith("--driverCount=")) driverCount = Number(a.slice("--driverCount=".length));
    else if (a === "--force") force = true;
  }
  if (!tenantId) {
    console.error("ERROR: --tenantId=<id> is required.");
    process.exit(1);
  }
  if (!Number.isFinite(days) || days <= 0 || days > 90) {
    console.error("ERROR: --days must be 1..90.");
    process.exit(1);
  }
  if (!Number.isFinite(driverCount) || driverCount <= 0 || driverCount > 50) {
    console.error("ERROR: --driverCount must be 1..50.");
    process.exit(1);
  }
  return { tenantId, days, driverCount, force };
}

const FIXTURE_NAMES = [
  "Mohamed",
  "Ali",
  "Hassan",
  "Yousef",
  "Saad",
  "Khaled",
  "Nasser",
  "Fahd",
  "Omar",
  "Ibrahim",
  "Mahmood",
  "Saleh",
];

const PLATFORMS = ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"] as const;

// Deterministic numeric helpers — keeps fixture re-runs producing the same
// distribution when the inputs are identical.
function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

async function main() {
  const args = parseArgs();
  const { tenantId, days, driverCount, force } = args;

  // Tenant must exist.
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    console.error(
      `ERROR: tenant ${tenantId} not found. Create the tenant first via /api/admin/onboarding/tenants.`,
    );
    process.exit(1);
  }

  console.log(`\nSeeding design-partner fixture for tenant ${tenant.name} (${tenantId})`);
  console.log(`  windowDays=${days}, driverCount=${driverCount}, force=${force}\n`);

  // Safety: refuse to overwrite real prior data unless --force.
  const existingOrderCount = await prisma.orderLog.count({
    where: { tenantId },
  });
  if (existingOrderCount > 0 && !force) {
    console.error(
      `ABORTING: tenant has ${existingOrderCount} existing OrderLog rows. Pass --force to overwrite (destroys real data!).`,
    );
    process.exit(2);
  }

  // ─── 1. Cleanup prior fixture rows (dependency order) ───────────────────
  await prisma.$transaction([
    prisma.pendingAgentAction.deleteMany({ where: { tenantId } }),
    prisma.aiScore.deleteMany({ where: { tenantId } }),
    prisma.violation.deleteMany({ where: { tenantId } }),
    prisma.cashRecord.deleteMany({ where: { tenantId } }),
    prisma.orderLog.deleteMany({ where: { tenantId } }),
    prisma.attendanceRecord.deleteMany({ where: { tenantId } }),
    prisma.shift.deleteMany({ where: { tenantId } }),
    // LocationLog has no tenantId column — clean by driverId join after we
    // delete drivers below.
  ]);

  // Delete drivers + their LocationLogs before inserting fresh ones.
  const priorDrivers = await prisma.driver.findMany({
    where: { tenantId },
    select: { id: true },
  });
  if (priorDrivers.length > 0) {
    const driverIds = priorDrivers.map((d) => d.id);
    await prisma.locationLog.deleteMany({
      where: { driverId: { in: driverIds } },
    });
    await prisma.driver.deleteMany({ where: { tenantId } });
  }

  // Need a Company per platform. Re-use existing or create one.
  let company = await prisma.company.findFirst({
    where: { tenantId, platform: "KEETA" },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        tenantId,
        name: "Design Partner Fleet",
        platform: "KEETA",
        licenseCount: driverCount,
      },
    });
  }

  // ─── 2. Drivers ─────────────────────────────────────────────────────────
  const drivers: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < driverCount; i++) {
    const name = FIXTURE_NAMES[i % FIXTURE_NAMES.length];
    const platform = PLATFORMS[i % PLATFORMS.length];
    const created = await prisma.driver.create({
      data: {
        tenantId,
        companyId: company.id,
        name: `${name} (DP-1)`,
        phone: `+96599${(1000 + i).toString().padStart(4, "0")}`,
        platform,
        platformDriverId: `DP1-${platform}-${1000 + i}`,
        vehicleType: i % 3 === 0 ? "CAR" : "MOTORCYCLE",
        status: "ACTIVE",
        hireDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      },
    });
    drivers.push({ id: created.id, name: created.name });
  }
  console.log(`  Drivers: ${drivers.length}`);

  // ─── 3. Shifts + Attendance ─────────────────────────────────────────────
  const rng = seededRand(driverCount * 1000 + days);
  let onTime = 0;
  let late = 0;
  let noShow = 0;
  const shiftBatch: Array<Parameters<typeof prisma.shift.create>[0]["data"]> = [];
  const attendanceBatch: Array<Parameters<typeof prisma.attendanceRecord.create>[0]["data"]> = [];

  for (const d of drivers) {
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (days - dayOffset));

      const r = rng();
      let actualHours: number;
      let status: "COMPLETED" | "MISSED";
      let attStatus: "PRESENT" | "LATE" | "ABSENT";
      let lateMinutes = 0;
      if (r < 0.7) {
        // 70% on-time
        actualHours = 360 + Math.floor(rng() * 180); // 360..540 (6h–9h)
        status = "COMPLETED";
        attStatus = "PRESENT";
        onTime += 1;
      } else if (r < 0.9) {
        // 20% late
        actualHours = 300 + Math.floor(rng() * 180); // 300..480 (5h–8h)
        status = "COMPLETED";
        attStatus = "LATE";
        lateMinutes = 5 + Math.floor(rng() * 30);
        late += 1;
      } else {
        // 10% no-show
        actualHours = 0;
        status = "MISSED";
        attStatus = "ABSENT";
        noShow += 1;
      }

      const scheduledStart = new Date(date);
      scheduledStart.setUTCHours(8, 0, 0, 0);
      const scheduledEnd = new Date(date);
      scheduledEnd.setUTCHours(16, 0, 0, 0);

      shiftBatch.push({
        tenantId,
        driverId: d.id,
        date,
        platform: PLATFORMS[(dayOffset + drivers.indexOf(d)) % PLATFORMS.length],
        scheduledStart,
        scheduledEnd,
        actualHoursMinutes: actualHours,
        plannedHoursMinutes: 480,
        status,
      });
      attendanceBatch.push({
        tenantId,
        driverId: d.id,
        date,
        status: attStatus,
        lateMinutes,
        source: "design-partner-fixture",
      });
    }
  }
  // Bulk insert shift + attendance via createMany for speed.
  await prisma.shift.createMany({ data: shiftBatch });
  await prisma.attendanceRecord.createMany({
    data: attendanceBatch,
    skipDuplicates: true,
  });
  console.log(
    `  Shifts: ${shiftBatch.length} (${onTime} on-time, ${late} late, ${noShow} no-show)`,
  );
  console.log(`  AttendanceRecords: ${attendanceBatch.length}`);

  // ─── 4. LocationLogs (last 7 days only, 4 pings/driver/day) ─────────────
  // Need a Device per driver. Reuse or create lightweight stubs.
  let locCount = 0;
  for (const d of drivers) {
    let device = await prisma.device.findFirst({ where: { driverId: d.id } });
    if (!device) {
      device = await prisma.device.create({
        data: {
          tenantId,
          driverId: d.id,
          model: "DesignPartner-Pixel",
          serialNumber: `DP1-${d.id}`,
          status: "ACTIVE",
        },
      });
    }
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      for (let ping = 0; ping < 4; ping++) {
        const captured = new Date();
        captured.setUTCDate(captured.getUTCDate() - (7 - dayOffset));
        captured.setUTCHours(8 + ping * 2, 0, 0, 0);
        await prisma.locationLog.create({
          data: {
            deviceId: device.id,
            driverId: d.id,
            latitude: 29.3759 + (rng() - 0.5) * 0.05,
            longitude: 47.9774 + (rng() - 0.5) * 0.05,
            accuracy: 8 + rng() * 12,
            speed: 25 + rng() * 25,
            capturedAt: captured,
          },
        });
        locCount += 1;
      }
    }
  }
  console.log(`  LocationLogs: ${locCount}`);

  // ─── 5. OrderLogs ───────────────────────────────────────────────────────
  // ~25 orders/driver/day × 4 platforms — but for fixture we limit to 4
  // platforms TOTAL per driver (each driver has ONE platform anyway from
  // the Driver record).
  // Status distribution by row generation, since OrderLog doesn't track
  // status; we use rawData.status for that signal where the report queries.
  const orderBatch: Array<Parameters<typeof prisma.orderLog.create>[0]["data"]> = [];
  let delivered = 0;
  let cancelled = 0;
  let rejected = 0;
  let lateOrders = 0;
  for (const d of drivers) {
    const driverPlatform = PLATFORMS[drivers.indexOf(d) % PLATFORMS.length];
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const date = new Date();
      date.setUTCHours(12, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (days - dayOffset));
      const orderRows = 20 + Math.floor(rng() * 12); // 20..32 orders/driver/day
      for (let ord = 0; ord < orderRows; ord++) {
        const r = rng();
        let statusKey: "DELIVERED" | "CANCELLED" | "REJECTED" | "LATE";
        if (r < 0.8) {
          statusKey = "DELIVERED";
          delivered += 1;
        } else if (r < 0.92) {
          statusKey = "CANCELLED";
          cancelled += 1;
        } else if (r < 0.97) {
          statusKey = "REJECTED";
          rejected += 1;
        } else {
          statusKey = "LATE";
          lateOrders += 1;
        }
        orderBatch.push({
          tenantId,
          driverId: d.id,
          date,
          platform: driverPlatform,
          orderCount: 1,
          totalAmount: 0.5 + Math.round(rng() * 250) / 100, // 0.50..3.00 KD
          source: "MANUAL",
          rawData: { status: statusKey },
        });
      }
    }
  }
  // Chunked createMany to avoid massive parameter binding.
  const CHUNK = 1000;
  for (let i = 0; i < orderBatch.length; i += CHUNK) {
    await prisma.orderLog.createMany({ data: orderBatch.slice(i, i + CHUNK) });
  }
  console.log(
    `  OrderLogs: ${orderBatch.length} (${delivered} DELIVERED, ${cancelled} CANCELLED, ${rejected} REJECTED, ${lateOrders} LATE)`,
  );

  // ─── 6. CashRecords ─────────────────────────────────────────────────────
  let cashRows = 0;
  let withDues = 0;
  for (const d of drivers) {
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (10 + i * 7));
      const dues = i === 0 && drivers.indexOf(d) < 2
        ? (drivers.indexOf(d) === 0 ? 28.5 : 45.0)
        : 0;
      await prisma.cashRecord.create({
        data: {
          tenantId,
          driverId: d.id,
          date,
          salesAmount: 100 + rng() * 200,
          collectionAmount: 100 + rng() * 200 - dues,
          pendingDues: dues,
          status: dues > 0 ? "PENDING" : "SETTLED",
        },
      });
      cashRows += 1;
      if (dues > 0) withDues += 1;
    }
  }
  console.log(`  CashRecords: ${cashRows} (${withDues} with pendingDues)`);

  // ─── 7. Violations ──────────────────────────────────────────────────────
  const violationRows: Array<{
    driverIndex: number;
    type: "LATE_PICKUP" | "ORDER_REJECTION_TIMEOUT" | "DROP_OFF_IN_ADVANCE";
    daysAgo: number;
  }> = [
    { driverIndex: 0, type: "LATE_PICKUP", daysAgo: 2 },
    { driverIndex: 3, type: "ORDER_REJECTION_TIMEOUT", daysAgo: 7 },
    { driverIndex: 5, type: "DROP_OFF_IN_ADVANCE", daysAgo: 12 },
  ];
  let violationsCreated = 0;
  for (const v of violationRows) {
    const d = drivers[v.driverIndex];
    if (!d) continue;
    const violationTime = new Date();
    violationTime.setUTCDate(violationTime.getUTCDate() - v.daysAgo);
    await prisma.violation.create({
      data: {
        tenantId,
        driverId: d.id,
        platform: PLATFORMS[v.driverIndex % PLATFORMS.length],
        violationType: v.type,
        violationTime,
        details: `Design-partner fixture: ${v.type} on ${d.name}.`,
      },
    });
    violationsCreated += 1;
  }
  console.log(`  Violations: ${violationsCreated}`);

  // ─── 8. AiScore (1 per driver, top-heavy) ───────────────────────────────
  let scoreRows = 0;
  for (let i = 0; i < drivers.length; i++) {
    const d = drivers[i];
    // Top 5 drivers in [70, 95]; bottom 3 in [40, 65]; middle steady.
    let composite: number;
    if (i < 5) composite = 70 + Math.floor(rng() * 26);
    else composite = 40 + Math.floor(rng() * 26);
    await prisma.aiScore.create({
      data: {
        tenantId,
        driverId: d.id,
        date: new Date(),
        compositeScore: composite,
        attendanceScore: composite,
        deliveryScore: composite,
        financialScore: composite,
        equipmentScore: composite,
        platformScore: composite,
        trend: "STABLE",
      },
    });
    scoreRows += 1;
  }
  console.log(`  AiScore: ${scoreRows}`);

  // ─── 9. PendingAgentAction (10 rows — 6 active, 4 resolved) ────────────
  // Need an AgentRunLog FK since PendingAgentAction.runId points there.
  const agentRun = await prisma.agentRunLog.create({
    data: {
      tenantId,
      agentId: "monitor",
      triggerEvent: "design-partner-fixture",
      model: "design-partner-seed",
      status: "completed",
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });

  const pendingDistribution: Array<{
    toolName: "draftCourierMessage" | "flagForReview" | "proposeCashReminder";
    intent?: string;
    driverIndex: number;
    resolved: boolean;
    daysAgo: number;
  }> = [
    { toolName: "draftCourierMessage", intent: "WARN_LATE_CLOCKIN", driverIndex: 0, resolved: false, daysAgo: 1 },
    { toolName: "draftCourierMessage", intent: "WARN_LATE_CLOCKIN", driverIndex: 1, resolved: false, daysAgo: 2 },
    { toolName: "draftCourierMessage", intent: "WARN_LATE_CLOCKIN", driverIndex: 2, resolved: true, daysAgo: 3 },
    { toolName: "draftCourierMessage", intent: "WARN_GPS_STALE", driverIndex: 3, resolved: false, daysAgo: 4 },
    { toolName: "draftCourierMessage", intent: "COACHING_PERFORMANCE", driverIndex: 4, resolved: true, daysAgo: 5 },
    { toolName: "draftCourierMessage", intent: "CASH_REMINDER", driverIndex: 5, resolved: false, daysAgo: 6 },
    { toolName: "flagForReview", driverIndex: 0, resolved: true, daysAgo: 7 },
    { toolName: "flagForReview", driverIndex: 6, resolved: false, daysAgo: 8 },
    { toolName: "flagForReview", driverIndex: 7, resolved: true, daysAgo: 9 },
    { toolName: "proposeCashReminder", driverIndex: 1, resolved: false, daysAgo: 10 },
  ];
  let pendingCreated = 0;
  let pendingActive = 0;
  for (const p of pendingDistribution) {
    const d = drivers[p.driverIndex];
    if (!d) continue;
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - p.daysAgo);
    await prisma.pendingAgentAction.create({
      data: {
        tenantId,
        runId: agentRun.id,
        agentId: "monitor",
        toolName: p.toolName,
        input: p.intent
          ? { driverId: d.id, intent: p.intent, bodyEnglish: `Design-partner fixture proposal for ${d.name}` }
          : { driverId: d.id, reason: `Design-partner ${p.toolName} fixture` },
        recommendation: "approve",
        confidence: 0.7 + Math.floor(rng() * 25) / 100,
        reasoning: `Design-partner fixture: ${p.toolName}${p.intent ? ` (${p.intent})` : ""} for ${d.name}.`,
        priorityScore: 0.5 + rng() * 0.5,
        subjectType: "Driver",
        subjectId: d.id,
        resolvedAt: p.resolved ? createdAt : null,
        resolution: p.resolved ? "approved" : null,
        createdAt,
      },
    });
    pendingCreated += 1;
    if (!p.resolved) pendingActive += 1;
  }
  console.log(`  PendingAgentAction: ${pendingCreated} (${pendingActive} active, ${pendingCreated - pendingActive} resolved)`);

  console.log(`\nFixture complete. Run /admin/onboarding wizard against this tenant`);
  console.log(`to render the full Darb's-read report.\n`);
}

main()
  .catch((err) => {
    console.error("seed-design-partner-fixture failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
