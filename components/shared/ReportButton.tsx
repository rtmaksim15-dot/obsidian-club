"use client";

import { useState } from "react";
import { REPORT_CATEGORIES } from "@/lib/moderation/report";

type Props = { targetType: "post" | "profile"; targetId: string };
type Status = "idle" | "picking" | "submitting" | "done" | "error";

// One-step report, reachable directly from every post and every
// profile — no nested menus (member protection mechanics, pre-launch
// legal package, 2026-08-09). "One step" means the button itself is
// never buried in a submenu; picking a category is the report itself,
// not a second menu layer.
export default function ReportButton({ targetType, targetId }: Props) {
  const [status, setStatus] = useState<Status>("idle");

  async function submit(category: string) {
    setStatus("submitting");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, category }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
        Reported
      </span>
    );
  }

  if (status === "picking" || status === "submitting") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {REPORT_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => submit(c.value)}
            disabled={status === "submitting"}
            className="text-caption"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {c.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setStatus("picking")}
      className="text-caption"
      style={{ color: status === "error" ? "var(--color-error)" : "var(--color-text-muted)" }}
    >
      {status === "error" ? "Couldn't report — try again" : "Report"}
    </button>
  );
}
