"use client";

import { useState } from "react";
import type { ReportRow } from "./AdminConsole";
import { levelName } from "@/lib/rating/levels";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

type Action = "dismiss" | "review" | "preserve" | "remove";

const CONFIRM_MESSAGE: Record<Action, string> = {
  dismiss: "Dismiss this report? It will be marked reviewed with no action taken.",
  review: "Mark this report reviewed with no further action?",
  preserve:
    "Preserve and remove this post?\n\nIt will be unpublished and isolated (never deleted) — this is the red-line action for underage/non-consensual/threat reports.",
  remove:
    "Remove this content and mark the report reviewed?\n\nIt will be soft-deleted (never hard-deleted) and shown to other members as removed by a moderator.",
};

// Zone 3 full depth (2026-09-11, see DECISIONS.md — reconstruction
// pending). Reuses the existing PATCH /api/admin/reports/[id] action
// route unchanged (dismiss/review/preserve/remove) -- components/shared/
// ReportsQueue.tsx had this exact confirm-dialog-per-action pattern
// already; ported here into the shared detail-panel shape. Every action
// is terminal (the route 422s on a non-"open" report), so any
// successful action closes the panel -- there's nothing further to do
// with a resolved report, unlike Zone 1's approve/hold which stay open.
export default function ReportDetail({
  report,
  onUpdate,
  onClose,
}: {
  report: ReportRow;
  onUpdate: (id: string, patch: Partial<ReportRow>) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const r = report;
  const canPreserve = r.targetType === "post" && r.isRedLine;
  const canRemove = r.targetType === "comment" || r.targetType === "message";

  async function act(action: Action) {
    if (!window.confirm(CONFIRM_MESSAGE[action])) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      onUpdate(r.id, { status: action === "dismiss" ? "dismissed" : "reviewed", reviewedAt: new Date().toISOString() });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="text-label mb-1">{r.targetType} · {r.category}</p>
      {r.isRedLine ? (
        <p className="text-data font-semibold" style={{ color: "var(--color-error)" }}>
          Red line
        </p>
      ) : null}
      <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
        Filed {formatDate(r.createdAt)}
      </p>
      {r.note ? <p className="text-body mt-3 !text-base italic">&ldquo;{r.note}&rdquo;</p> : null}

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-ob-border pt-4">
        <div>
          <p className="text-label mb-2">Reporter</p>
          <p className="text-data">{r.reporter.displayName}</p>
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            @{r.reporter.username} · {levelName(r.reporter.level)}
          </p>
          <p className="text-caption mt-2" style={{ color: "var(--color-text-secondary)" }}>
            {r.reporter.reportsFiled} {r.reporter.reportsFiled === 1 ? "report" : "reports"} filed
            {r.reporter.reportsFiled > 0 ? ` (${r.reporter.reportsDismissed} dismissed)` : ""}
          </p>
        </div>
        <div>
          <p className="text-label mb-2">Reported</p>
          <p className="text-data">{r.target.label}</p>
          {r.target.authorName ? (
            <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
              by {r.target.authorName}
              {r.target.authorUsername ? ` (@${r.target.authorUsername})` : ""}
            </p>
          ) : null}
          {r.target.isDeleted ? (
            <p className="text-caption mt-2" style={{ color: "var(--color-warning)" }}>
              Already removed
            </p>
          ) : null}
          {r.target.isPreserved ? (
            <p className="text-caption mt-2" style={{ color: "var(--color-warning)" }}>
              Preserved (unpublished)
            </p>
          ) : null}
          {r.target.contextHref ? (
            <a href={r.target.contextHref} target="_blank" rel="noreferrer" className="text-caption mt-2 inline-block" style={{ color: "var(--color-accent)" }}>
              View in context ↗
            </a>
          ) : null}
        </div>
      </div>

      {r.siblingReports.length > 0 ? (
        <div className="mt-6 border-t border-ob-border pt-4">
          <p className="text-label mb-2">Other Reports on This Target</p>
          <ul className="space-y-1">
            {r.siblingReports.map((s) => (
              <li key={s.id} className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                {s.category} · {s.status} · {formatDate(s.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 border-t border-ob-border pt-4">
        <p className="text-label mb-2">Admin Actions on This Target</p>
        {r.targetModerationActions.length === 0 ? (
          <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
            None recorded.
          </p>
        ) : (
          <ul className="space-y-2">
            {r.targetModerationActions.map((m) => (
              <li key={m.id} className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                {formatDate(m.createdAt)} — {m.action}
                {m.adminName ? ` by ${m.adminName}` : ""}
                {m.note ? `: ${m.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-ob-border pt-4">
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => act("dismiss")}>
          Dismiss
        </button>
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => act("review")}>
          Mark Reviewed
        </button>
        {canRemove ? (
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => act("remove")}>
            Remove Content
          </button>
        ) : null}
        {canPreserve ? (
          <button type="button" className="btn-primary" disabled={pending} onClick={() => act("preserve")}>
            Preserve &amp; Unpublish
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-caption mt-4" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
