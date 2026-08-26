import { ArrowLeft, CalendarClock, Upload, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/Button";
import { api, getErrorMessage } from "../lib/api";
import { parseRecipients } from "../lib/recipients";
import type { ApiResponse, User } from "../types/api";

function defaultStartTime(): string {
  const date = new Date(Date.now() + 5 * 60_000);
  date.setSeconds(0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ComposePage({ user }: { user: User }) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [startTime, setStartTime] = useState(defaultStartTime());
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    const parsed = parseRecipients(await file.text());
    setRecipients(parsed.valid);
    setInvalidCount(parsed.invalid.length);
    if (parsed.valid.length === 0) toast.error("No valid email addresses were found");
    else toast.success(`${parsed.valid.length} email addresses detected`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (recipients.length === 0) return toast.error("Upload a recipient CSV or text file");
    setSubmitting(true);
    try {
      const { data } = await api.post<ApiResponse<{ campaignId: string; scheduledCount: number }>>("/api/emails/schedule", {
        senderEmail: user.email,
        senderDisplayName: user.name,
        subject,
        body,
        recipients,
        startTime: new Date(startTime).toISOString(),
        delaySeconds,
        hourlyLimit,
      });
      toast.success(`${data.data.scheduledCount} emails scheduled`);
      navigate("/dashboard/scheduled");
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="compose-page">
      <header className="compose-header"><button onClick={() => navigate(-1)}><ArrowLeft size={20} /></button><div><p className="eyebrow">NEW CAMPAIGN</p><h1>Compose new email</h1></div></header>
      <form onSubmit={submit}>
        <section className="compose-card">
          <div className="form-row"><label>From</label><div className="sender-pill">{user.name} &lt;{user.email}&gt;</div></div>
          <div className="form-row recipients-row"><label>To</label><div className="recipient-area">{recipients.slice(0, 4).map((email) => <span key={email}>{email}</span>)}{recipients.length > 4 && <span>+{recipients.length - 4}</span>}{recipients.length === 0 && <span className="placeholder">Upload a CSV or text list</span>}</div><label className="upload-button"><Upload size={16} /> Upload list<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => void handleFile(event.target.files?.[0])} /></label></div>
          {recipients.length > 0 && <div className="recipient-summary"><strong>{recipients.length} valid addresses detected</strong>{invalidCount > 0 && <span>{invalidCount} invalid ignored</span>}<button type="button" onClick={() => { setRecipients([]); setInvalidCount(0); }}><X size={14} /> Clear</button></div>}
          <div className="form-row"><label htmlFor="subject">Subject</label><input id="subject" required maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Campaign subject" /></div>
          <div className="field-block"><label htmlFor="body">Message</label><textarea id="body" required maxLength={100000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your email…" /></div>
        </section>
        <aside className="schedule-card">
          <div className="schedule-title"><CalendarClock size={19} /><div><h2>Send later</h2><p>Choose when and how fast to send.</p></div></div>
          <label>Start time<input type="datetime-local" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          <div className="field-grid"><label>Delay between emails<input type="number" min="0" max="3600" required value={delaySeconds} onChange={(event) => setDelaySeconds(Number(event.target.value))} /><small>seconds</small></label><label>Hourly limit<input type="number" min="1" max="10000" required value={hourlyLimit} onChange={(event) => setHourlyLimit(Number(event.target.value))} /><small>emails/hour</small></label></div>
          <div className="schedule-summary"><span>Recipients</span><strong>{recipients.length}</strong></div>
          <Button type="submit" disabled={submitting}>{submitting ? "Scheduling…" : "Schedule campaign"}</Button>
        </aside>
      </form>
    </main>
  );
}
