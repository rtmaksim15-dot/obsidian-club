"use client";

import { useState } from "react";
import type { ReportRow } from "./AdminConsole";
import { levelName } from "@/lib/rating/levels";
import { formatAdminDateTime as formatDate } from "@/lib/admin/format-date";

type Action = "dismiss" | "review" | "preserve" | "remove";

const CONFIRM_MESSAGE: Record<Action, string> = {
  dismiss: "Dismiss this report? It will be marked reviewed with no action taken.",
  review: "Mark this report reviewed with no further action?",
  preserve:
    "Preserve and remove this post?\n\nIt will be unpublished and isolated (never deleted) — this is the red-line action for underage/non-consensual/threat reports.",
  remove:
    "Remove this content and mark the report reviewed?\n\nIt will be soft-deleted (never hard-deleted) and shown to other members as removed by a moderator.",
};

// Zone 3 full depth (2026-09-11, see DECISIONS.md). Reuses the existing
// PATCH /api/admin/reports/[id] action route unchanged
// (dismiss/review/preserve/remove) -- components/shared/
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
  const [dmContent, setDmContent] = useState<string | null>(null);
  const [dmLoading, setDmLoading] = useState(false);
  const [dmError, setDmError] = useState<string | null>(null);

  const r = report;
  const canPreserve = r.targetType === "post" && r.isRedLine;
  const canRemove = r.targetType === "comment" || r.targetType === "message";
  const canRestore = canRemove && r.target.isDeleted;

  // Direct Messages (2026-09-14, see DECISIONS.md) — the only place in
  // the admin console a message's actual text ever appears. Fetched on
  // click, not on panel open, so opening the panel to read the reporter/
  // category doesn't itself count as reading the message; every fetch
  // is logged server-side regardless of whether the admin reads what
  // comes back.
  async function revealMessage() {
    setDmLoading(true);
    setDmError(null);
    try {
      const res = await fetch(`/api/admin/reports/${r.id}/message`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Could not load.");
      setDmContent(json.message.content || "(removed)");
    } catch (e) {
      setDmError(e instanceof Error ? e.message : "Could not load.");
    } finally {
      setDmLoading(false);
    }
  }

  // Restore (task 1, 2026-09-22, see DECISIONS.md) — a content-state
  // action, not a report action: it doesn't touch the report's own
  // status (already resolved by the time this is reachable — see
  // AdminConsole.tsx#visibleReports), so it goes straight to the
  // standalone admin comment/message routes rather than through
  // PATCH /api/admin/reports/:id. Doesn't close the panel: the admin
  // stays here to see the "Already removed" note flip away, same as
  // any other detail field updating in place.
  async function restore() {
    if (!window.confirm("Restore this content? It will be visible to members again.")) return;
    setPending(true);
    setError(null);
    try {
      const path = r.targetType === "comment" ? `/api/admin/comments/${r.targetId}` : `/api/admin/messages/${r.targetId}`;
      const res = await fetch(path, { method: "PATCH" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      onUpdate(r.id, { target: { ...r.target, isDeleted: false } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

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
      {r.category === "underage" ? (
        <p className="text-data font-semibold" style={{ color: "var(--color-error)" }}>
          URGENT — Underage
        </p>
      ) : r.category === "below_membership_age" ? (
        <p className="text-data font-semibold" style={{ color: "var(--color-warning)" }}>
          Under 21 — Eligibility (not a child-safety report)
        </p>
      ) : r.isRedLine ? (
        <p className="text-data font-semibold" style={{ color: "var(--color-error)" }}>
          Red line
        </p>
      ) : null}
      <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
        Filed {formatDate(r.createdAt)}
      </p>
      {r.note ? <p className="text-body mt-3 !text-base italic">&ldquo;{r.note}&rdquo;</p> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-ob-border pt-4 sm:grid-cols-2">
        <div>
          <p className="text-label mb-2">Reporter</p>
          <p className="text-data">{r.reporter.displayName}</p>
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            {/* Nullable username (2026-09-25, see DECISIONS.md) — same
                admin-visible flag as PersonDetail.tsx. */}
            {r.reporter.username ? `@${r.reporter.username}` : "— username not chosen"} · {levelName(r.reporter.level)}
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
          {r.targetType === "direct_message" && !r.target.isDeleted ? (
            <div className="mt-3">
              {dmContent !== null ? (
                <p className="text-body !text-base italic">&ldquo;{dmContent}&rdquo;</p>
              ) : (
                <button type="button" className="btn-secondary" disabled={dmLoading} onClick={revealMessage}>
                  {dmLoading ? "…" : "View message"}
                </button>
              )}
              {dmError ? (
                <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
                  {dmError}
                </p>
              ) : null}
            </div>
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
        {r.status === "open" ? (
          <>
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
          </>
        ) : canRestore ? (
          <button type="button" className="btn-primary" disabled={pending} onClick={restore}>
            Restore
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
