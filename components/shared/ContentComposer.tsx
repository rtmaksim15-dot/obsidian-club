"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

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
 * all (see page.tsx). `houses` lists only houses the caller has actually
 * joined (Feed & Posts MVP, 2026-07-16 — `/api/posts` rejects a houseId
 * the caller isn't a member of).
 *
 * Photo upload is a single optional image, uploaded to Supabase Storage
 * (`POST /api/posts/photo`) before the post itself — the returned URL
 * rides along in the post-creation request as `photoUrl`.
 */
export default function ContentComposer({ allowedTypes, houses = [] }: Props) {
  const router = useRouter();
  const options: AllowedType[] = allowedTypes.map((type) => ({ type, label: LABELS[type] ?? type }));

  const [type, setType] = useState(options[0]?.type ?? "post");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [houseId, setHouseId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (options.length === 0) return null;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    let photoUrl: string | undefined;
    if (photo) {
      const formData = new FormData();
      formData.append("file", photo);
      const uploadRes = await fetch("/api/posts/photo", { method: "POST", body: formData });
      const uploadBody = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setError(uploadBody?.error ?? "Could not upload photo.");
        setSubmitting(false);
        return;
      }
      photoUrl = uploadBody.url;
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: title.trim() || undefined,
        content: trimmed,
        houseId: houseId || undefined,
        photoUrl,
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
    clearPhoto();
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
          <option value="">No house — post globally</option>
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

      {photoPreview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoPreview} alt="" className="max-h-48 rounded-ob object-cover" />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute right-2 top-2 rounded-full bg-ob-black/70 p-1"
            aria-label="Remove photo"
          >
            <X size={14} strokeWidth={2} style={{ color: "var(--color-text-primary)" }} />
          </button>
        </div>
      ) : (
        <label className="btn-secondary inline-flex w-fit cursor-pointer items-center gap-2">
          <ImagePlus size={16} strokeWidth={1.5} />
          Add photo
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </label>
      )}

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
