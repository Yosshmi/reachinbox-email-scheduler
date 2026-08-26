import { Inbox } from "lucide-react";

import type { EmailStatus } from "../types/api";
import { StatusBadge } from "./StatusBadge";

export interface EmailRow {
  id: string;
  recipient: string;
  subject: string;
  time: string | null;
  status: EmailStatus;
  errorMessage?: string | null;
}

export function EmailTable({ rows, mode }: { rows: EmailRow[]; mode: "scheduled" | "sent" }) {
  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><Inbox size={22} /></span>
        <h3>No {mode} emails</h3>
        <p>{mode === "scheduled" ? "Schedule a campaign to see it here." : "Delivered emails will appear here."}</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Recipient</th><th>Subject</th><th>{mode === "sent" ? "Sent time" : "Scheduled time"}</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.recipient}</td>
              <td><span className="subject-cell">{row.subject}</span>{row.errorMessage && <small>{row.errorMessage}</small>}</td>
              <td>{row.time ? new Date(row.time).toLocaleString() : "—"}</td>
              <td><StatusBadge status={row.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
