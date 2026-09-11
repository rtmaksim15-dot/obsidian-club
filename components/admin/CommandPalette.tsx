"use client";

import { useEffect, useRef, useState } from "react";
import type { Zone } from "./AdminConsole";

// Cmd+K (2026-09-11, see DECISIONS.md) — a small "jump to zone" palette,
// not a full-text search across mixed entity types (a real search would
// be its own, much larger feature, not asked for here). Centered
// overlay rather than DetailPanel's side-dock, so it never looks like
// it's showing a record's detail.
export default function CommandPalette({
  zones,
  onSelect,
  onClose,
}: {
  zones: { id: Zone; label: string }[];
  onSelect: (zone: Zone) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = zones.filter((z) => z.label.toLowerCase().includes(query.toLowerCase()));

  function select(zone: Zone) {
    onSelect(zone);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-32"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-ob bg-ob-black p-4" style={{ border: "1px solid var(--color-border)" }}>
        <input
          ref={inputRef}
          className="input w-full"
          placeholder="Jump to a zone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Escape is deliberately NOT handled here -- AdminConsole's
            // single global keydown listener is the only place that
            // closes the palette. A second handler here raced it (both
            // fire for the same keypress, and whichever wins the race
            // leaves the other reading a stale `paletteOpen` -- found
            // live while verifying this feature: it closed the
            // underlying detail panel too, not just the palette).
            if (e.key === "Enter" && filtered.length > 0) select(filtered[0].id);
          }}
        />
        <ul className="mt-3 space-y-1">
          {filtered.map((z) => (
            <li key={z.id}>
              <button
                type="button"
                className="w-full rounded-ob px-3 py-2 text-left text-data"
                style={{ backgroundColor: "var(--color-bg-secondary)" }}
                onClick={() => select(z.id)}
              >
                {z.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="text-caption px-3 py-2" style={{ color: "var(--color-text-secondary)" }}>
              No match.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
