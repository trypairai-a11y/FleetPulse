// Phase 6 Wave 1 — XLSX upload route factory.
//
// Pattern source: Phase 6 RESEARCH.md §"Pattern 5: XLSX Route Handler".
// Replaces the inline XLSX-upload pattern in routes/keeta.ts:376-470 with
// a reusable handler that wires getAdapter + ingestXlsx + writeIngestRun.
//
// Wave 3 mounts this in routes/talabat.ts + routes/deliveroo.ts:
//   router.post(
//     "/import",
//     authMiddleware,
//     tenantScope,
//     upload.single("file"),
//     makeXlsxImportRoute("TALABAT"),
//   );
//
// Threat T-06-06 (Elevation of privilege): authMiddleware + tenantScope
// + multer are NOT included in the factory itself. The route file MUST
// chain them upstream — that's enforced by the routes/keeta.ts pattern
// and verified in Wave 3's RED tests
// (__tests__/routes/{talabatImport,deliverooImport}.test.ts).

import { Request, RequestHandler, Response } from "express";
import fs from "fs";
import { writeIngestRun } from "./audit";
import { getAdapter } from "./registry";
import type { Platform } from "./types";

export function makeXlsxImportRoute(platform: Platform): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: "Unauthenticated — tenantId missing" });
      return;
    }

    const adapter = getAdapter(platform, { tenantId });
    if (typeof adapter.ingestXlsx !== "function") {
      res
        .status(501)
        .json({ error: `XLSX import not implemented for ${platform}` });
      return;
    }

    const startedAt = new Date();
    let buffer: Buffer;
    try {
      buffer = fs.readFileSync(req.file.path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: `Failed to read uploaded file: ${msg}` });
      return;
    }

    try {
      const result = await adapter.ingestXlsx(tenantId, buffer);
      await writeIngestRun({
        tenantId,
        platform,
        source: "XLSX_IMPORT",
        status: result.errors.length === 0 ? "SUCCESS" : "PARTIAL",
        startedAt,
        finishedAt: new Date(),
        rowsIn: result.rowsIn,
        rowsOk: result.rowsOk,
        errorLog: result.errors.length === 0 ? null : result.errors.join("\n"),
      });
      res.json({ success: true, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await writeIngestRun({
        tenantId,
        platform,
        source: "XLSX_IMPORT",
        status: "FAILED",
        startedAt,
        finishedAt: new Date(),
        rowsIn: 0,
        rowsOk: 0,
        errorLog: msg,
      });
      res.status(400).json({ error: msg });
    }
  };
}
