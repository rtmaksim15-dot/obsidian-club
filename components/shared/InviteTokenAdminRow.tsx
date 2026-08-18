"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tokenId: string;
  status: string;
  source: string;
  canRevoke: boolean;
  canArm: boolean;
};

// Per-token admin controls on the batch detail board — Revoke and
// Arm/assign-source (reconciliation addendum Task 3, 2026-08-14).
// Revoke and Arm are one-click actions; assign-source is a select that
// submits on change. All three just router.refresh() on success, same
// as InviteBatchEmailUploader — this board doesn't need optimistic UI.
export default function InviteTokenAdminRow({ tokenId, status, source, canRevoke, canArm }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"revoke" | "arm" | "source" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    if (!confirm("Revoke this invite? This can't be undone.")) return;
    setBusy("revoke");
    setError(null);
    try {
      const res = await fetch(`/api/admin/invite-tokens/${tokenId}/revoke`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not revoke.");
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not revoke.");
      setBusy(null);
    }
  }

  async function handleArm() {
    setBusy("arm");
    setError(null);
    try {
      const res = await fetch(`/api/admin/invite-tokens/${tokenId}/arm`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not arm.");
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not arm.");
      setBusy(null);
    }
  }

  async function handleSourceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === source) return;
    setBusy("source");
    setError(null);
    try {
      const res = await fetch(`/api/admin/invite-tokens/${tokenId}/source`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not reassign source.");
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reassign source.");
      setBusy(null);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={source}
        onChange={handleSourceChange}
        disabled={busy !== null || status === "activated"}
        className="input py-1 text-caption"
        aria-label="Source"
      >
        <option value="purchase_card">purchase_card</option>
        <option value="member">member</option>
        <option value="partner">partner</option>
      </select>
      {canArm ? (
        <button type="button" onClick={handleArm} disabled={busy !== null} className="btn-secondary py-1 text-caption">
          {busy === "arm" ? "Arming…" : "Arm"}
        </button>
      ) : null}
      {canRevoke ? (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={busy !== null}
          className="btn-secondary py-1 text-caption"
          style={{ color: "var(--color-error)" }}
        >
          {busy === "revoke" ? "Revoking…" : "Revoke"}
        </button>
      ) : null}
      {error ? (
        <p className="text-caption w-full" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
