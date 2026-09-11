"use client";

import { useEffect, useState } from "react";
import LaunchCountdownPlaceholder from "./LaunchCountdownPlaceholder";

type Props = { targetIso: string };

type Remaining = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

function getRemaining(targetMs: number): Remaining {
  const diff = targetMs - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: false,
  };
}

const UNITS: { key: keyof Remaining; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hrs" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
];

/**
 * Live countdown to `targetIso` — a fixed instant (parsed with its own
 * offset, e.g. "2026-11-01T00:00:00-04:00"), correct for a visitor in
 * any timezone since it's never compared against the viewer's local
 * midnight. Starts rendering only after mount (`remaining` starts
 * `null`) so the server-rendered markup never has to guess how much
 * time will have elapsed by the moment the browser hydrates — avoids a
 * hydration mismatch rather than fighting it with `suppressHydrationWarning`.
 *
 * Self-replaces with `LaunchCountdownPlaceholder` the instant it reaches
 * zero, no reload needed — the interval clears itself at that point.
 */
export default function LaunchCountdown({ targetIso }: Props) {
  const targetMs = new Date(targetIso).getTime();
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const check = () => {
      const next = getRemaining(targetMs);
      setRemaining(next);
      return next.done;
    };
    if (check()) return;
    const id = setInterval(() => {
      if (check()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (!remaining) return null;
  if (remaining.done) return <LaunchCountdownPlaceholder />;

  return (
    <div className="flex items-start justify-center gap-[clamp(18px,4vw,40px)]" role="timer" aria-live="off">
      {UNITS.map((u) => (
        <div key={u.key} className="flex flex-col items-center">
          <span className="font-cinzel text-[clamp(1.6rem,4vw,2.75rem)] font-semibold tabular-nums text-ob-text">
            {String(remaining[u.key]).padStart(2, "0")}
          </span>
          <span className="text-label mt-2">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
