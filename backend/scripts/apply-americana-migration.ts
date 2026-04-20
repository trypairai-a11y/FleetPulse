/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma";

// One-off: apply the A-phase (Americana B2B fleet) migration against whatever
// DATABASE_URL is in scope. The SQL file is written with `IF NOT EXISTS`
// throughout so re-runs are safe.

const prisma = new PrismaClient();

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("[apply-americana] DATABASE_URL not set");
    process.exit(1);
  }

  const sqlPath = path.join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    "20260420200000_americana_b2b_fleet",
    "migration.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  // Split on `;` at end of line, strip comment-only lines per chunk.
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

  console.log(`[apply-americana] ${statements.length} statements to run`);

  try {
    for (let i = 0; i < statements.length; i++) {
      const preview = statements[i].slice(0, 80).replace(/\s+/g, " ");
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}…`);
      try {
        await prisma.$executeRawUnsafe(statements[i]);
        process.stdout.write(" ✓\n");
      } catch (err: any) {
        // `IF NOT EXISTS` / `IF EXISTS` should have covered re-runs, but
        // some PG versions don't support it for ADD VALUE on enums — skip
        // those specific duplicate-object cases so the script stays
        // idempotent.
        const msg = String(err?.meta?.message || err?.message || err);
        if (
          /already exists|duplicate/i.test(msg) ||
          err?.meta?.code === "42710" || // duplicate_object
          err?.meta?.code === "42P07" || // duplicate_table
          err?.meta?.code === "42701"    // duplicate_column
        ) {
          process.stdout.write(" (already present, skipping)\n");
          continue;
        }
        process.stdout.write(" ✗\n");
        throw err;
      }
    }
    console.log("[apply-americana] done ✓");
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("[apply-americana] failed:", err);
  process.exit(1);
});
