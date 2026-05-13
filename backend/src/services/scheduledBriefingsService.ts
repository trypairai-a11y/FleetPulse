// Phase 4 Wave 5 — Scheduled briefings service.
//
// CRUD for ScheduledBriefing rows + bind/unbind glue for the BullMQ
// JobScheduler. REQ-chat-scheduled-jobs.
//
// Cron whitelist (orchestrator_resolutions §3 + UI-SPEC §9):
//   "0 6 * * *"   — 06:00 daily
//   "0 7 * * *"   — 07:00 daily
//   "0 17 * * *"  — 17:00 daily
//   "0 6 * * 1"   — Monday 06:00
// Any other cron string requires role=ADMIN. Sub-5-min (`* * * * *`) is
// rejected even for admins to prevent runaway costs (T-04-W5-01).

import { prisma } from "../config";
import { logger } from "../config/logger";
import { bindBriefing, unbindBriefing } from "../queues/scheduledBriefingsWorker";

const ALLOWED_CRON_DEFAULT = new Set([
  "0 6 * * *",
  "0 7 * * *",
  "0 17 * * *",
  "0 6 * * 1",
]);

export type BriefingType = "briefing" | "standing_rule_v3";

export interface ScheduledBriefingRecord {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  cron: string;
  prompt: string;
  recipients: unknown;
  channels: unknown;
  type: string;
  active: boolean;
  nextFireAt: Date | null;
  lastFireAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Validate a cron string against the whitelist + admin custom rules.
 * Returns { ok: true } on success or { ok: false, error: <reason> }.
 */
export function validateCron(
  cron: string,
  userRole: string,
): { ok: boolean; error?: string } {
  if (typeof cron !== "string" || cron.trim().length === 0) {
    return { ok: false, error: "Cron expression is required" };
  }
  const normalized = cron.trim();
  if (ALLOWED_CRON_DEFAULT.has(normalized)) return { ok: true };

  // Reject non-cron syntactic sugar like @daily / @hourly even for admins
  // — the worker uses BullMQ JobScheduler which expects a 5-field pattern.
  if (normalized.startsWith("@")) {
    return { ok: false, error: "Cron aliases like '@daily' are not supported" };
  }

  if (userRole !== "ADMIN") {
    return { ok: false, error: "Custom cron requires ADMIN role" };
  }

  const fields = normalized.split(/\s+/);
  if (fields.length !== 5) {
    return { ok: false, error: "Cron must have exactly 5 fields" };
  }
  // T-04-W5-01 — even admins can't fire every minute.
  if (fields[0] === "*") {
    return { ok: false, error: "Sub-5-min schedules are not allowed" };
  }
  return { ok: true };
}

// ─── createBriefing ─────────────────────────────────────────────────────────

export async function createBriefing(opts: {
  tenantId: string;
  userId: string;
  userRole: string;
  name: string;
  cron: string;
  prompt: string;
  recipients?: string[];
  channels?: string[];
  type?: BriefingType;
}): Promise<ScheduledBriefingRecord> {
  if (!opts.tenantId) throw new Error("createBriefing: tenantId required");
  if (!opts.userId) throw new Error("createBriefing: userId required");
  if (!opts.name?.trim()) throw new Error("createBriefing: name required");
  if (!opts.prompt?.trim()) throw new Error("createBriefing: prompt required");

  const valid = validateCron(opts.cron, opts.userRole);
  if (!valid.ok) throw new Error(valid.error || "Invalid cron");

  const created = await prisma.scheduledBriefing.create({
    data: {
      tenantId: opts.tenantId,
      userId: opts.userId,
      name: opts.name.trim(),
      cron: opts.cron.trim(),
      prompt: opts.prompt,
      recipients: (opts.recipients ?? []) as any,
      channels: (opts.channels ?? ["in_chat"]) as any,
      type: opts.type ?? "briefing",
      active: true,
    },
  });

  if (created.active) {
    try {
      await bindBriefing({
        id: created.id,
        tenantId: created.tenantId,
        userId: created.userId,
        cron: created.cron,
        prompt: created.prompt,
        type: created.type,
      });
    } catch (err) {
      logger?.warn?.(
        { id: created.id, err: (err as Error).message },
        "createBriefing: bindBriefing failed (non-fatal)",
      );
    }
  }
  return created as unknown as ScheduledBriefingRecord;
}

// ─── listBriefings ──────────────────────────────────────────────────────────

export async function listBriefings(
  tenantId: string,
  userId: string,
): Promise<ScheduledBriefingRecord[]> {
  if (!tenantId) throw new Error("listBriefings: tenantId required");
  if (!userId) throw new Error("listBriefings: userId required");
  const rows = await prisma.scheduledBriefing.findMany({
    where: { tenantId, userId },
    orderBy: { createdAt: "desc" },
  });
  return rows as unknown as ScheduledBriefingRecord[];
}

// ─── patchBriefing ──────────────────────────────────────────────────────────

export async function patchBriefing(
  id: string,
  tenantId: string,
  userId: string,
  userRole: string,
  patch: Partial<{ active: boolean; name: string; cron: string; prompt: string }>,
): Promise<ScheduledBriefingRecord> {
  if (!id) throw new Error("patchBriefing: id required");
  if (!tenantId) throw new Error("patchBriefing: tenantId required");
  if (!userId) throw new Error("patchBriefing: userId required");

  if (patch.cron) {
    const valid = validateCron(patch.cron, userRole);
    if (!valid.ok) throw new Error(valid.error || "Invalid cron");
  }

  const data: Record<string, unknown> = {};
  if (typeof patch.active === "boolean") data.active = patch.active;
  if (typeof patch.name === "string") data.name = patch.name.trim();
  if (typeof patch.cron === "string") data.cron = patch.cron.trim();
  if (typeof patch.prompt === "string") data.prompt = patch.prompt;

  const updated = await prisma.scheduledBriefing.updateMany({
    where: { id, tenantId, userId },
    data: data as any,
  });
  if (updated.count === 0) {
    const err = new Error("Briefing not found");
    (err as any).code = "NOT_FOUND";
    throw err;
  }
  const fresh = await prisma.scheduledBriefing.findFirst({
    where: { id, tenantId, userId },
  });
  if (!fresh) {
    const err = new Error("Briefing not found");
    (err as any).code = "NOT_FOUND";
    throw err;
  }

  try {
    if (fresh.active) {
      await bindBriefing({
        id: fresh.id,
        tenantId: fresh.tenantId,
        userId: fresh.userId,
        cron: fresh.cron,
        prompt: fresh.prompt,
        type: fresh.type,
      });
    } else {
      await unbindBriefing(fresh.id);
    }
  } catch (err) {
    logger?.warn?.(
      { id: fresh.id, err: (err as Error).message },
      "patchBriefing: bind/unbind failed (non-fatal)",
    );
  }
  return fresh as unknown as ScheduledBriefingRecord;
}

// ─── deleteBriefing ─────────────────────────────────────────────────────────

export async function deleteBriefing(
  id: string,
  tenantId: string,
  userId: string,
): Promise<void> {
  if (!id) throw new Error("deleteBriefing: id required");
  if (!tenantId) throw new Error("deleteBriefing: tenantId required");
  if (!userId) throw new Error("deleteBriefing: userId required");

  try {
    await unbindBriefing(id);
  } catch (err) {
    logger?.warn?.(
      { id, err: (err as Error).message },
      "deleteBriefing: unbindBriefing failed (non-fatal)",
    );
  }
  await prisma.scheduledBriefing.deleteMany({
    where: { id, tenantId, userId },
  });
}
