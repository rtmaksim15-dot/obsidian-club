"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";

type DisplayBond = { id: string; description: string; otherUsername: string | null };

// Profile lite, B3/B5 (Package 4, Phase B, 2026-10-13, see
// DECISIONS.md) — active, visible bonds on a profile. `canDissolve`
// (passed by the page, true only when viewing one's own profile) shows
// a Dissolve control next to each; read-only otherwise.
export default function BondsList({ bonds, canDissolve }: { bonds: DisplayBond[]; canDissolve: boolean }) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function dissolve(id: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/bonds/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      setConfirmingId(null);
      if (res.ok) {
        setNotice(body?.message ?? "The bond has been dissolved.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  if (bonds.length === 0) return null;

  return (
    <div className="mt-2">
      {notice ? (
        <p className="text-caption mb-2" style={{ color: "var(--color-text-secondary)" }}>
          {notice}
        </p>
      ) : null}
      <ul className="space-y-1">
        {bonds.map((b) => (
          <li key={b.id} className="text-caption flex items-center justify-between gap-3" style={{ color: "var(--color-text-secondary)" }}>
            {b.otherUsername ? (
              <a href={`/profile/${b.otherUsername}`} style={{ color: "var(--color-text-secondary)" }}>
                {b.description}
              </a>
            ) : (
              <span>{b.description}</span>
            )}
            {canDissolve ? (
              <button
                type="button"
                className="text-caption nav-control"
                style={{ color: "var(--color-text-muted)" }}
                disabled={pending}
                onClick={() => setConfirmingId(b.id)}
              >
                Dissolve
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {confirmingId ? (
        <ConfirmDialog
          title="Dissolve this bond? This cannot be undone."
          confirmLabel="Dissolve"
          busy={pending}
          onConfirm={() => dissolve(confirmingId)}
          onCancel={() => setConfirmingId(null)}
        />
      ) : null}
    </div>
  );
}
