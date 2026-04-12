import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { Sentry } from "../config/sentry";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req as any).id;
  if (err instanceof AppError) {
    logger.warn({ requestId, err: err.message, status: err.statusCode, path: req.path });
    res.status(err.statusCode).json({ error: err.message, requestId });
    return;
  }

  logger.error({ requestId, err, path: req.path, method: req.method }, "unhandled error");
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { tags: { path: req.path, method: req.method }, extra: { requestId } });
  }
  res.status(500).json({ error: "Internal server error", requestId });
}
