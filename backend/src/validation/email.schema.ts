import { z } from "zod";

export const scheduleSchema = z.object({
  senderEmail: z.email(),
  senderDisplayName: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(100_000),
  recipients: z.array(z.email()).min(1).max(5_000),
  startTime: z.iso.datetime({ offset: true }),
  delaySeconds: z.number().int().nonnegative().max(3_600),
  hourlyLimit: z.number().int().positive().max(10_000),
});
