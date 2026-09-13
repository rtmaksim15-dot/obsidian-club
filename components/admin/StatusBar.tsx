"use client";

import type { Zone, Filter } from "./AdminConsole";

export type Counts = {
  pending: number;
  held: number;
  failedSend: number;
  openReports: number;
  membersTotal: number;
  notAgeVerified: number;
};

type Stat = { key: string; label: string; value: number; zone: Zone; filter: Filter; alert?: boolean };

// Six numbers, one glanceable row (2026-09-10, see DECISIONS.md) --
// deliberately just counts, no doors-state/countdown/antechamber tie-in
// (that's a launch-watching concern, this console is for handling
// people). Each is clickable: jumps to its zone and filters the list
// below to exactly that subset. "Failed sends" is the one exception to
// "just a statistic" -- a failed decision-email send means a real
// person is stuck outside with no way in, so above zero it gets the
// club's own alert treatment (solid accent fill, pulsing), not the
// same quiet styling as the other five.
export default function StatusBar({
  counts,
  activeZone,
  activeFilter,
  onSelect,
}: {
  counts: Counts;
  activeZone: Zone;
  activeFilter: Filter;
  onSelect: (zone: Zone, filter: Filter) => void;
}) {
  const stats: Stat[] = [
    { key: "pending", label: "New Applications", value: counts.pending, zone: "applications", filter: "pending" },
    { key: "held", label: "On Hold", value: counts.held, zone: "applications", filter: "held" },
    {
      key: "failedSend",
      label: "Failed Sends",
      value: counts.failedSend,
      zone: "applications",
      filter: "failedSend",
      alert: true,
    },
    { key: "openReports", label: "Open Reports", value: counts.openReports, zone: "arbitration", filter: null },
    { key: "membersTotal", label: "Members", value: counts.membersTotal, zone: "people", filter: null },
    { key: "notAgeVerified", label: "Not Age-Verified", value: counts.notAgeVerified, zone: "people", filter: "notAgeVerified" },
  ];

  return (
    <div className="card mb-6 flex flex-wrap gap-x-8 gap-y-4">
      {stats.map((s) => {
        const isAlert = s.alert && s.value > 0;
        // Selected state (2026-09-12) is a border + tint, deliberately
        // never the alert's solid fill — Failed Sends must stay
        // recognizable as an alarm even when it's also the active
        // filter, not just "another selected stat."
        const isSelected = s.zone === activeZone && s.filter === activeFilter;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s.zone, s.filter)}
            className={`flex flex-col items-start rounded-ob border px-3 py-1.5 text-left transition-colors ${
              isAlert ? "animate-pulse" : ""
            }`}
            style={
              isAlert
                ? { backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#fff" }
                : isSelected
                  ? {
                      backgroundColor: "var(--color-accent-glow)",
                      borderColor: "var(--color-accent)",
                      color: "var(--color-text-primary)",
                    }
                  : { borderColor: "transparent", color: "var(--color-text-primary)" }
            }
          >
            <span className="text-h2 !text-2xl !normal-case !tracking-normal" style={isAlert ? { color: "#fff" } : undefined}>
              {s.value}
            </span>
            <span
              className="text-label mt-0.5"
              style={isAlert ? { color: "rgba(255,255,255,0.85)" } : undefined}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
