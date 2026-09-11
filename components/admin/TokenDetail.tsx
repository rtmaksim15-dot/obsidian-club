"use client";

import { useState } from "react";
import type { TokenRow } from "./AdminConsole";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

const SOURCE_LABELS: Record<string, string> = {
  purchase_card: "Purchase Card",
  member: "Member Invite",
  partner: "Partner Link",
  application: "Application",
  personal_invitation: "Personal Invitation",
};

const BUCKET_LABELS: Record<TokenRow["bucket"], string> = {
  issued: "Issued",
  redeemed: "Redeemed",
  expired: "Expired",
  revoked: "Revoked",
};

// Zone 4 full depth (2026-09-11, see DECISIONS.md). member/partner
// tokens are display-only per instruction -- no action buttons render
// for them, even though the underlying arm/
// revoke routes have no source restriction server-side (this is a
// client-side-only enforcement of "display-only", matching what the
// instruction actually asked for). Resend reuses the new
// POST /api/admin/invite-tokens/[id]/resend, only legal (and only
// rendered here) when sentToEmail is set.
export default function TokenDetail({
  token,
  onUpdate,
}: {
  token: TokenRow;
  onUpdate: (id: string, patch: Partial<TokenRow>) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = token;
  const isDisplayOnly = t.source === "member" || t.source === "partner";
  const isTerminal = Boolean(t.redeemedAt) || Boolean(t.revokedAt);

  async function call(path: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    const json = await call(`/api/admin/invite-tokens/${t.id}/resend`);
    if (json) onUpdate(t.id, { emailSentAt: json.emailSent ? new Date().toISOString() : null, emailSendError: json.emailSent ? null : "Send failed." });
  }

  async function arm() {
    const json = await call(`/api/admin/invite-tokens/${t.id}/arm`);
    if (json) onUpdate(t.id, { status: json.status });
  }

  async function revoke() {
    const json = await call(`/api/admin/invite-tokens/${t.id}/revoke`, "Revoke this invite? It can no longer be used.");
    if (json) onUpdate(t.id, { status: json.status, revokedAt: new Date().toISOString(), bucket: "revoked" });
  }

  return (
    <div>
      <p className="text-h2 !text-base">{SOURCE_LABELS[t.source] ?? t.source}</p>
      <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
        {BUCKET_LABELS[t.bucket]} · Issued {formatDate(t.createdAt)}
      </p>
      {t.validUntil ? (
        <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Expires {formatDate(t.validUntil)}
        </p>
      ) : null}

      {t.redeemedAt ? (
        <p className="text-caption mt-3" style={{ color: "var(--color-success)" }}>
          Redeemed {formatDate(t.redeemedAt)}
          {t.redeemedByName ? ` by ${t.redeemedByName}` : ""}
        </p>
      ) : null}
      {t.revokedAt ? (
        <p className="text-caption mt-3" style={{ color: "var(--color-warning)" }}>
          Revoked {formatDate(t.revokedAt)}
        </p>
      ) : null}

      {t.inviterName ? <p className="text-caption mt-3">Created by {t.inviterName}</p> : null}
      {t.partnerOfName ? <p className="text-caption mt-3">Partner of {t.partnerOfName}</p> : null}

      {t.sentToEmail ? (
        <div className="mt-6 border-t border-ob-border pt-4">
          <p className="text-label mb-2">Sent To</p>
          <p className="text-data">{t.sentToName ? `${t.sentToName} — ${t.sentToEmail}` : t.sentToEmail}</p>
          {t.emailSendError ? (
            <p className="text-body !text-base font-semibold mt-2" style={{ color: "var(--color-error)" }}>
              ⚠ Send failed — {t.emailSendError}
            </p>
          ) : t.emailSentAt ? (
            <p className="text-caption mt-2" style={{ color: "var(--color-text-secondary)" }}>
              Sent {formatDate(t.emailSentAt)}
            </p>
          ) : null}
          {!isTerminal ? (
            <button type="button" className="btn-secondary mt-3" disabled={pending} onClick={resend}>
              {pending ? "…" : "Resend"}
            </button>
          ) : null}
        </div>
      ) : null}

      {!isDisplayOnly && !isTerminal ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-ob-border pt-4">
          <button type="button" className="btn-secondary" disabled={pending} onClick={arm}>
            Arm
          </button>
          <button type="button" className="btn-secondary" disabled={pending} onClick={revoke}>
            Revoke
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-caption mt-4" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
