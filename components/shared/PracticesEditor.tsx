"use client";

import { useEffect, useState } from "react";

type Tag = { id: string; slug: string; label: string };
type Kind = "limit" | "practice" | "curious";
type GroupedPractices = { limit: Tag[]; practice: Tag[]; curious: Tag[] };

const KIND_OPTIONS: { value: "" | Kind; label: string }[] = [
  { value: "", label: "—" },
  { value: "limit", label: "My limit" },
  { value: "practice", label: "I practise" },
  { value: "curious", label: "Curious about" },
];

const VISIBILITY_OPTIONS: { value: string; label: string }[] = [
  { value: "only_me", label: "Only me" },
  { value: "following", label: "People I follow" },
  { value: "members", label: "All members" },
];

function kindOf(tagId: string, grouped: GroupedPractices): Kind | "" {
  if (grouped.limit.some((t) => t.id === tagId)) return "limit";
  if (grouped.practice.some((t) => t.id === tagId)) return "practice";
  if (grouped.curious.some((t) => t.id === tagId)) return "curious";
  return "";
}

// Profile lite, B2 (Package 4, Phase B, 2026-10-13, see DECISIONS.md)
// — the curated-tag editor, on /profile/edit (not the public profile
// view). Saves each change immediately, same pattern as BoundariesForm.
export default function PracticesEditor() {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [practices, setPractices] = useState<GroupedPractices>({ limit: [], practice: [], curious: [] });
  const [visibility, setVisibility] = useState("following");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/practices")
      .then((r) => r.json())
      .then((data) => {
        setTags(data.tags ?? []);
        setPractices(data.practices ?? { limit: [], practice: [], curious: [] });
        setVisibility(data.visibility ?? "following");
      })
      .catch(() => setError("Could not load practices."));
  }, []);

  async function setTagKind(tagId: string, kind: Kind | "") {
    const prev = practices;
    const tag = tags?.find((t) => t.id === tagId);
    if (!tag) return;
    const next: GroupedPractices = {
      limit: practices.limit.filter((t) => t.id !== tagId),
      practice: practices.practice.filter((t) => t.id !== tagId),
      curious: practices.curious.filter((t) => t.id !== tagId),
    };
    if (kind) next[kind] = [...next[kind], tag];
    setPractices(next);

    const res = await fetch("/api/profile/practices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId, kind: kind || null }),
    });
    if (!res.ok) {
      setPractices(prev);
      setError("Could not save.");
    }
  }

  async function changeVisibility(value: string) {
    setVisibility(value);
    await fetch("/api/profile/practices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: value }),
    });
  }

  if (!tags) {
    return (
      <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
        Loading…
      </p>
    );
  }

  return (
    <div>
      {error ? (
        <p className="text-caption mb-3" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <label className="input-label" htmlFor="practices-visibility">
        Who can see this
      </label>
      <select
        id="practices-visibility"
        className="input mt-1"
        value={visibility}
        onChange={(e) => changeVisibility(e.target.value)}
      >
        {VISIBILITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <ul className="mt-4 divide-y divide-ob-border">
        {tags.map((tag) => (
          <li key={tag.id} className="flex items-center justify-between gap-3 py-2">
            <span className="text-body !text-sm">{tag.label}</span>
            <select
              className="input !w-auto"
              value={kindOf(tag.id, practices)}
              onChange={(e) => setTagKind(tag.id, e.target.value as Kind | "")}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
