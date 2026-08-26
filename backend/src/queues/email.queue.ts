import { Queue } from "bullmq";

import { redis } from "../redis/redis.js";

export const EMAIL_QUEUE_NAME = "email-delivery";

export interface EmailJobData {
  scheduledEmailId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 1_000,
    removeOnFail: 5_000,
  },
});

export async function closeEmailQueue(): Promise<void> {
  await emailQueue.close();
}
