import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { EmailTable, type EmailRow } from "../components/EmailTable";
import { api, getErrorMessage } from "../lib/api";
import type { ApiResponse, ScheduledEmail, SentEmail } from "../types/api";

export function DashboardPage() {
  const mode = useLocation().pathname.endsWith("/sent") ? "sent" : "scheduled";
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (mode === "scheduled") {
        const { data } = await api.get<ApiResponse<ScheduledEmail[]>>("/api/emails/scheduled");
        setRows(data.data.map((email) => ({ ...email, time: email.scheduledAt })));
      } else {
        const { data } = await api.get<ApiResponse<SentEmail[]>>("/api/emails/sent");
        setRows(data.data.map((email) => ({ ...email, time: email.sentAt ?? email.failedAt })));
      }
    } catch (loadError) { setError(getErrorMessage(loadError)); }
    finally { setLoading(false); }
  }, [mode]);

  useEffect(() => { void load(); }, [load]);
  const filtered = rows.filter((row) => `${row.recipient} ${row.subject}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="dashboard-page">
      <header className="page-header">
        <div><p className="eyebrow">CAMPAIGNS</p><h1>{mode === "sent" ? "Sent emails" : "Scheduled emails"}</h1><p>Monitor campaign delivery from one place.</p></div>
        <button className="icon-button" onClick={() => void load()} aria-label="Refresh"><RefreshCw size={18} /></button>
      </header>
      <div className="toolbar"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recipient or subject" /></div>
      {loading ? <div className="loading-state"><span className="spinner" /> Loading emails…</div> : error ? <div className="error-state"><strong>Could not load emails</strong><p>{error}</p><button onClick={() => void load()}>Try again</button></div> : <EmailTable rows={filtered} mode={mode} />}
    </section>
  );
}
