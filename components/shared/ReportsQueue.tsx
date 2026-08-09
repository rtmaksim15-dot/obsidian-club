"use client";

import { useState } from "react";

export type QueuedReport = {
  id: string;
  targetType: "post" | "profile";
  targetId: string;
  category: string;
  isRedLine: boolean;
  note: string | null;
  createdAt: string;
  reporter: { displayName: string; username: string };
  targetLabel: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

const CONFIRM_MESSAGE: Record<"dismiss" | "review" | "preserve", string> = {
  dismiss: "Dismiss this report? It will be marked reviewed with no action taken.",
  review: "Mark this report reviewed with no further action?",
  preserve:
    "Preserve and remove this post?\n\nIt will be unpublished and isolated (never deleted) — this is the red-line action for underage/non-consensual/threat reports.",
};

// Admin report review queue (member protection mechanics, pre-launch
// legal package, 2026-08-09) — same "client component holds the list,
// server component fetches it once" shape as ApplicationsQueue.tsx.
export default function ReportsQueue({ initial }: { initial: QueuedReport[] }) {
  const [reports, setReports] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function act(id: string, action: "dismiss" | "review" | "preserve") {
    if (!window.confirm(CONFIRM_MESSAGE[action])) return;

    setPendingId(id);
    setErrorId(null);

    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      setErrorId(id);
      setPendingId(null);
      return;
    }

    setReports((prev) => prev.filter((r) => r.id !== id));
    setPendingId(null);
  }

  if (reports.length === 0) {
    return (
      <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
        No open reports.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-data !text-sm">
              {r.targetType} — {r.targetLabel}
            </p>
            {r.isRedLine ? (
              <span className="text-caption" style={{ color: "var(--color-error)" }}>
                RED LINE
              </span>
            ) : null}
          </div>
          <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {r.category} · reported by {r.reporter.displayName} · {formatDate(r.createdAt)}
          </p>
          {r.note ? <p className="text-caption mt-2">{r.note}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => act(r.id, "review")}
              disabled={pendingId === r.id}
              className="text-caption"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Mark reviewed
            </button>
            <button
              type="button"
              onClick={() => act(r.id, "dismiss")}
              disabled={pendingId === r.id}
              className="text-caption"
              style={{ color: "var(--color-text-muted)" }}
            >
              Dismiss
            </button>
            {r.targetType === "post" && r.isRedLine ? (
              <button
                type="button"
                onClick={() => act(r.id, "preserve")}
                disabled={pendingId === r.id}
                className="text-caption"
                style={{ color: "var(--color-error)" }}
              >
                Preserve &amp; remove
              </button>
            ) : null}
          </div>

          {errorId === r.id ? (
            <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
              Couldn&apos;t update. Try again.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
