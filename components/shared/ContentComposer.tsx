"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/auth/supabase-browser";
import { compressImage } from "@/lib/utils/compressImage";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB safety net, post-compression — must match app/api/posts/photo/route.ts

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
 * Photo upload: the file is compressed client-side first
 * (`lib/utils/compressImage.ts` — resize to max 2048px long side,
 * re-encode as JPEG) before anything is uploaded. Real iPhone photos
 * routinely land well over 8MB uncompressed — compression is what
 * gets them under that cap in the first place, not a fallback for
 * when they don't. 8MB stays as a post-compression safety net.
 *
 * Upload itself is two steps, not a direct proxy through this app's
 * own API route: `POST /api/posts/photo` hands back a signed Supabase
 * Storage upload URL/token, and the browser uploads the (already-
 * compressed) file straight to Storage. This bypasses Vercel Serverless
 * Functions' hard 4.5MB request-body cap — see DECISIONS.md,
 * 2026-07-29.
 */
export default function ContentComposer({ houses = [] }: Props) {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [houseId, setHouseId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // Member protection mechanics (pre-launch legal package, 2026-08-09):
  // required, unchecked by default, only relevant (and only rendered)
  // once a photo is actually attached — a text-only post has no one
  // depicted in it to consent for.
  const [imageConsent, setImageConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    setError(null);
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > MAX_BYTES) {
        setError("Image must be 8MB or smaller.");
        return;
      }
      setPhoto(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setError("Could not process image.");
    } finally {
      setCompressing(false);
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    setImageConsent(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Returns a curated error message on failure instead of throwing —
  // a raw fetch() network exception (offline, DNS, CORS) never carries
  // a human-authored message, so handleSubmit's catch can't safely
  // distinguish "ours" from "raw" if this throws (Block 3, August
  // hardening pass, 2026-08-04).
  async function uploadPhoto(file: File): Promise<{ url: string } | { error: string }> {
    const signRes = await fetch("/api/posts/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    });
    const signBody = await signRes.json().catch(() => ({}));
    if (!signRes.ok) {
      return { error: signBody?.error ?? "Could not upload photo." };
    }

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(signBody.bucket)
      .uploadToSignedUrl(signBody.path, signBody.token, file, { contentType: file.type });
    if (uploadError) {
      return { error: "Could not upload photo. Try again shortly." };
    }

    return { url: signBody.publicUrl };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    if (photo && !imageConsent) return;

    setSubmitting(true);
    setError(null);

    let photoUrl: string | undefined;
    if (photo) {
      const result = await uploadPhoto(photo).catch(() => ({ error: "Could not upload photo." }));
      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      photoUrl = result.url;
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "post",
        content: trimmed,
        houseId: houseId || undefined,
        photoUrl,
        imageConsentGiven: photo ? imageConsent : undefined,
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
          <label className="mt-3 flex items-start gap-2">
            <input
              type="checkbox"
              checked={imageConsent}
              onChange={(e) => setImageConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
              Everyone shown is a consenting adult (18+), and I have their specific, informed, revocable consent
              to post this here.
            </span>
          </label>
        </div>
      ) : (
        <label
          className={`btn-secondary inline-flex w-fit items-center gap-2 ${compressing ? "cursor-wait opacity-60" : "cursor-pointer"}`}
        >
          <ImagePlus size={16} strokeWidth={1.5} />
          {compressing ? "Processing…" : "Add photo"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={compressing}
            onChange={handlePhotoChange}
          />
        </label>
      )}

      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn-primary"
        disabled={submitting || compressing || !content.trim() || (Boolean(photo) && !imageConsent)}
      >
        {submitting ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}
