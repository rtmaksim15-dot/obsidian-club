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
};

// toLocaleDateString() with no fixed locale/timeZone renders differently
// on the server (container locale) vs. the browser (visitor locale),
// which React flags as a hydration mismatch and then throws away the
// server-rendered HTML to re-render from scratch. Pin both to the same
// locale/UTC so server and client always agree.
function formatAppliedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC" });
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
  // Approving no longer creates the account — it returns a one-time
  // invite link the admin has to copy and send themselves (Closed
  // Registration & Invite System, 2026-07-17). Kept in local state,
  // keyed by application id, so the card can show it instead of
  // vanishing the moment it's approved.
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();

      if (action === "decline") {
        setApplications((prev) => prev.filter((a) => a.id !== id));
      } else {
        setInviteLinks((prev) => ({ ...prev, [id]: body.inviteUrl }));
      }
    } catch {
      setErrorId(id);
    } finally {
      setPendingId(null);
    }
  }

  async function copyLink(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
  }

  const pendingApplications = applications.filter((a) => !inviteLinks[a.id]);

  if (pendingApplications.length === 0 && Object.keys(inviteLinks).length === 0) {
    return <p className="text-body">No pending applications.</p>;
  }

  return (
    <ul className="space-y-4">
      {applications.map((a) => {
        const inviteUrl = inviteLinks[a.id];
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
              </div>
              {!inviteUrl ? (
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

            {inviteUrl ? (
              <div className="mt-4 border-t border-ob-border pt-4">
                <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                  Approved — copy this link and send it to them yourself. It works once.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code
                    className="text-caption flex-1 break-all rounded-ob border px-3 py-2"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                  >
                    {inviteUrl}
                  </code>
                  <button type="button" className="btn-secondary shrink-0" onClick={() => copyLink(a.id, inviteUrl)}>
                    {copiedId === a.id ? "Copied" : "Copy"}
                  </button>
                </div>
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
