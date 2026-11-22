"use client";

import { useEffect, useState } from "react";

type Props = {
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  // Typed-confirmation (2026-11-22, see DECISIONS.md) — for an action
  // destructive enough that a plain Confirm/Cancel click isn't enough
  // friction (account deletion). When set, Confirm stays disabled
  // until the admin types this exact string into the field shown
  // below the title.
  requireTypedText?: string;
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
export default function ConfirmDialog({ title, confirmLabel, onConfirm, onCancel, busy, requireTypedText }: Props) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const confirmDisabled = busy || (requireTypedText !== undefined && typed !== requireTypedText);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-ob bg-ob-black p-6" style={{ border: "1px solid var(--color-border)" }}>
        {/* whitespace-pre-line (PWA hardening, Package 3, 2026-10-11,
            see DECISIONS.md): a few admin confirms (e.g. ApplicationDetail's
            approve/decline) pass a two-line message with a literal "\n\n" —
            this renders that line break; a plain one-line title is unaffected. */}
        <p className="text-body whitespace-pre-line">{title}</p>
        {requireTypedText !== undefined ? (
          <div className="mt-4">
            <label className="input-label" htmlFor="confirm-dialog-typed">
              Type &ldquo;{requireTypedText}&rdquo; to confirm
            </label>
            <input
              id="confirm-dialog-typed"
              className="input mt-1 w-full"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={confirmDisabled}>
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
