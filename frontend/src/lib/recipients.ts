const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedRecipients {
  valid: string[];
  invalid: string[];
}

export function parseRecipients(contents: string): ParsedRecipients {
  const values = contents
    .split(/[\s,;]+/)
    .map((value) => value.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
  const unique = [...new Set(values.map((value) => value.toLowerCase()))];

  return {
    valid: unique.filter((value) => EMAIL_PATTERN.test(value)),
    invalid: unique.filter((value) => !EMAIL_PATTERN.test(value)),
  };
}
