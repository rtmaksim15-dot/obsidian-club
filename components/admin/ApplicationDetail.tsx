"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { Application } from "./AdminConsole";

export type ApplicationDetailHandle = {
  approve: () => void;
  hold: () => void;
  decline: () => void;
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

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

const CONFIRM_MESSAGE: Record<"approve" | "decline", (name: string) => string> = {
  approve: (name) => `Approve ${name}'s application?\n\nThis is final — they will be granted access. We do not reconsider.`,
  decline: (name) => `Decline ${name}'s application?\n\nThis is final — no explanation is sent. We do not reconsider.`,
};

// Zone 1 full depth (2026-09-10, see DECISIONS.md). Ports ApplicationsQueue.tsx's
// interaction logic (same API contract, same PATCH /api/admin/
// applications/[id], untouched) into a single-application detail-panel
// shape. Reviewer/hold state shown here is CURRENT state, not a
// timeline — the schema only ever keeps the last value (see the
// research note in AdminConsole.tsx) — so this deliberately doesn't
// present itself as a history.
// Keyboard shortcuts (2026-09-11, see DECISIONS.md): A/H/D only apply
// in the Applications zone, only while a still-decidable (pending/held)
// application's panel is open -- AdminConsole's global keydown handler
// calls these through a ref rather than duplicating the action logic,
// so there's exactly one implementation of approve/hold/decline
// (including their confirm dialogs, unchanged) whether triggered by
// click or by key. "Hold" opens the reason picker, same as clicking the
// button -- a keyboard shortcut skipping the required reason selection
// would be a real behavior change, not an accelerator.
const ApplicationDetail = forwardRef<ApplicationDetailHandle, {
  application: Application;
  onUpdate: (id: string, patch: Partial<Application>) => void;
  onClose: () => void;
}>(function ApplicationDetail({ application, onUpdate, onClose }, ref) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageVerifiedChecked, setAgeVerifiedChecked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [holdNote, setHoldNote] = useState("");

  const a = application;
  const name = a.name || a.email;
  const canDecide = a.status === "pending" || a.status === "held";

  useImperativeHandle(ref, () => ({
    approve: () => {
      if (canDecide && !pending) review("approve");
    },
    hold: () => {
      if (canDecide && !pending) setHolding(true);
    },
    decline: () => {
      if (canDecide && !pending) review("decline");
    },
  }));

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/applications/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      return json as { ok: true; status?: string; emailSent?: boolean };
    } finally {
      setPending(false);
    }
  }

  async function review(action: "approve" | "decline") {
    if (!window.confirm(CONFIRM_MESSAGE[action](name))) return;
    try {
      const now = new Date().toISOString();
      const body = action === "approve" ? { action, ageVerified: ageVerifiedChecked } : { action };
      const json = await patch(body);
      onUpdate(a.id, {
        status: action === "approve" ? "approved" : "declined",
        reviewedAt: now,
        decisionEmailSentAt: json.emailSent ? now : null,
        decisionEmailSendError: json.emailSent ? null : "Send failed.",
        ...(action === "approve" ? { ageVerified: ageVerifiedChecked, hasToken: true } : {}),
      });
      if (action === "decline") onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function submitHold() {
    if (!holdReason) return;
    try {
      await patch({ action: "hold", heldReason: holdReason, heldNote: holdNote.trim() || undefined });
      onUpdate(a.id, {
        status: "held",
        heldReason: holdReason,
        heldNote: holdNote.trim() || null,
        reviewedAt: new Date().toISOString(),
      });
      setHolding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function resend() {
    try {
      const now = new Date().toISOString();
      const json = await patch({ action: "resend" });
      onUpdate(a.id, {
        decisionEmailSentAt: json.emailSent ? now : null,
        decisionEmailSendError: json.emailSent ? null : "Send failed.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <p className="text-h2 !text-base">{a.name || "(no name given)"}</p>
      <p className="text-data mt-1">{a.email}</p>
      <p className="text-caption mt-3" style={{ color: "var(--color-text-secondary)" }}>
        {[a.age ? `${a.age} yrs` : null, a.city, a.source, a.referralCode ? `code: ${a.referralCode}` : null, a.origin]
          .filter(Boolean)
          .join(" · ") || "No additional details."}
      </p>
      {a.reason ? <p className="text-body mt-4 !text-base italic">&ldquo;{a.reason}&rdquo;</p> : null}
      <p className="text-caption mt-3">Applied {formatDate(a.createdAt)}</p>

      <div className="mt-6 border-t border-ob-border pt-4">
        <p className="text-label mb-2">Status</p>
        <p className="text-data capitalize">{a.status}</p>
        {a.status === "held" ? (
          <p className="text-caption mt-1" style={{ color: "var(--color-warning)" }}>
            Held — {holdReasonLabel(a.heldReason)}
            {a.heldNote ? `: ${a.heldNote}` : ""}
          </p>
        ) : null}
        {a.reviewedAt ? (
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            Last reviewed {formatDate(a.reviewedAt)}
            {a.reviewerName ? ` by ${a.reviewerName}` : ""}
          </p>
        ) : null}
        {a.status === "approved" ? (
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            Age verified at approval: {a.ageVerified ? `yes (${formatDate(a.ageVerifiedAt)})` : "no"}
          </p>
        ) : null}
      </div>

      {(a.status === "approved" || a.decisionEmailSendError) && a.hasToken ? (
        <div className="mt-6 border-t border-ob-border pt-4">
          <p className="text-label mb-2">Invitation Email</p>
          {a.decisionEmailSendError ? (
            <p className="text-body !text-base font-semibold" style={{ color: "var(--color-error)" }}>
              ⚠ Send failed — {a.decisionEmailSendError}
            </p>
          ) : (
            <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
              Sent {formatDate(a.decisionEmailSentAt)}
            </p>
          )}
          <button type="button" className="btn-secondary mt-3" disabled={pending} onClick={resend}>
            {pending ? "…" : "Resend"}
          </button>
        </div>
      ) : null}

      {canDecide ? (
        <div className="mt-6 border-t border-ob-border pt-4">
          <label className="text-caption flex items-center gap-2">
            <input
              type="checkbox"
              checked={ageVerifiedChecked}
              onChange={(e) => setAgeVerifiedChecked(e.target.checked)}
            />
            Age verified
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary" disabled={pending} onClick={() => setHolding(true)}>
              Hold
            </button>
            <button className="btn-secondary" disabled={pending} onClick={() => review("decline")}>
              Decline
            </button>
            <button className="btn-primary" disabled={pending} onClick={() => review("approve")}>
              {pending ? "…" : "Approve"}
            </button>
          </div>

          {holding ? (
            <div className="mt-4 border-t border-ob-border pt-4">
              <label className="input-label" htmlFor="hold-reason">
                Hold reason
              </label>
              <select
                id="hold-reason"
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
              <label className="input-label mt-3 block" htmlFor="hold-note">
                Note <span className="normal-case">(optional)</span>
              </label>
              <input id="hold-note" className="input mt-1" value={holdNote} onChange={(e) => setHoldNote(e.target.value)} />
              <div className="mt-3 flex gap-2">
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
        <p className="text-caption mt-4" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default ApplicationDetail;
