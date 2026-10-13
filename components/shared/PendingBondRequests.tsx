"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = { id: string; username: string | null; displayName: string; avatarUrl: string | null };
type PendingBond = { id: string; kind: "partner" | "dominant_of" | "submissive_of"; createdAt: string; fromUser: Person };

const KIND_LABEL: Record<PendingBond["kind"], string> = {
  partner: "wants to be your partner",
  dominant_of: "wants to be your dominant",
  submissive_of: "wants to be your submissive",
};

// Profile lite, B3/B5 (Package 4, Phase B, 2026-10-13, see
// DECISIONS.md) — incoming pending bond requests, shown only on one's
// own profile.
export default function PendingBondRequests({ initialRequests }: { initialRequests: PendingBond[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(id: string, action: "accept" | "decline") {
    setPending(id);
    setError(null);
    try {
      const res = await fetch(`/api/bonds/${id}`, {
        method: action === "accept" ? "PATCH" : "DELETE",
        headers: action === "accept" ? { "Content-Type": "application/json" } : undefined,
        body: action === "accept" ? JSON.stringify({ action: "accept" }) : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not respond.");
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (action === "accept") router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="mt-6 border-t border-ob-border pt-4">
      <p className="text-label mb-3">Bond Requests</p>
      {error ? (
        <p className="text-caption mb-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.id} className="card !py-3">
            <p className="text-data">
              {r.fromUser.displayName} {KIND_LABEL[r.kind]}
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn-primary" disabled={pending === r.id} onClick={() => respond(r.id, "accept")}>
                {pending === r.id ? "…" : "Accept"}
              </button>
              <button type="button" className="btn-danger" disabled={pending === r.id} onClick={() => respond(r.id, "decline")}>
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
