import type { EmailStatus } from "../types/api";

export function StatusBadge({ status }: { status: EmailStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}
