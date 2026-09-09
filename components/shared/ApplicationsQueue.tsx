"use client";

import { useState } from "react";

type Application = {
  id: string;
  name: string | null;
  email: string;
  age: number | null;
  city: string | null;
  source: string | null;
  reason: string | null;
  referralCode: string | null;
  createdAt: string;
  status: string;
  heldReason: string | null;
  heldNote: string | null;
};

const HOLD_REASONS: { value: string; label: string }[] = [
  { value: "order_not_confirmed", label: "Order not confirmed" },
  { value: "age_check_needed", label: "Age check needed" },
  { value: "needs_follow_up", label: "Needs follow-up" },
  { value: "waiting", label: "Waiting" },
];

// toLocaleDateString() with no fixed locale/timeZone renders differently
// on the server (container locale) vs. the browser (visitor locale),
// which React flags as a hydration mismatch and then throws away the
// server-rendered HTML to re-render from scratch. Pin both to the same
// locale/UTC so server and client always agree.
function formatAppliedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC" });
}

function holdReasonLabel(value: string | null) {
  return HOLD_REASONS.find((r) => r.value === value)?.label ?? value;
}

const CONFIRM_MESSAGE: Record<"approve" | "decline", (name: string) => string> = {
  approve: (name) =>
    `Approve ${name}'s application?\n\nThis is final — they will be granted access. We do not reconsider.`,
  decline: (name) =>
    `Decline ${name}'s application?\n\nThis is final — no explanation is sent. We do not reconsider.`,
};

export default function ApplicationsQueue({ initial }: { initial: Application[] }) {
  const [applications, setApplications] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  // Age Verification (2026-08-03): admin's manual confirmation, checked
  // at approval time — independent of the applicant's self-reported
  // `age` above. Keyed by application id since multiple cards render at
  // once. No enforcement gate yet; see DECISIONS.md.
  const [ageVerified, setAgeVerified] = useState<Record<string, boolean>>({});
  // A6 (2026-09-09, see DECISIONS.md): approving mints a real token and
  // the admin never sees or handles it — no link to copy anymore (that
  // was the pre-A6 manual path). Kept in local state, keyed by
  // application id, purely so the card shows a result instead of
  // vanishing the moment it's approved, same UX shape as before.
  const [approvedIds, setApprovedIds] = useState<Record<string, boolean>>({});
  // A5 (2026-09-09, see DECISIONS.md) — Hold needs a reason and an
  // optional note before it can submit, so it opens an inline picker
  // instead of firing on click like Approve/Decline do.
  const [holdingId, setHoldingId] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState<string>("");
  const [holdNote, setHoldNote] = useState("");

  async function review(id: string, action: "approve" | "decline") {
    const app = applications.find((a) => a.id === id);
    const name = app?.name || app?.email || "this applicant";
    if (!window.confirm(CONFIRM_MESSAGE[action](name))) return;

    setPendingId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "approve" ? { action, ageVerified: Boolean(ageVerified[id]) } : { action },
        ),
      });
      if (!res.ok) throw new Error();

      if (action === "decline") {
        setApplications((prev) => prev.filter((a) => a.id !== id));
      } else {
        setApprovedIds((prev) => ({ ...prev, [id]: true }));
      }
    } catch {
      setErrorId(id);
    } finally {
      setPendingId(null);
    }
  }

  function startHold(id: string) {
    setHoldingId(id);
    setHoldReason("");
    setHoldNote("");
  }

  async function submitHold(id: string) {
    if (!holdReason) return;
    setPendingId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hold", heldReason: holdReason, heldNote: holdNote.trim() || undefined }),
      });
      if (!res.ok) throw new Error();

      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "held", heldReason: holdReason, heldNote: holdNote.trim() || null } : a)),
      );
      setHoldingId(null);
    } catch {
      setErrorId(id);
    } finally {
      setPendingId(null);
    }
  }

  const pendingApplications = applications.filter((a) => !approvedIds[a.id]);

  if (pendingApplications.length === 0 && Object.keys(approvedIds).length === 0) {
    return <p className="text-body">No pending applications.</p>;
  }

  return (
    <ul className="space-y-4">
      {applications.map((a) => {
        const isApproved = Boolean(approvedIds[a.id]);
        return (
          <li key={a.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-h2 !text-base">{a.name || "(no name given)"}</p>
                <p className="text-data mt-1">{a.email}</p>
                <p className="text-caption mt-2">
                  {[a.age ? `${a.age} yrs` : null, a.city, a.source, a.referralCode ? `code: ${a.referralCode}` : null]
                    .filter(Boolean)
                    .join(" · ") || "No additional details."}
                </p>
                {a.reason ? (
                  <p className="text-body mt-3 !text-base italic">&ldquo;{a.reason}&rdquo;</p>
                ) : null}
                <p className="text-caption mt-2">
                  Applied {formatAppliedDate(a.createdAt)}
                </p>
                {a.status === "held" ? (
                  <p className="text-caption mt-2" style={{ color: "var(--color-warning)" }}>
                    Held — {holdReasonLabel(a.heldReason)}
                    {a.heldNote ? `: ${a.heldNote}` : ""}
                  </p>
                ) : null}
              </div>
              {!isApproved ? (
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <label className="text-caption flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(ageVerified[a.id])}
                      onChange={(e) => setAgeVerified((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                    />
                    Age verified
                  </label>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      disabled={pendingId === a.id}
                      onClick={() => startHold(a.id)}
                    >
                      Hold
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={pendingId === a.id}
                      onClick={() => review(a.id, "decline")}
                    >
                      Decline
                    </button>
                    <button
                      className="btn-primary"
                      disabled={pendingId === a.id}
                      onClick={() => review(a.id, "approve")}
                    >
                      {pendingId === a.id ? "…" : "Approve"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {holdingId === a.id ? (
              <div className="mt-4 border-t border-ob-border pt-4">
                <label className="input-label" htmlFor={`hold-reason-${a.id}`}>
                  Hold reason
                </label>
                <select
                  id={`hold-reason-${a.id}`}
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
                <label className="input-label mt-3 block" htmlFor={`hold-note-${a.id}`}>
                  Note <span className="normal-case">(optional)</span>
                </label>
                <input
                  id={`hold-note-${a.id}`}
                  className="input mt-1"
                  value={holdNote}
                  onChange={(e) => setHoldNote(e.target.value)}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!holdReason || pendingId === a.id}
                    onClick={() => submitHold(a.id)}
                  >
                    Confirm Hold
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setHoldingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {isApproved ? (
              <div className="mt-4 border-t border-ob-border pt-4">
                <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                  Approved.
                </p>
              </div>
            ) : null}

            {errorId === a.id ? (
              <p className="text-caption mt-3" style={{ color: "var(--color-error)" }}>
                Something went wrong. Try again.
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
