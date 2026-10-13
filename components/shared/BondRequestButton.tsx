"use client";

import { useState } from "react";

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "partner", label: "Partner" },
  { value: "dominant_of", label: "I am dominant of them" },
  { value: "submissive_of", label: "I am submissive to them" },
];

// Profile lite, B3/B5 (Package 4, Phase B, 2026-10-13, see
// DECISIONS.md) — shown on another member's profile when there's no
// existing bond (pending or active) between the viewer and that
// member.
export default function BondRequestButton({ toUserId }: { toUserId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(KIND_OPTIONS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bonds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId, kind }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not send.");
        return;
      }
      setSent(true);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
        Bond request sent.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        Request a bond
      </button>
    );
  }

  return (
    <div>
      <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
        {KIND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={send}>
          {busy ? "…" : "Send"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
