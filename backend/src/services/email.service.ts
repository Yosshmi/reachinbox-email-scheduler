import nodemailer from "nodemailer";
import type { EmailStatus } from "@prisma/client";

import { env } from "../config/env.js";

export interface SendEmailInput {
  from: { email: string; name: string };
  to: string;
  subject: string;
  body: string;
}

export function shouldSkipDelivery(status: EmailStatus): boolean {
  return status === "SENT";
}

export async function sendEmail(input: SendEmailInput): Promise<{
  messageId: string;
  previewUrl: string | null;
}> {
  if (!env.ETHEREAL_USER || !env.ETHEREAL_PASSWORD) {
    throw new Error("Ethereal SMTP credentials are not configured");
  }

  const transport = nodemailer.createTransport({
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    secure: env.ETHEREAL_PORT === 465,
    auth: {
      user: env.ETHEREAL_USER,
      pass: env.ETHEREAL_PASSWORD,
    },
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  const result = await transport.sendMail({
    from: { address: input.from.email, name: input.from.name },
    to: input.to,
    subject: input.subject,
    text: input.body,
  });

  const preview = nodemailer.getTestMessageUrl(result);
  return { messageId: result.messageId, previewUrl: preview || null };
}
