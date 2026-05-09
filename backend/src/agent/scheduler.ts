import { prisma } from "../config";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { subscribe, type DarbEvent, type DarbEventType } from "../services/eventBus";
import { listAgents, runAgent, type AgentDefinition, type AgentId } from "./runtime";

/**
 * Agent scheduler: dispatches agent runs on two axes —
 *   1. Event triggers: subscribe to eventBus per tenant, match event.type
 *      against each agent's `triggers` list, fire runAgent.
 *   2. Cron schedules: Triage re-ranks every 15 min; Narrator runs hourly
 *      during operating hours (07:00–23:00 Kuwait, i.e. UTC+3).
 *
 * Replaces the previous anomalyScheduler + insightsScheduler. Anomaly detection
 * still happens — but now as a tool called by the Triage Agent, not as its own
 * scheduler.
 */

// ─── Per-tenant subscription bookkeeping ─────────────────────────────────────

const subscribedTenants = new Map<string, () => void>(); // tenantId → unsubscribe

async function listActiveTenants(): Promise<string[]> {
  const rows = await prisma.tenant.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}

function matchAgentsForEvent(eventType: DarbEventType): AgentDefinition[] {
  return listAgents().filter((a) => a.triggers.includes(eventType));
}

async function handleTenantEvent(event: DarbEvent) {
  const agents = matchAgentsForEvent(event.type);
  if (agents.length === 0) return;

  logger.info(
    { tenantId: event.tenantId, eventType: event.type, agents: agents.map((a) => a.id) },
    "agentScheduler: dispatching event"
  );

  await Promise.all(
    agents.map((agent) =>
      runAgent(agent.id as AgentId, {
        tenantId: event.tenantId,
        triggerEvent: `event:${event.type}`,
        payload: event.payload,
      }).catch((err) => {
        logger.error({ err, agentId: agent.id, tenantId: event.tenantId }, "agentScheduler: run failed");
      })
    )
  );
}

async function subscribeTenant(tenantId: string) {
  if (subscribedTenants.has(tenantId)) return;
  const unsub = subscribe(tenantId, (event) => {
    handleTenantEvent(event).catch(() => {});
  });
  subscribedTenants.set(tenantId, unsub);
}

// ─── Cron: discover new tenants every 5 min ──────────────────────────────────

async function refreshTenantSubscriptions() {
  try {
    const active = await listActiveTenants();
    for (const tenantId of active) {
      await subscribeTenant(tenantId);
    }
  } catch (err) {
    logger.error({ err }, "agentScheduler: refreshTenantSubscriptions failed");
  }
}

// ─── Cron: Triage re-rank (every 15 min) ─────────────────────────────────────

async function triageRerankTick() {
  try {
    const tenants = await listActiveTenants();
    for (const tenantId of tenants) {
      await runAgent("triage", {
        tenantId,
        triggerEvent: "cron:15m",
      }).catch((err) => logger.error({ err, tenantId }, "agentScheduler: triage tick failed"));
    }
  } catch (err) {
    logger.error({ err }, "agentScheduler: triageRerankTick failed");
  }
}

// ─── Cron: Narrator hourly brief (07:00–23:00 Kuwait) ────────────────────────

function isOperatingHourKuwait(now = new Date()): boolean {
  // Kuwait is UTC+3 year-round (no DST).
  const kuwaitHour = (now.getUTCHours() + 3) % 24;
  return kuwaitHour >= 7 && kuwaitHour <= 23;
}

async function narratorHourlyTick() {
  if (!isOperatingHourKuwait()) return;
  try {
    const tenants = await listActiveTenants();
    for (const tenantId of tenants) {
      await runAgent("narrator", {
        tenantId,
        triggerEvent: "cron:1h",
      }).catch((err) => logger.error({ err, tenantId }, "agentScheduler: narrator tick failed"));
    }
  } catch (err) {
    logger.error({ err }, "agentScheduler: narratorHourlyTick failed");
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

let running = false;
const intervals: NodeJS.Timeout[] = [];

export async function startAgentScheduler() {
  if (running) return;
  if (!env.ANTHROPIC_API_KEY) {
    logger.warn("agentScheduler: ANTHROPIC_API_KEY not set, skipping start");
    return;
  }
  running = true;

  logger.info("agentScheduler: starting");

  // Initial subscription for all current tenants
  await refreshTenantSubscriptions();

  // Refresh tenant subscriptions every 5 min (picks up new tenants)
  intervals.push(setInterval(() => void refreshTenantSubscriptions(), 5 * 60 * 1000));

  // Triage re-rank every 15 min
  intervals.push(setInterval(() => void triageRerankTick(), 15 * 60 * 1000));

  // Narrator hourly briefing (top of hour)
  intervals.push(setInterval(() => void narratorHourlyTick(), 60 * 60 * 1000));

  logger.info({ tenants: subscribedTenants.size }, "agentScheduler: started");
}

export function stopAgentScheduler() {
  intervals.forEach((i) => clearInterval(i));
  intervals.length = 0;
  subscribedTenants.forEach((unsub) => unsub());
  subscribedTenants.clear();
  running = false;
}
