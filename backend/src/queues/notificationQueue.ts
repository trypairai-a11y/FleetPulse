import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { logger } from "../config/logger";
import { env } from "../config/env";

/**
 * BullMQ notification queue. Gated on REDIS_URL so the backend still boots
 * without Redis — the enqueue() helper falls back to synchronous dispatch
 * in that mode so nothing is silently dropped in dev.
 */

export type NotificationJobData = {
  deliveryId: string; // NotificationDelivery row id
  channel: "WHATSAPP" | "EMAIL" | "SMS";
  recipient: string;
  subject?: string;
  body: string;
  tenantId: string;
};

export const NOTIFICATION_QUEUE = "notifications";

let queue: Queue<NotificationJobData> | null = null;
let queueEvents: QueueEvents | null = null;

function hasRedis(): boolean {
  return !!env.REDIS_URL && env.REDIS_URL !== "redis://localhost:6379";
}

export function getNotificationQueue(): Queue<NotificationJobData> | null {
  if (!hasRedis()) return null;
  if (queue) return queue;
  try {
    const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    queue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE, { connection });
    queueEvents = new QueueEvents(NOTIFICATION_QUEUE, { connection });
    queueEvents.on("failed", ({ jobId, failedReason }) => {
      logger.warn({ jobId, failedReason }, "notification job failed");
    });
    logger.info({ queue: NOTIFICATION_QUEUE }, "notification queue ready");
    return queue;
  } catch (e) {
    logger.error({ err: e }, "failed to init notification queue");
    return null;
  }
}

/**
 * Enqueue a notification job with an idempotency key so duplicates (same
 * tenant + recipient + type + day) coalesce into a single send.
 */
export async function enqueueNotification(
  data: NotificationJobData,
  idempotencyKey: string
): Promise<"queued" | "fallback"> {
  const q = getNotificationQueue();
  if (!q) return "fallback";
  await q.add("dispatch", data, {
    jobId: idempotencyKey,
    attempts: 5,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
  return "queued";
}
