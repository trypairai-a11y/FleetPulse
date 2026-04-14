import { prisma } from "../config";
import { AiInsightsEngine } from "./aiInsightsEngine";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

async function runPass() {
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const t of tenants) {
      try {
        const count = await AiInsightsEngine.computeAllInsights(t.id);
        if (count > 0) {
          console.log(`[insightsScheduler] tenant=${t.id} created ${count} insights`);
        }
      } catch (err: any) {
        console.error(`[insightsScheduler] tenant=${t.id} failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error(`[insightsScheduler] outer failure: ${err.message}`);
  }
}

/**
 * Start the 4-hour AI insights computation pass.
 * Computes all 6 insight categories and builds the demand heatmap.
 */
export function startInsightsScheduler() {
  if (timer) return;
  if (process.env.DISABLE_INSIGHTS_SCHEDULER === "1") return;

  // First pass 5 min after boot so migrations/seed finish first
  setTimeout(runPass, 5 * 60 * 1000);

  timer = setInterval(runPass, FOUR_HOURS_MS);
  console.log("[insightsScheduler] started (4h interval)");
}

export function stopInsightsScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
