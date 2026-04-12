import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Attach a unique request-id to every incoming request. If the caller
 * already provides `x-request-id`, that value is preserved so traces
 * can be stitched across services. The id is echoed back in the
 * response header so clients can quote it in bug reports.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers["x-request-id"];
  const id = typeof existing === "string" && existing.length > 0 ? existing : randomUUID();
  (req as any).id = id;
  res.setHeader("x-request-id", id);
  next();
}
