import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { disconnectRedis, redis } from "../redis/redis.js";
import { reserveSendSlot } from "./rate-limit.service.js";

describe("distributed hourly rate limiter", () => {
  const senderId = `test-${randomUUID()}`;
  const now = new Date();
  const hourKey = now.toISOString().slice(0, 13);

  afterAll(async () => {
    await redis.del(`email-rate:${senderId}:${hourKey}`, `email-spacing:${senderId}`);
    await disconnectRedis();
  });

  it("allows capacity atomically and defers overflow to the next UTC hour", async () => {
    const first = await reserveSendSlot({
      senderId,
      campaignHourlyLimit: 1,
      campaignDelayMs: 0,
      now,
    });
    const second = await reserveSendSlot({
      senderId,
      campaignHourlyLimit: 1,
      campaignDelayMs: 0,
      now,
    });

    expect(first).toEqual({ allowed: true });
    expect(second.allowed).toBe(false);
    if (!second.allowed) {
      expect(second.retryAt.getUTCMinutes()).toBe(0);
      expect(second.retryAt.getUTCSeconds()).toBe(0);
      expect(second.retryAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });
});
