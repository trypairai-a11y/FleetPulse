import {
  computeAllTenantTiers,
  snapshotAllTenants,
} from "../services/performanceService";

// R9 · Performance tier scheduler. Recomputes tiers every Monday at 06:00
// local. Implemented as a lightweight setInterval + day-of-week check so it
// fits the existing scheduler pattern; flip to BullMQ if/when we move every
// worker there.
//
// Phase 1 Wave 2 extension: also runs a DAILY PerformanceSnapshot pass at
// 23:00 local so Phase 3's 90-day trend chart has non-empty rows from the
// moment Phase 3 ships.

let timer: NodeJS.Timeout | null = null;
let lastFiredKey: string | null = null;
let lastSnapshotDayKey: string | null = null;

const HOUR_MS = 60 * 60 * 1000;

async function maybeRun() {
  const now = new Date();

  // ── Weekly tier rollup (Mon 06:00 local) ────────────────────────────────
  if (process.env.DISABLE_PERFORMANCE_TIER !== "1") {
    if (now.getDay() === 1 && now.getHours() === 6) {
      const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-06`;
      if (lastFiredKey !== key) {
        lastFiredKey = key;
        try {
          await computeAllTenantTiers();
        } catch (err: any) {
          console.error(
            "[performanceTierWorker] tier run failed:",
            err?.message ?? err,
          );
        }
      }
    }
  }

  // ── Daily PerformanceSnapshot writer (every day, 23:00 local) ────────────
  // Backs Phase 3's Driver File 90-day trend. Reads from today's AiScore rows
  // (written earlier by existing scoring jobs) and mirrors into the
  // PerformanceSnapshot table. Idempotent via upsert.
  if (process.env.DISABLE_PERFORMANCE_SNAPSHOT !== "1") {
    if (now.getHours() === 23) {
      const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-snap`;
      if (lastSnapshotDayKey !== dayKey) {
        lastSnapshotDayKey = dayKey;
        try {
          const r = await snapshotAllTenants();
          console.log(
            `[performanceTierWorker] snapshot: ${r.written} written, ${r.failed} failed across ${r.tenants} tenants`,
          );
        } catch (err: any) {
          console.error(
            "[performanceTierWorker] snapshot run failed:",
            err?.message ?? err,
          );
        }
      }
    }
  }
}

export function startPerformanceTierScheduler() {
  if (timer) return;
  // Check every hour — lightweight, and keeps the firing window simple.
  setTimeout(maybeRun, 2 * 60 * 1000); // initial pass after 2 min
  timer = setInterval(maybeRun, HOUR_MS);
  console.log("[performanceTierWorker] scheduler started (Mon 06:00 local)");
}

export function stopPerformanceTierScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
