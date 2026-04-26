/**
 * Backfills OrderLog rows for last calendar month and earlier this month
 * so the /overview per-platform sparklines render full daily trends.
 */
import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant");
  const tid = tenant.id;
  const drivers = await prisma.driver.findMany({
    where: { tenantId: tid },
    select: { id: true, platform: true },
  });

  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const lastMonthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));

  // Wipe everything from last-month-start through yesterday so we control the trend
  const yday = new Date(today); yday.setUTCDate(yday.getUTCDate() - 1);
  await prisma.orderLog.deleteMany({
    where: { tenantId: tid, date: { gte: lastMonthStart, lte: yday } },
  });

  const rows: any[] = [];
  // Last month: full days
  const cursor = new Date(lastMonthStart);
  while (cursor <= lastMonthEnd) {
    const d = new Date(cursor);
    const dow = d.getUTCDay(); // 0=Sun
    const weekendBoost = dow === 5 || dow === 6 ? 1.25 : 1.0;
    for (const drv of drivers) {
      const base = drv.platform === "TALABAT" ? rand(14, 28)
                 : drv.platform === "KEETA" ? rand(12, 25)
                 : drv.platform === "DELIVEROO" ? rand(8, 18)
                 : rand(6, 14); // AMERICANA
      const orderCount = Math.round(base * weekendBoost);
      rows.push({
        tenantId: tid, driverId: drv.id, date: d,
        platform: drv.platform, orderCount, source: "MANUAL" as const,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // This month: from monthStart through yesterday with mild upward drift
  const cursor2 = new Date(monthStart);
  let dayIndex = 0;
  while (cursor2 < today) {
    const d = new Date(cursor2);
    const dow = d.getUTCDay();
    const weekendBoost = dow === 5 || dow === 6 ? 1.30 : 1.05;
    const drift = 1 + (dayIndex * 0.005); // slow growth
    for (const drv of drivers) {
      const base = drv.platform === "TALABAT" ? rand(15, 30)
                 : drv.platform === "KEETA" ? rand(13, 27)
                 : drv.platform === "DELIVEROO" ? rand(9, 19)
                 : rand(7, 15);
      const orderCount = Math.round(base * weekendBoost * drift);
      rows.push({
        tenantId: tid, driverId: drv.id, date: d,
        platform: drv.platform, orderCount, source: "MANUAL" as const,
      });
    }
    cursor2.setUTCDate(cursor2.getUTCDate() + 1);
    dayIndex += 1;
  }

  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.orderLog.createMany({ data: rows.slice(i, i + 1000) });
  }
  console.log(`OrderLog backfill: ${rows.length} rows across ${drivers.length} drivers`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
