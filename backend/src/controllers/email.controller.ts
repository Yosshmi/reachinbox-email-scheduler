import type { RequestHandler } from "express";

import { createCampaign, listScheduledEmails, listSentEmails } from "../services/campaign.service.js";
import { scheduleSchema } from "../validation/email.schema.js";

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
