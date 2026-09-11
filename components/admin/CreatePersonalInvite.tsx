"use client";

import { useState } from "react";
import type { TokenRow } from "./AdminConsole";

// Direct requirement given mid-build for Zone 4 (2026-09-11, see
// DECISIONS.md): an admin issues an invitation straight to an email
// address, bypassing the applications queue entirely -- no public
// form, no separate Accept step. Just the two fields actually needed
// (email, optional name) to know who to send it to -- this is the
// admin's own control, not the applicant-facing form or queue the
// instruction was asking to bypass. Reuses
// POST /api/admin/invites/personal, which mints the real InviteToken
// server-side; this component only prepends the resulting row to local
// state (addToken), it never constructs the token itself.
export default function CreatePersonalInvite({ onCreated }: { onCreated: (token: TokenRow) => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/invites/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");

      const now = new Date().toISOString();
      onCreated({
        id: json.tokenId,
        source: "personal_invitation",
        status: "unused",
        bucket: "issued",
        createdAt: now,
        validUntil: null,
        revokedAt: null,
        redeemedAt: null,
        redeemedByName: null,
        inviterName: null,
        partnerOfName: null,
        sentToEmail: email.trim().toLowerCase(),
        sentToName: name.trim() || null,
        emailSentAt: json.emailSent ? now : null,
        emailSendError: json.emailSent ? null : "Send failed.",
      });
      setEmail("");
      setName("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary mb-4" onClick={() => setOpen(true)}>
        Invite by Email
      </button>
    );
  }

  return (
    <div className="card mb-4">
      <label className="input-label" htmlFor="personal-invite-email">
        Email
      </label>
      <input
        id="personal-invite-email"
        type="email"
        className="input mt-1"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@example.com"
      />
      <label className="input-label mt-3 block" htmlFor="personal-invite-name">
        Name <span className="normal-case">(optional)</span>
      </label>
      <input id="personal-invite-name" className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary" disabled={!email || pending} onClick={submit}>
          {pending ? "…" : "Send Invitation"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error ? (
        <p className="text-caption mt-3" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
