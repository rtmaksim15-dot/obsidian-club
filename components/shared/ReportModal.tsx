"use client";

import { useEffect, useState } from "react";
import { REPORT_CATEGORIES } from "@/lib/moderation/report";

type Props = {
  targetType: "post" | "profile" | "comment" | "message" | "direct_message";
  targetId: string;
  // A short, plain excerpt of the reported item — post/comment/message
  // content, or a profile's display name — shown briefly at the top so
  // the reporter can confirm they're reporting the right thing. Never
  // sent anywhere; display-only.
  preview: string;
  onClose: () => void;
};

type Status = "picking" | "submitting" | "done" | "error";

/**
 * Dedicated report modal (item 6, 2026-09-20, see DECISIONS.md) —
 * replaces the old inline "click Report, pick a reason from a row of
 * buttons" pattern everywhere it appeared (post, comment, room message,
 * DM, profile). Full-screen on mobile, a centered card from `sm` up.
 * Single-select reasons with a one-line plain explanation each, an
 * optional note, then a fixed "Thank you" confirmation before closing —
 * the reported item is never altered for the reporter, on success or
 * failure.
 */
export default function ReportModal({ targetType, targetId, preview, onClose }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("picking");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (status !== "done") return;
    const timer = setTimeout(onClose, 1800);
    return () => clearTimeout(timer);
  }, [status, onClose]);

  async function submit() {
    if (!category) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, category, note: note.trim() || undefined }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full w-full flex-col overflow-y-auto bg-ob-black p-6 sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-ob"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-h2 !text-lg">Report this</h2>
          <button type="button" onClick={onClose} className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            Close
          </button>
        </div>

        {status === "done" ? (
          <p className="text-body mt-8">Thank you. This will be reviewed.</p>
        ) : (
          <>
            <p
              className="text-caption mt-4 line-clamp-3 rounded-ob border px-3 py-2"
              style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
            >
              {preview || "(no preview available)"}
            </p>

            <p className="text-label mt-6 mb-3">Reason</p>
            <div className="space-y-2">
              {REPORT_CATEGORIES.map((c) => (
                <label
                  key={c.value}
                  className="flex cursor-pointer items-start gap-3 rounded-ob border px-3 py-2.5"
                  style={{
                    borderColor: category === c.value ? "var(--color-accent)" : "var(--color-border-subtle)",
                  }}
                >
                  <input
                    type="radio"
                    name="report-category"
                    value={c.value}
                    checked={category === c.value}
                    onChange={() => setCategory(c.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-data !text-sm block">{c.label}</span>
                    {c.description ? (
                      <span className="text-caption block" style={{ color: "var(--color-text-muted)" }}>
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>

            <p className="text-label mt-6 mb-2">Note (optional)</p>
            <textarea
              className="input min-h-[5rem] w-full"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder="Add any detail that would help review this"
            />

            {status === "error" ? (
              <p className="text-caption mt-3" style={{ color: "var(--color-error)" }}>
                Couldn&apos;t submit — try again.
              </p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={!category || status === "submitting"}
                className="btn-primary"
              >
                {status === "submitting" ? "…" : "Submit"}
              </button>
              <button type="button" onClick={onClose} className="btn-ghost" disabled={status === "submitting"}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
