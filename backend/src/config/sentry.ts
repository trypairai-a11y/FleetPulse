import * as Sentry from "@sentry/node";
import { logger } from "./logger";

/**
 * Initialise Sentry once at boot. Gated on SENTRY_DSN so local dev and CI
 * stay quiet. Call this BEFORE importing any route modules so Sentry can
 * auto-instrument Express.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info({ msg: "sentry disabled (SENTRY_DSN not set)" });
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    sendDefaultPii: false,
  });
  logger.info({ msg: "sentry initialised", env: process.env.NODE_ENV });
}

export { Sentry };
