import type { RequestHandler } from "express";
import { z } from "zod";

import { createCampaign, listScheduledEmails, listSentEmails } from "../services/campaign.service.js";

const scheduleSchema = z.object({
  senderEmail: z.email(),
  senderDisplayName: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(100_000),
  recipients: z.array(z.email()).min(1).max(5_000),
  startTime: z.iso.datetime({ offset: true }),
  delaySeconds: z.number().int().nonnegative().max(3_600),
  hourlyLimit: z.number().int().positive().max(10_000),
});

export const scheduleEmails: RequestHandler = async (req, res, next) => {
  try {
    const parsed = scheduleSchema.parse(req.body);
    const recipients = [...new Set(parsed.recipients.map((email) => email.toLowerCase()))];
    const result = await createCampaign({
      ...parsed,
      recipients,
      startTime: new Date(parsed.startTime),
      userId: req.user!.id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getScheduledEmails: RequestHandler = async (req, res, next) => {
  try {
    res.json({ success: true, data: await listScheduledEmails(req.user!.id) });
  } catch (error) {
    next(error);
  }
};

export const getSentEmails: RequestHandler = async (req, res, next) => {
  try {
    res.json({ success: true, data: await listSentEmails(req.user!.id) });
  } catch (error) {
    next(error);
  }
};
