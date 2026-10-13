"use client";

import { useState, type ReactNode } from "react";

type Tab = "about" | "posts" | "photos";

const TABS: { id: Tab; label: string }[] = [
  { id: "about", label: "About" },
  { id: "posts", label: "Posts" },
  { id: "photos", label: "Photos" },
];

// Profile lite, B5 (Package 4, Phase B, 2026-10-13, see DECISIONS.md;
// "Posts" added in the same day's follow-up after the Phase B-only
// About/Photos split left a text-only post unreachable anywhere on the
// profile) — a plain client tab switcher; the actual content for each
// tab is rendered server-side and passed down as already-built JSX
// (the data fetching stays in the Server Component page, same pattern
// this repo's admin zone tabs use for their own switch). A fourth
// "Chronicles" tab is deliberately not wired in here at all — it stays
// behind CHRONICLES_UI_ENABLED, which gates no actual content yet
// (lib/config/feature-flags.ts: "no model, no route").
export default function ProfileTabs({ about, posts, photos }: { about: ReactNode; posts: ReactNode; photos: ReactNode }) {
  const [tab, setTab] = useState<Tab>("about");
  const content = tab === "about" ? about : tab === "posts" ? posts : photos;

  return (
    <div className="mt-10">
      <div className="mb-6 flex gap-2 border-b border-ob-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="px-4 py-2 text-caption"
            style={{
              color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-muted)",
              borderBottom: tab === t.id ? "2px solid var(--color-accent)" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {content}
    </div>
  );
}
