/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma";

// Idempotent R-restructure schema applier.
//
// Runs during Vercel build. Checks whether each object from the three
// R-phase migrations (R1 TalabatDailyMetrics, R6 IngestRun, R9
// Driver.performanceTier) already exists; applies the migration SQL only
// where missing. Safe to re-run — every gate is an existence check.
//
// Skips cleanly when DATABASE_URL is unset (local dev / typecheck-only
// builds) so CI doesn't need DB access.

const prisma = new PrismaClient();

type Check = {
  name: string;
  sqlPath: string;
  probe: () => Promise<boolean>;
};

const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");

const checks: Check[] = [
  {
    name: "R1 · TalabatDailyMetrics",
    sqlPath: path.join(migrationsDir, "20260420180000_talabat_daily_metrics", "migration.sql"),
    probe: async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TalabatDailyMetrics') AS exists`
      );
      return rows[0]?.exists === true;
    },
  },
  {
    name: "R6 · IngestRun",
    sqlPath: path.join(migrationsDir, "20260420181500_ingest_run", "migration.sql"),
    probe: async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'IngestRun') AS exists`
      );
      return rows[0]?.exists === true;
    },
  },
  {
    name: "R9 · Driver.performanceTier",
    sqlPath: path.join(migrationsDir, "20260420183000_driver_performance_tier", "migration.sql"),
    probe: async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Driver' AND column_name = 'performanceTier') AS exists`
      );
      return rows[0]?.exists === true;
    },
  },
];

async function run() {
  if (!process.env.DATABASE_URL) {
    console.log("[apply-r-migrations] DATABASE_URL not set — skipping");
    return;
  }

  try {
    for (const c of checks) {
      const present = await c.probe();
      if (present) {
        console.log(`[apply-r-migrations] ${c.name}: already present — skipping`);
        continue;
      }
      const sql = fs.readFileSync(c.sqlPath, "utf8");
      console.log(`[apply-r-migrations] ${c.name}: applying ${path.basename(path.dirname(c.sqlPath))}`);
      // Split on `;` and run each DDL statement separately for driver portability.
      // Strip leading `--` comments from each chunk (but keep the statement itself).
      const statements = sql
        .split(/;\s*(?:\n|$)/)
        .map((s) =>
          s
            .split("\n")
            .filter((line) => !line.trim().startsWith("--"))
            .join("\n")
            .trim()
        )
        .filter((s) => s.length > 0);
      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt);
      }
      console.log(`[apply-r-migrations] ${c.name}: applied ✓`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("[apply-r-migrations] failed:", err);
  process.exit(1);
});
