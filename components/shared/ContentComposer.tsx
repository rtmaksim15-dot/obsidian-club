"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AllowedType = { type: string; label: string };

const LABELS: Record<string, string> = {
  post: "Post",
  story: "Story",
  article: "Article",
  lecture: "Lecture",
  course: "Course",
  manifesto: "Manifesto",
};

// Only types the toggle applies to need a title; short-form types don't.
const TITLED_TYPES = new Set(["article", "lecture", "course", "manifesto"]);

type Props = { allowedTypes: string[]; houses?: { id: string; name: string }[] };

/**
 * Post composer — the type dropdown only lists types the caller is
 * actually allowed to create (`canCreatePostType`, PRODUCT.md §10). If a
 * member has no creation rights at their level, this isn't rendered at
 * all (see page.tsx). `houses` is optional and only has entries once a
 * real House exists (House of Rope, see ADR-0016) — lets a member tag
 * their post to a house so it shows up on that house's page.
 */
export default function ContentComposer({ allowedTypes, houses = [] }: Props) {
  const router = useRouter();
  const options: AllowedType[] = allowedTypes.map((type) => ({ type, label: LABELS[type] ?? type }));

  const [type, setType] = useState(options[0]?.type ?? "post");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [houseId, setHouseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: title.trim() || undefined,
        content: trimmed,
        houseId: houseId || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Could not publish.");
      setSubmitting(false);
      return;
    }

    setTitle("");
    setContent("");
    setHouseId("");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-8 space-y-3">
      {options.length > 1 ? (
        <select
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ width: "auto" }}
        >
          {options.map((o) => (
            <option key={o.type} value={o.type}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-label">{options[0].label}</p>
      )}

      {TITLED_TYPES.has(type) ? (
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={200}
        />
      ) : null}

      {houses.length > 0 ? (
        <select
          className="input"
          value={houseId}
          onChange={(e) => setHouseId(e.target.value)}
          style={{ width: "auto" }}
        >
          <option value="">No house</option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      ) : null}

      <textarea
        className="input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with the Club"
        rows={4}
        maxLength={20000}
      />

      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={submitting || !content.trim()}>
        {submitting ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}
