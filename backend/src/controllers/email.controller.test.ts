import { describe, expect, it } from "vitest";

import { scheduleSchema } from "../validation/email.schema.js";

const validRequest = {
  senderEmail: "sender@example.com",
  senderDisplayName: "Sender",
  subject: "Test",
  body: "Hello",
  recipients: ["recipient@example.com"],
  startTime: "2026-08-26T12:00:00.000Z",
  delaySeconds: 2,
  hourlyLimit: 200,
};

describe("schedule request validation", () => {
  it("accepts a valid scheduling request", () => {
    expect(scheduleSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects malformed recipients and negative delays", () => {
    expect(scheduleSchema.safeParse({
      ...validRequest,
      recipients: ["not-an-email"],
      delaySeconds: -1,
    }).success).toBe(false);
  });
});
