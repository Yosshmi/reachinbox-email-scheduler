import { prisma } from "../db/prisma.js";
import { emailQueue } from "../queues/email.queue.js";
import { logger } from "../utils/logger.js";
import { queueDelay } from "./schedule.service.js";

export async function reconcileScheduledJobs(): Promise<void> {
  const pending = await prisma.scheduledEmail.findMany({
    where: { status: "SCHEDULED", bullJobId: { not: null } },
    select: { id: true, bullJobId: true, scheduledAt: true },
  });
  let restored = 0;

  for (const email of pending) {
    const jobId = email.bullJobId!;
    if (await emailQueue.getJob(jobId)) continue;
    await emailQueue.add("send-email", { scheduledEmailId: email.id }, {
      jobId,
      delay: queueDelay(email.scheduledAt),
    });
    restored += 1;
  }

  logger.info("Scheduled-job reconciliation complete", { pending: pending.length, restored });
}
