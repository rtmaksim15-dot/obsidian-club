"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { STEPS, TOTAL_SEGMENTS, type StepId } from "@/lib/newcomer-path/core";
import { NEWCOMER_PATH_STEP_REP } from "@/lib/rep/config";

type Props = {
  completion: Record<StepId, boolean>;
  filled: number;
  initiallyDismissed: boolean;
  justCompleted: boolean;
};

function SegmentBar({ filled }: { filled: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full"
          style={{ backgroundColor: i < filled ? "var(--color-gold)" : "var(--color-border)" }}
        />
      ))}
    </div>
  );
}

// Newcomer Path (Package 5, Phase A, 2026-10-14, see DECISIONS.md) — A4.
// Server passes down the already-computed completion/segment state
// (lib/newcomer-path/status.ts#syncNewcomerPath, called from the feed
// page); this component is purely the card's own interactivity
// ("Later" and the one-time completion message), not a second source
// of truth for what's complete.
export default function NewcomerPathCard({ completion, filled, initiallyDismissed, justCompleted }: Props) {
  const [dismissed, setDismissed] = useState(initiallyDismissed);
  const [busy, setBusy] = useState(false);

  async function handleLater() {
    setBusy(true);
    setDismissed(true);
    try {
      await fetch("/api/newcomer-path/dismiss", { method: "POST" });
    } finally {
      setBusy(false);
    }
  }

  if (justCompleted) {
    return (
      <div className="card mb-6 text-center">
        <p className="text-body !text-base">The path is walked. The Circle sees you.</p>
      </div>
    );
  }

  if (dismissed) {
    return (
      <div className="card mb-6 flex items-center gap-3 !py-3">
        <p className="text-caption shrink-0" style={{ color: "var(--color-text-secondary)" }}>
          The Path of the Initiate
        </p>
        <SegmentBar filled={filled} />
      </div>
    );
  }

  return (
    <div className="card mb-6">
      <p className="text-label mb-1">THE PATH OF THE INITIATE</p>
      {/* Card polish pass (2026-10-14, see DECISIONS.md) — one line of
          intro copy under the title, same Cormorant body font as every
          other prose line on this card, muted since it's scene-setting
          rather than content. */}
      <p className="text-body !text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
        Four steps to be seen by the Circle.
      </p>
      <div className="mt-3">
        <SegmentBar filled={filled} />
      </div>
      <ul className="mt-4 space-y-2">
        {STEPS.map((step) => {
          const done = completion[step.id];
          return (
            <li key={step.id}>
              <a
                href={step.href}
                className="nav-control flex min-h-11 items-center gap-2 py-1"
                style={{ color: done ? "var(--color-text-muted)" : "var(--color-text-primary)" }}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]"
                  style={{
                    backgroundColor: done ? "var(--color-gold)" : "transparent",
                    border: done ? "none" : "1px solid var(--color-border)",
                    color: "var(--color-bg-primary)",
                  }}
                >
                  {done ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className={`text-body !text-sm ${done ? "line-through" : ""}`}>{step.label}</span>
                    {!done ? (
                      <span className="text-caption shrink-0" style={{ color: "var(--color-gold)" }}>
                        +{NEWCOMER_PATH_STEP_REP} REP
                      </span>
                    ) : null}
                  </span>
                  {!done ? (
                    <span className="text-caption mt-0.5 block" style={{ color: "var(--color-text-muted)" }}>
                      {step.hint}
                    </span>
                  ) : null}
                </span>
                {!done ? <ChevronRight size={16} strokeWidth={1.5} className="shrink-0" /> : null}
              </a>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={handleLater}
        disabled={busy}
        className="nav-control text-caption mt-4"
        style={{ color: "var(--color-text-muted)" }}
      >
        Later
      </button>
    </div>
  );
}
