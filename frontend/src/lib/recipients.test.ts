import { describe, expect, it } from "vitest";

import { parseRecipients } from "./recipients";

describe("parseRecipients", () => {
  it("extracts, normalizes, and deduplicates CSV and whitespace-separated addresses", () => {
    expect(parseRecipients("Alice@example.com, bob@example.com\nALICE@example.com")).toEqual({
      valid: ["alice@example.com", "bob@example.com"],
      invalid: [],
    });
  });

  it("reports malformed values separately", () => {
    expect(parseRecipients("valid@example.com,not-an-email")).toEqual({
      valid: ["valid@example.com"],
      invalid: ["not-an-email"],
    });
  });
});
