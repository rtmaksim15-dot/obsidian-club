"use client";

import { useState } from "react";

// Profile lite, B4/B5 (Package 4, Phase B, 2026-10-13, see
// DECISIONS.md) — "Private note — only you see this." Shown on
// someone else's profile; saved per (author, subject) pair.
export default function PrivateNoteEditor({ subjectId, initialBody }: { subjectId: string; initialBody: string | null }) {
  const [body, setBody] = useState(initialBody ?? "");
  const [saved, setSaved] = useState(initialBody ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile/notes/${subjectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Could not save.");
        return;
      }
      setSaved(body);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-10 border-t border-ob-border pt-4">
      <p className="text-label mb-1">Private note — only you see this.</p>
      <textarea
        className="input mt-2"
        rows={3}
        maxLength={500}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="A note for yourself about this member"
      />
      {error ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className="btn-secondary" disabled={pending || body === saved} onClick={save}>
          {pending ? "…" : "Save note"}
        </button>
        <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
          {body.length}/500
        </span>
      </div>
    </div>
  );
}
