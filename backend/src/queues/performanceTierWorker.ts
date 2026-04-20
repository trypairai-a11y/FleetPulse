import { computeAllTenantTiers } from "../services/performanceService";

// R9 · Performance tier scheduler. Recomputes tiers every Monday at 06:00
// local. Implemented as a lightweight setInterval + day-of-week check so it
// fits the existing scheduler pattern; flip to BullMQ if/when we move every
// worker there.

let timer: NodeJS.Timeout | null = null;
let lastFiredKey: string | null = null;

const HOUR_MS = 60 * 60 * 1000;

async function maybeRun() {
  if (process.env.DISABLE_PERFORMANCE_TIER === "1") return;
  const now = new Date();
  // Monday = 1, 06:00 local
  if (now.getDay() !== 1 || now.getHours() !== 6) return;
  const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-06`;
  if (lastFiredKey === key) return;
  lastFiredKey = key;
  try {
    await computeAllTenantTiers();
  } catch (err: any) {
    console.error("[performanceTierWorker] run failed:", err?.message ?? err);
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
