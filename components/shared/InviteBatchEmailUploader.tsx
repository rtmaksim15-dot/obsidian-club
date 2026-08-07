"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "uploading" | "error";
type Summary = { sent: number; failed: number; invalidRowsSkipped: number };

// Admin-triggered CSV upload for an email-channel invite batch (Batch
// Channels + Email Infra, 2026-08-07) — pairs each (email, name) row
// with an unused token in the batch and sends the invitation email.
// No open self-serve sending exists anywhere in this app.
export default function InviteBatchEmailUploader({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a CSV file first.");
      return;
    }

    setStatus("uploading");
    setError(null);
    setSummary(null);

    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/admin/invite-batches/${batchId}/send-emails`, { method: "POST", body });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(result?.error ?? "Could not send invitations.");
        return;
      }
      setStatus("idle");
      setSummary({ sent: result.sent, failed: result.failed, invalidRowsSkipped: result.invalidRowsSkipped });
      form.reset();
      router.refresh();
    } catch {
      setStatus("error");
      setError("Could not send invitations.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3" noValidate>
      <div>
        <label htmlFor="file" className="input-label">
          Upload CSV (email, name)
        </label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" className="input" required />
      </div>
      <button type="submit" className="btn-primary" disabled={status === "uploading"}>
        {status === "uploading" ? "Sending…" : "Send Invitations"}
      </button>
      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
      {summary ? (
        <p className="text-caption" style={{ color: "var(--color-success)" }}>
          Sent {summary.sent}, failed {summary.failed}
          {summary.invalidRowsSkipped > 0 ? `, skipped ${summary.invalidRowsSkipped} invalid row(s)` : ""}.
        </p>
      ) : null}
    </form>
  );
}
