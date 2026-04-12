import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../config";
import { logger } from "../config/logger";
import { env } from "../config/env";
import { NOTIFICATION_QUEUE, NotificationJobData } from "./notificationQueue";
import { sendWhatsApp, sendSms, sendEmail } from "../services/notificationChannels";

/**
 * BullMQ worker that processes notification jobs and persists delivery
 * status transitions on the NotificationDelivery row. Boot separately via
 * `npm run worker:notifications` (see package.json script). Multiple
 * worker processes can run in parallel — BullMQ handles locking per job.
 */

async function processJob(job: Job<NotificationJobData>) {
  const { deliveryId, channel, recipient, subject, body } = job.data;

  await prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "SENDING",
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });

  let result;
  if (channel === "WHATSAPP") result = await sendWhatsApp(recipient, body);
  else if (channel === "SMS") result = await sendSms(recipient, body);
  else result = await sendEmail(recipient, subject || "Darb notification", body);

  if (result.ok) {
    await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: "SENT", provider: result.provider, sentAt: new Date(), error: null },
    });
    return;
  }

  // Mark failed — BullMQ will retry up to `attempts`. On final failure the
  // attemptsMade equals the job's max attempts and we flip to DEAD.
  const isFinal = job.attemptsMade + 1 >= (job.opts.attempts || 1);
  await prisma.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: isFinal ? "DEAD" : "FAILED",
      provider: result.provider,
      error: result.error || "unknown",
    },
  });
  throw new Error(result.error || "channel failed");
}

export function startNotificationWorker(): Worker<NotificationJobData> | null {
  if (!env.REDIS_URL || env.REDIS_URL === "redis://localhost:6379") {
    logger.warn("notification worker not started — REDIS_URL missing");
    return null;
  }
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const worker = new Worker<NotificationJobData>(NOTIFICATION_QUEUE, processJob, {
    connection,
    concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || "5"),
  });

  worker.on("completed", (job) => logger.debug({ jobId: job.id }, "notification sent"));
  worker.on("failed", (job, err) => logger.warn({ jobId: job?.id, err: err.message }, "notification failed"));
  worker.on("error", (err) => logger.error({ err }, "notification worker error"));

  logger.info("notification worker started");
  return worker;
}

// Allow running `tsx src/queues/notificationWorker.ts` as a standalone process
if (require.main === module) {
  startNotificationWorker();
}
