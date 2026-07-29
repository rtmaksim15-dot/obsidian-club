"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/auth/supabase-browser";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — must match app/api/posts/photo/route.ts

type Props = { houses?: { id: string; name: string }[] };

/**
 * Post composer (Threads-level simplicity, OBSIDIAN_ROADMAP_v3.0's
 * feed-first v1: "one button: photo + text. Published. Done."). Every
 * member can create a `post` (min level 1, lib/rating/content-rights.ts),
 * so there's no type selector to gate — other post types (article/
 * lecture/course) belong to Library's own composer whenever that's
 * rebuilt (see TECH_DEBT.md — this component used to serve both).
 *
 * Lives on its own screen (`/compose`, reached from the bottom nav's
 * center "+" tab) rather than inline on /feed — the 2026-07-29 nav
 * redesign made the feed pure content, no composer at the top.
 *
 * Photo upload is two steps, not a direct proxy through this app's own
 * API route: `POST /api/posts/photo` hands back a signed Supabase
 * Storage upload URL/token, and the browser uploads the file straight
 * to Storage. This bypasses Vercel Serverless Functions' hard 4.5MB
 * request-body cap — real phone photos routinely exceed that, which is
 * exactly what caused production's "Could not upload photo" failures
 * (the file never got proxied through the old flow; Storage itself was
 * always fine — see DECISIONS.md, 2026-07-29).
 */
export default function ContentComposer({ houses = [] }: Props) {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [houseId, setHouseId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_BYTES) {
      setError("Image must be 8MB or smaller.");
      return;
    }
    setError(null);
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadPhoto(file: File): Promise<string> {
    const signRes = await fetch("/api/posts/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    });
    const signBody = await signRes.json().catch(() => ({}));
    if (!signRes.ok) {
      throw new Error(signBody?.error ?? "Could not upload photo.");
    }

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(signBody.bucket)
      .uploadToSignedUrl(signBody.path, signBody.token, file, { contentType: file.type });
    if (uploadError) {
      throw new Error("Could not upload photo. Try again shortly.");
    }

    return signBody.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    let photoUrl: string | undefined;
    if (photo) {
      try {
        photoUrl = await uploadPhoto(photo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not upload photo.");
        setSubmitting(false);
        return;
      }
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "post",
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

    setSubmitting(false);
    router.push("/feed");
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-8 space-y-3">
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
