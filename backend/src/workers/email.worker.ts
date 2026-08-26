import { DelayedError, Worker } from "bullmq";

import { env } from "../config/env.js";
import { connectDatabase, disconnectDatabase, prisma } from "../db/prisma.js";
import { EMAIL_QUEUE_NAME, type EmailJobData } from "../queues/email.queue.js";
import { redis } from "../redis/redis.js";
import { sendEmail } from "../services/email.service.js";
import { reserveSendSlot } from "../services/rate-limit.service.js";
import { logger } from "../utils/logger.js";

const workerConnection = redis.duplicate();

const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job) => {
    const { scheduledEmailId } = job.data;
    logger.info("Job received", { jobId: job.id, scheduledEmailId });

    const email = await prisma.scheduledEmail.findUnique({
      where: { id: scheduledEmailId },
      include: { campaign: true, sender: true },
    });

    if (!email) throw new Error("Scheduled email record was not found");
    if (email.status === "SENT") {
      logger.info("Already-sent email skipped", { scheduledEmailId });
      return;
    }

    const slot = await reserveSendSlot({
      senderId: email.senderId,
      campaignHourlyLimit: email.campaign.hourlyLimit,
      campaignDelayMs: email.campaign.delaySeconds * 1_000,
    });

    if (!slot.allowed) {
      await prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: { status: "SCHEDULED", scheduledAt: slot.retryAt },
      });
      logger.info("Rate or spacing limit reached; job rescheduled", {
        scheduledEmailId,
        retryAt: slot.retryAt.toISOString(),
      });
      await job.moveToDelayed(slot.retryAt.getTime(), job.token);
      throw new DelayedError();
    }

    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: { status: "PROCESSING", attempts: { increment: 1 }, errorMessage: null },
    });

    try {
      const result = await sendEmail({
        from: { email: email.sender.email, name: email.sender.displayName },
        to: email.recipient,
        subject: email.subject,
        body: email.body,
      });
      await prisma.scheduledEmail.updateMany({
        where: { id: scheduledEmailId, status: { not: "SENT" } },
        data: { status: "SENT", sentAt: new Date(), failedAt: null, errorMessage: null },
      });
      logger.info("Email sent", {
        scheduledEmailId,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const maxAttempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
      await prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: isFinalAttempt
          ? { status: "FAILED", failedAt: new Date(), errorMessage: message }
          : { status: "SCHEDULED", errorMessage: message },
      });
      throw error;
    }
  },
  { connection: workerConnection, concurrency: env.WORKER_CONCURRENCY },
);

worker.on("ready", () => logger.info("Worker started", { concurrency: env.WORKER_CONCURRENCY }));
worker.on("failed", (job, error) => {
  logger.error("Job failed", { jobId: job?.id, error: error.message });
});
worker.on("error", (error) => logger.error("Worker error", { error: error.message }));

async function shutdown(signal: string): Promise<void> {
  logger.info("Worker shutdown signal received", { signal });
  await worker.close();
  await Promise.all([disconnectDatabase(), workerConnection.quit(), redis.quit()]);
  logger.info("Worker stopped");
}

process.on("SIGINT", () => void shutdown("SIGINT").then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown("SIGTERM").then(() => process.exit(0)));

connectDatabase().catch((error: unknown) => {
  logger.error("Worker startup failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
