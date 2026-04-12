import pino from "pino";

/**
 * Structured logger. In dev we use pino-pretty for human-readable output;
 * in prod/Vercel we emit newline-delimited JSON which downstream log
 * shippers (Datadog, Grafana Loki, BetterStack, etc.) can parse directly.
 */
const isDev = process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  base: { service: "darb-backend" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-api-key"]',
      "password",
      "token",
      "refreshToken",
    ],
    remove: true,
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname" },
      }
    : undefined,
});
