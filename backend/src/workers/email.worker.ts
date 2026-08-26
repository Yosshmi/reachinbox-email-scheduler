import { Worker } from "bullmq";

import { env } from "../config/env.js";
import { connectDatabase, disconnectDatabase, prisma } from "../db/prisma.js";
import { EMAIL_QUEUE_NAME, type EmailJobData } from "../queues/email.queue.js";
import { redis } from "../redis/redis.js";
import { logger } from "../utils/logger.js";

const workerConnection = redis.duplicate();

const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job) => {
    logger.info("Job received", { jobId: job.id, scheduledEmailId: job.data.scheduledEmailId });

    const scheduledEmail = await prisma.scheduledEmail.findUnique({
      where: { id: job.data.scheduledEmailId },
      select: { id: true, status: true },
    });

    if (!scheduledEmail) throw new Error("Scheduled email record was not found");
    if (scheduledEmail.status === "SENT") {
      logger.info("Already-sent email skipped", { scheduledEmailId: scheduledEmail.id });
      return;
    }

    logger.info("Email job is ready for delivery implementation", {
      scheduledEmailId: scheduledEmail.id,
    });
  },
  {
    connection: workerConnection,
    concurrency: env.WORKER_CONCURRENCY,
  },
);

worker.on("ready", () => {
  logger.info("Worker started", { concurrency: env.WORKER_CONCURRENCY });
});

worker.on("failed", (job, error) => {
  logger.error("Job failed", { jobId: job?.id, error: error.message });
});

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
