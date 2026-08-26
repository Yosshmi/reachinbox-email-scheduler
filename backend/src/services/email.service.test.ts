import { describe, expect, it } from "vitest";

import { shouldSkipDelivery } from "./email.service.js";

describe("idempotent delivery guard", () => {
  it("skips records that are already sent", () => {
    expect(shouldSkipDelivery("SENT")).toBe(true);
  });

  it("allows pending records to be processed", () => {
    expect(shouldSkipDelivery("SCHEDULED")).toBe(false);
  });
});
