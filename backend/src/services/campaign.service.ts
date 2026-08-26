import { randomUUID } from "node:crypto";

import { prisma } from "../db/prisma.js";
import { emailQueue } from "../queues/email.queue.js";
import { calculateScheduledAt, queueDelay } from "./schedule.service.js";

export interface CreateCampaignInput {
  userId: string;
  senderEmail: string;
  senderDisplayName: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delaySeconds: number;
  hourlyLimit: number;
}

export async function createCampaign(input: CreateCampaignInput) {
  const created = await prisma.$transaction(async (tx) => {
    const sender = await tx.sender.upsert({
      where: { userId_email: { userId: input.userId, email: input.senderEmail } },
      update: { displayName: input.senderDisplayName },
      create: {
        userId: input.userId,
        email: input.senderEmail,
        displayName: input.senderDisplayName,
      },
    });

    const campaign = await tx.campaign.create({
      data: {
        userId: input.userId,
        subject: input.subject,
        body: input.body,
        startTime: input.startTime,
        delaySeconds: input.delaySeconds,
        hourlyLimit: input.hourlyLimit,
      },
    });

    const emails: Array<{
      id: string;
      campaignId: string;
      senderId: string;
      recipient: string;
      subject: string;
      body: string;
      scheduledAt: Date;
      bullJobId: string;
      idempotencyKey: string;
    }> = input.recipients.map(
      (recipient, index) => {
        const id = randomUUID();
        return {
          id,
          campaignId: campaign.id,
          senderId: sender.id,
          recipient,
          subject: input.subject,
          body: input.body,
          scheduledAt: calculateScheduledAt(input.startTime, index, input.delaySeconds),
          bullJobId: id,
          idempotencyKey: `${campaign.id}:${recipient.toLowerCase()}:${index}`,
        };
      },
    );

    await tx.scheduledEmail.createMany({ data: emails });
    return { campaign, emails };
  });

  await emailQueue.addBulk(
    created.emails.map((email) => ({
      name: "send-email",
      data: { scheduledEmailId: email.id },
      opts: {
        jobId: email.id,
        delay: queueDelay(email.scheduledAt),
      },
    })),
  );

  return { campaignId: created.campaign.id, scheduledCount: created.emails.length };
}

export async function listScheduledEmails(userId: string) {
  return prisma.scheduledEmail.findMany({
    where: {
      campaign: { userId },
      status: { in: ["SCHEDULED", "PROCESSING"] },
    },
    select: {
      id: true,
      recipient: true,
      subject: true,
      scheduledAt: true,
      status: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function listSentEmails(userId: string) {
  return prisma.scheduledEmail.findMany({
    where: { campaign: { userId }, status: { in: ["SENT", "FAILED"] } },
    select: {
      id: true,
      recipient: true,
      subject: true,
      sentAt: true,
      failedAt: true,
      status: true,
      errorMessage: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}
