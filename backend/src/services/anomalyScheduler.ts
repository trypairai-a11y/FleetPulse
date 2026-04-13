import { prisma } from "../config";
import { AiAnomalyService } from "./aiAnomalyService";
import { runAllViolationChecks } from "./violationEngine";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

async function runPass() {
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const t of tenants) {
      try {
        const count = await AiAnomalyService.detectAnomalies(t.id);
        if (count > 0) {
          console.log(`[anomalyScheduler] tenant=${t.id} created ${count} alerts`);
        }
      } catch (err: any) {
        console.error(`[anomalyScheduler] tenant=${t.id} failed: ${err.message}`);
      }
      try {
        const violations = await runAllViolationChecks(t.id);
        if (violations > 0) {
          console.log(`[anomalyScheduler] tenant=${t.id} created ${violations} violations`);
        }
      } catch (err: any) {
        console.error(`[anomalyScheduler] tenant=${t.id} violation checks failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error(`[anomalyScheduler] outer failure: ${err.message}`);
  }
}

/**
 * Start the 6-hour anomaly detection pass. PRD §8 Feature 3.
 * No-op on Vercel serverless (no long-running process).
 */
export function startAnomalyScheduler() {
  if (timer) return;
  if (process.env.DISABLE_ANOMALY_SCHEDULER === "1") return;

  // First pass 60s after boot so migrations/seed finish first
  setTimeout(runPass, 60_000);

  timer = setInterval(runPass, SIX_HOURS_MS);
  console.log("[anomalyScheduler] started (6h interval)");
}

export function stopAnomalyScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
