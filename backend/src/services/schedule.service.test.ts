import { describe, expect, it } from "vitest";

import { calculateScheduledAt, queueDelay } from "./schedule.service.js";

describe("schedule calculations", () => {
  it("spaces recipients from the campaign start time", () => {
    const start = new Date("2026-08-26T10:00:00.000Z");
    expect(calculateScheduledAt(start, 2, 3).toISOString()).toBe("2026-08-26T10:00:06.000Z");
  });

  it("never produces a negative BullMQ delay", () => {
    expect(queueDelay(new Date(1_000), new Date(2_000))).toBe(0);
  });
});
