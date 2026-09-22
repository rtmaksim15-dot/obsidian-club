"use client";

import { useState } from "react";

// Item 1 (2026-09-17): read-only, count + newest first, no actions.
//
// Accept/Hold/Decline (2026-09-22, see DECISIONS.md): each row now
// carries its current status (from the Waitlist row an action lazily
// creates for it — see admin/page.tsx and PATCH
// /api/admin/email-captures/[id]) and, while still decidable, the same
// three actions Zone 1's ApplicationDetail offers, calling that same
// underlying state machine (lib/admin/waitlist-decisions.ts) through
// the new route rather than a copy of it. Kept self-contained (its own
// local state, not lifted into AdminConsole's applications state) since
// this panel has no detail view to sync with — a promoted row is fully
// manageable going forward from the Applications zone too, once it
// exists there as a normal Waitlist row.
export type EmailCaptureRow = {
  id: string;
  email: string;
  createdAt: string;
  waitlistId: string | null;
  status: string; // "new" (no Waitlist row yet) | "pending" | "held" | "approved" | "declined"
  heldReason: string | null;
  heldNote: string | null;
  decisionEmailSentAt: string | null;
  decisionEmailSendError: string | null;
};

const HOLD_REASONS: { value: string; label: string }[] = [
  { value: "order_not_confirmed", label: "Order not confirmed" },
  { value: "age_check_needed", label: "Age check needed" },
  { value: "needs_follow_up", label: "Needs follow-up" },
  { value: "waiting", label: "Waiting" },
];

function holdReasonLabel(value: string | null) {
  return HOLD_REASONS.find((r) => r.value === value)?.label ?? value;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  pending: "New",
  held: "Held",
  approved: "Accepted",
  declined: "Declined",
};

const CONFIRM_MESSAGE: Record<"approve" | "decline", (email: string) => string> = {
  approve: (email) => `Accept ${email}?\n\nThis is final — they will be granted access. We do not reconsider.`,
  decline: (email) => `Decline ${email}?\n\nThis is final — no explanation is sent. We do not reconsider.`,
};

function CaptureRow({ capture, onUpdate }: { capture: EmailCaptureRow; onUpdate: (id: string, patch: Partial<EmailCaptureRow>) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageVerifiedChecked, setAgeVerifiedChecked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [holdNote, setHoldNote] = useState("");

  const canDecide = capture.status === "new" || capture.status === "pending" || capture.status === "held";

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/email-captures/${capture.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      return json as { ok: true; waitlistId: string; status?: string; emailSent?: boolean };
    } finally {
      setPending(false);
    }
  }

  async function review(action: "approve" | "decline") {
    if (!window.confirm(CONFIRM_MESSAGE[action](capture.email))) return;
    try {
      const json = await patch(action === "approve" ? { action, ageVerified: ageVerifiedChecked } : { action });
      onUpdate(capture.id, {
        waitlistId: json.waitlistId,
        status: action === "approve" ? "approved" : "declined",
        decisionEmailSentAt: json.emailSent ? new Date().toISOString() : null,
        decisionEmailSendError: json.emailSent ? null : "Send failed.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function submitHold() {
    if (!holdReason) return;
    try {
      const json = await patch({ action: "hold", heldReason: holdReason, heldNote: holdNote.trim() || undefined });
      onUpdate(capture.id, { waitlistId: json.waitlistId, status: "held", heldReason: holdReason, heldNote: holdNote.trim() || null });
      setHolding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <li className="border-b border-ob-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-caption">{capture.email}</span>{" "}
          <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            — {STATUS_LABEL[capture.status] ?? capture.status}
          </span>
        </div>
        <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
          {formatDate(capture.createdAt)}
        </span>
      </div>

      {capture.status === "held" ? (
        <p className="text-caption mt-1" style={{ color: "var(--color-warning)" }}>
          Held — {holdReasonLabel(capture.heldReason)}
          {capture.heldNote ? `: ${capture.heldNote}` : ""}
        </p>
      ) : null}

      {capture.decisionEmailSendError ? (
        <p className="text-caption mt-1" style={{ color: "var(--color-error)" }}>
          ⚠ Send failed — {capture.decisionEmailSendError}
        </p>
      ) : capture.decisionEmailSentAt ? (
        <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Email sent {formatDate(capture.decisionEmailSentAt)}
        </p>
      ) : null}

      {canDecide ? (
        <div className="mt-2">
          <label className="text-caption flex items-center gap-2">
            <input type="checkbox" checked={ageVerifiedChecked} onChange={(e) => setAgeVerifiedChecked(e.target.checked)} />
            Age verified
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={pending} onClick={() => setHolding(true)}>
              Hold
            </button>
            <button type="button" className="btn-secondary" disabled={pending} onClick={() => review("decline")}>
              Decline
            </button>
            <button type="button" className="btn-primary" disabled={pending} onClick={() => review("approve")}>
              {pending ? "…" : "Accept"}
            </button>
          </div>

          {holding ? (
            <div className="mt-3 border-t border-ob-border pt-3">
              <label className="input-label" htmlFor={`hold-reason-${capture.id}`}>
                Hold reason
              </label>
              <select
                id={`hold-reason-${capture.id}`}
                className="input mt-1"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
              >
                <option value="">Choose a reason…</option>
                {HOLD_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <label className="input-label mt-2 block" htmlFor={`hold-note-${capture.id}`}>
                Note <span className="normal-case">(optional)</span>
              </label>
              <input id={`hold-note-${capture.id}`} className="input mt-1" value={holdNote} onChange={(e) => setHoldNote(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-primary" disabled={!holdReason || pending} onClick={submitHold}>
                  Confirm Hold
                </button>
                <button type="button" className="btn-secondary" onClick={() => setHolding(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </li>
  );
}

export default function EmailCapturesPanel({ captures: initialCaptures, total }: { captures: EmailCaptureRow[]; total: number }) {
  const [captures, setCaptures] = useState(initialCaptures);

  function updateCapture(id: string, patch: Partial<EmailCaptureRow>) {
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <div className="card mb-6">
      <p className="text-label mb-3">
        Email Captures — {total} total{captures.length < total ? `, showing latest ${captures.length}` : ""}
      </p>
      {captures.length === 0 ? (
        <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
          None yet.
        </p>
      ) : (
        <ul>
          {captures.map((c) => (
            <CaptureRow key={c.id} capture={c} onUpdate={updateCapture} />
          ))}
        </ul>
      )}
    </div>
  );
}
