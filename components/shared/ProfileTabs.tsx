"use client";

import { useState, type ReactNode } from "react";

type Tab = "about" | "photos";

// Profile lite, B5 (Package 4, Phase B, 2026-10-13, see DECISIONS.md) —
// a plain client tab switcher; the actual content for each tab is
// rendered server-side and passed down as already-built JSX (the data
// fetching stays in the Server Component page, same pattern this
// repo's admin zone tabs use for their own switch). A third
// "Chronicles" tab is deliberately not wired in here at all — it stays
// behind CHRONICLES_UI_ENABLED, which gates no actual content yet
// (lib/config/feature-flags.ts: "no model, no route").
export default function ProfileTabs({ about, photos }: { about: ReactNode; photos: ReactNode }) {
  const [tab, setTab] = useState<Tab>("about");

  return (
    <div className="mt-10">
      <div className="mb-6 flex gap-2 border-b border-ob-border">
        <button
          type="button"
          onClick={() => setTab("about")}
          className="px-4 py-2 text-caption"
          style={{
            color: tab === "about" ? "var(--color-text-primary)" : "var(--color-text-muted)",
            borderBottom: tab === "about" ? "2px solid var(--color-accent)" : "2px solid transparent",
          }}
        >
          About
        </button>
        <button
          type="button"
          onClick={() => setTab("photos")}
          className="px-4 py-2 text-caption"
          style={{
            color: tab === "photos" ? "var(--color-text-primary)" : "var(--color-text-muted)",
            borderBottom: tab === "photos" ? "2px solid var(--color-accent)" : "2px solid transparent",
          }}
        >
          Photos
        </button>
      </div>

      {tab === "about" ? about : photos}
    </div>
  );
}
