"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

/**
 * Minimal "are you sure" dialog (2026-09-30, see DECISIONS.md) — every
 * button looks the same now (one red outline style, no color/weight
 * distinction between an ordinary action and a dangerous one), so the
 * "this is irreversible" signal moved here instead: delete a post,
 * block a member, revoke an invite, sign out, close an account all go
 * through this first. Replaces the native `window.confirm()`/`confirm()`
 * this app leaned on for exactly these five actions — same close
 * affordances (Escape, backdrop click) as `ReportModal.tsx`, and
 * deliberately no more text than the question itself.
 */
export default function ConfirmDialog({ title, confirmLabel, onConfirm, onCancel, busy }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-ob bg-ob-black p-6" style={{ border: "1px solid var(--color-border)" }}>
        <p className="text-body">{title}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
