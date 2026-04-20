import { prisma } from "../config";
import { logger } from "../config/logger";
import { decryptCred, hasEncryptedShape } from "../utils/portalCreds";

// R6 · Keeta portal scraper — scaffold only.
//
// Responsibility: scheduled login to the Keeta partner portal → pull daily
// courier metrics, violations, shifts, rejections → upsert into our DB.
//
// v0.1 scope: write IngestRun audit rows; real Playwright scrape is a TODO
// once credentials + portal selectors are available. The worker runs and
// records FAILED runs until then, so the monitoring dashboard exercises are
// in place.
//
// Schedule: every 30 min; full snapshot pass at 00:15 local.

const FIVE_MIN_MS = 5 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

type PortalCreds = { username: string; password: string };

async function loadCreds(tenantId: string): Promise<PortalCreds | null> {
  const settings = await prisma.platformSettings.findUnique({
    where: { tenantId_platform: { tenantId, platform: "KEETA" } },
  });
  const pc = (settings?.notificationConfig as any)?.portalCredentials;
  if (!pc?.username || !hasEncryptedShape(pc.password)) return null;
  return { username: pc.username, password: decryptCred(pc.password) };
}

async function runPassForTenant(tenantId: string): Promise<void> {
  const startedAt = new Date();
  const run = await prisma.ingestRun.create({
    data: {
      tenantId,
      platform: "KEETA",
      source: "PORTAL_SCRAPER",
      status: "PARTIAL",
      startedAt,
    },
  });

  try {
    const creds = await loadCreds(tenantId);
    if (!creds) {
      await prisma.ingestRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorLog: "No Keeta portal credentials configured for tenant",
        },
      });
      return;
    }

    // TODO: Playwright flow
    //   const browser = await chromium.launch({ headless: true });
    //   const ctx = await browser.newContext({ locale: "en-US" });
    //   const page = await ctx.newPage();
    //   await page.goto(process.env.KEETA_PORTAL_URL!);
    //   await page.fill("[name=username]", creds.username);
    //   await page.fill("[name=password]", creds.password);
    //   await page.click("button[type=submit]");
    //   await page.waitForURL(/dashboard/);
    //   // scrape daily metrics, violations, shifts, rejections
    //   await browser.close();
    //
    // On selector drift: notify Ops with a "Test run" button. Until then,
    // mark PARTIAL so dashboards show the scaffold is wired but not live.
    logger.info({ tenantId }, "[keetaPortalScraper] scaffold run complete (no-op)");

    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status: "PARTIAL",
        finishedAt: new Date(),
        rowsIn: 0,
        rowsOk: 0,
        errorLog: "Scaffold only — Playwright selectors pending",
      },
    });
  } catch (err: any) {
    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorLog: err?.message ?? String(err),
      },
    });
    logger.error({ err, tenantId }, "[keetaPortalScraper] run failed");
  }
}

async function runScraperPass() {
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const t of tenants) {
      try {
        await runPassForTenant(t.id);
      } catch (err: any) {
        console.error(`[keetaPortalScraper] tenant=${t.id} failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error(`[keetaPortalScraper] outer failure: ${err.message}`);
  }
}

export function startKeetaPortalScraperScheduler() {
  if (timer) return;
  if (process.env.DISABLE_KEETA_SCRAPER === "1") return;

  setTimeout(runScraperPass, FIVE_MIN_MS);
  timer = setInterval(runScraperPass, THIRTY_MIN_MS);
  console.log("[keetaPortalScraper] scheduler started (30m interval)");
}

export function stopKeetaPortalScraperScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
