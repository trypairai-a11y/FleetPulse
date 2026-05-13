// Phase 6 Wave 1 — IngestRun audit writer.
//
// Pattern source: existing prisma.ingestRun.create + update pattern from
// queues/keetaPortalScraperWorker.ts:33-95 — collapsed into a single call
// so adapters and route factories don't re-implement the audit shape.
//
// Threat T-06-03 (Information disclosure): errorLog is trimmed to 4000
// chars before insert (the IngestRun.errorLog column is `String?` with
// no DB-side cap; we cap here to avoid bloating the row with full
// stack traces or credential-bearing payloads).

import { prisma } from "../../config";
import type { Platform } from "./types";

const MAX_ERROR_LOG_CHARS = 4000;

export interface WriteIngestRunArgs {
  tenantId: string;
  platform: Platform;
  /** Free-form string column on IngestRun. See schema.prisma:1318 for the
   * canonical value set: "PORTAL_SCRAPER" | "MANUAL_UPLOAD" | "OCR_MOBILE" |
   * "OCR_WEB" | "XLSX_IMPORT" | "BACKWASH" | "EMAIL_INBOX". */
  source: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  startedAt: Date;
  finishedAt?: Date;
  rowsIn?: number;
  rowsOk?: number;
  errorLog?: string | null;
}

/**
 * Persist a single IngestRun row, returning its id.
 *
 * - `errorLog` is trimmed to 4000 chars (T-06-03).
 * - `finishedAt` defaults to `new Date()` so terminal-status callers
 *   (SUCCESS/PARTIAL/FAILED) don't have to pass it explicitly.
 * - `rowsIn` / `rowsOk` default to null when omitted.
 */
export async function writeIngestRun(
  args: WriteIngestRunArgs,
): Promise<{ id: string }> {
  const errorLog = args.errorLog
    ? args.errorLog.length > MAX_ERROR_LOG_CHARS
      ? args.errorLog.slice(0, MAX_ERROR_LOG_CHARS)
      : args.errorLog
    : null;

  const row = await prisma.ingestRun.create({
    data: {
      tenantId: args.tenantId,
      platform: args.platform,
      source: args.source,
      status: args.status,
      startedAt: args.startedAt,
      finishedAt: args.finishedAt ?? new Date(),
      rowsIn: args.rowsIn ?? null,
      rowsOk: args.rowsOk ?? null,
      errorLog,
    },
    select: { id: true },
  });
  return { id: row.id };
}
