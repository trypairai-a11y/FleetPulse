/**
 * seed-orders.ts
 * Inserts 1000 TALABAT OrderLog records for today (2026-04-08).
 * Run: npx tsx prisma/seed-orders.ts
 */

import { PrismaClient, Platform, OrderSource } from "../src/generated/prisma";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function decimal(min: number, max: number, places = 3) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(places));
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

const RESTAURANTS = [
  "Al Baik", "Hardee's", "McDonald's", "KFC", "Burger King",
  "Pizza Hut", "Domino's Pizza", "Subway", "Shake Shack", "Five Guys",
  "Zaatar w Zeit", "PAUL Bakery", "Tim Hortons", "Starbucks", "The Cheesecake Factory",
  "Applebee's", "TGI Fridays", "Chili's", "Nando's", "Popeyes",
  "Moti Mahal", "Biryani Pot", "Al Makan", "Bait Al Mandi", "Samad Al Iraqi",
  "Kudu", "Johnny Rockets", "Carl's Jr", "Smashburger", "The Halal Guys",
  "Ennabi Seafood", "Bu Qtair", "Al Tazaj", "Zad Al Khair", "Dar Al Hawa",
];

async function main() {
  const TARGET = 1000;
  const TODAY = new Date("2026-04-08T00:00:00.000Z");

  // Get tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found — run the main seed first.");

  // Get Talabat drivers
  const drivers = await prisma.driver.findMany({
    where: { tenantId: tenant.id, platform: "TALABAT" },
    select: { id: true },
  });
  if (drivers.length === 0) throw new Error("No TALABAT drivers found — run the main seed first.");

  console.log(`Found ${drivers.length} TALABAT drivers. Inserting ${TARGET} orders for 2026-04-08...`);

  // Build batch
  const batch: any[] = [];
  for (let i = 0; i < TARGET; i++) {
    const driver = pick(drivers);
    const isCash = Math.random() < 0.4;
    const cashAmt = isCash ? decimal(0.5, 5) : null;

    // Spread orders across 6am–11pm
    const hour = rand(6, 23);
    const minute = rand(0, 59);
    const arrivalTime = new Date(TODAY);
    arrivalTime.setUTCHours(hour, minute, 0, 0);

    batch.push({
      tenantId: tenant.id,
      driverId: driver.id,
      date: TODAY,
      platform: "TALABAT" as Platform,
      orderCount: 1,
      orderNumber: String(3538000000 + rand(0, 999999)),
      paymentSource: isCash ? "CASH" : "KNET",
      restaurantName: pick(RESTAURANTS),
      arrivalTime,
      cashCollected: cashAmt,
      distanceKm: decimal(1, 8),
      tips: Math.random() < 0.15 ? decimal(0.1, 1) : null,
      source: "MANUAL" as OrderSource,
    });
  }

  // Insert in chunks of 100
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < batch.length; i += CHUNK) {
    await prisma.orderLog.createMany({ data: batch.slice(i, i + CHUNK) });
    inserted += Math.min(CHUNK, batch.length - i);
    process.stdout.write(`\r  Inserted ${inserted}/${TARGET}`);
  }

  console.log(`\nDone. ${TARGET} TALABAT orders created.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
