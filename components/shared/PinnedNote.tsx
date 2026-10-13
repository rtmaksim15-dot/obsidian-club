"use client";

import { useState } from "react";

type Props = {
  roomId: string;
  initialNote: string | null;
  isAdmin: boolean;
};

// Clean Hall, B4 (Package 5, Phase B, 2026-10-14, see DECISIONS.md) —
// a pinned note at the top of a room's chat, styled as a Lord Obsidian
// note (not a Message row, no author line, no reply affordance — just
// a quiet standalone block). Admin-only edit, inline here rather than
// in the admin console, so an admin can see exactly what members see
// while changing it.
export default function PinnedNote({ roomId, initialNote, isAdmin }: Props) {
  const [note, setNote] = useState(initialNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/pinned-note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedNote: draft }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not save.");
        return;
      }
      setNote(body.pinnedNote);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (!note && !isAdmin) return null;

  return (
    <div className="shrink-0 border-b border-ob-border px-6 py-4" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
      {editing ? (
        <div>
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Leave empty to unpin"
          />
          {error ? (
            <p className="text-caption mt-1" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-secondary" disabled={busy} onClick={save}>
              {busy ? "…" : "Save"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => {
                setDraft(note ?? "");
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          {note ? (
            <p className="text-body !text-sm italic" style={{ color: "var(--color-gold)" }}>
              {note}
            </p>
          ) : (
            <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
              Nothing pinned.
            </p>
          )}
          {isAdmin ? (
            <button
              type="button"
              className="text-caption nav-control shrink-0"
              style={{ color: "var(--color-text-muted)" }}
              onClick={() => setEditing(true)}
            >
              Edit pinned word
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
