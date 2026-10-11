"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/auth/supabase-browser";
import { compressImage } from "@/lib/utils/compressImage";
import { MIN_MEMBER_AGE } from "@/lib/legal/eligibility";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB safety net, post-compression — must match app/api/posts/photo/route.ts
// Multi-photo posts, Phase C (C2/C4, 2026-10-10, see DECISIONS.md) —
// hardcoded to match MAX_PHOTOS_PER_POST's default (lib/config/
// limits.ts) rather than reading the env var client-side: the copy
// below ("Up to three images," "Three is the limit.") is already
// spelled out in words, not generated from a number, and the server
// is what actually enforces the real limit regardless of what this
// says.
const MAX_PHOTOS = 3;

type ComposerPhoto = { file: File; preview: string; width: number; height: number };

function readDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

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
  // Multi-photo posts, Phase C (2026-10-10, see DECISIONS.md) — up to
  // MAX_PHOTOS, order is the array order (drag to reorder below).
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  // Member protection mechanics (pre-launch legal package, 2026-08-09):
  // required, unchecked by default, only relevant (and only rendered)
  // once at least one photo is attached — a text-only post has no one
  // depicted in it to consent for. One checkbox covers every attached
  // photo (C4's own wording change: "this image" -> "these images").
  const [imageConsent, setImageConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) return;

    setError(null);
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > MAX_BYTES) {
        setError("Image must be 8MB or smaller.");
        return;
      }
      const { width, height } = await readDimensions(compressed);
      setPhotos((prev) => [...prev, { file: compressed, preview: URL.createObjectURL(compressed), width, height }]);
    } catch {
      setError("Could not process image.");
    } finally {
      setCompressing(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function reorderPhotos(from: number, to: number) {
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
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
    // Photo-only posts (2026-09-29, see DECISIONS.md) — a photo is a
    // complete post on its own; text is only required when there isn't
    // one.
    if (!trimmed && photos.length === 0) return;
    if (photos.length > 0 && !imageConsent) return;

    setSubmitting(true);
    setError(null);

    // Multi-photo posts, Phase C (2026-10-10, see DECISIONS.md) —
    // uploaded one at a time, in order, so a failure partway through
    // reports clearly rather than racing N uploads and untangling which
    // one failed.
    const uploadedPhotos: { url: string; width: number; height: number }[] = [];
    for (const photo of photos) {
      const result = await uploadPhoto(photo.file).catch(() => ({ error: "Could not upload photo." }));
      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      uploadedPhotos.push({ url: result.url, width: photo.width, height: photo.height });
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "post",
        content: trimmed,
        houseId: houseId || undefined,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
        imageConsentGiven: uploadedPhotos.length > 0 ? imageConsent : undefined,
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

      {/* Multi-photo posts, Phase C (C4, 2026-10-10, see DECISIONS.md) —
          up to MAX_PHOTOS thumbnails, drag to reorder, each individually
          removable. Native HTML5 drag-and-drop — no library, same
          "nothing exists elsewhere in this codebase to be consistent
          with" reasoning the composer's own file comment already gives
          for not using a dialog/portal primitive. */}
      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div
              key={p.preview}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== i) reorderPhotos(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className="relative cursor-move"
              style={{ opacity: dragIndex === i ? 0.5 : 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-24 w-24 rounded-ob object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 rounded-full bg-ob-black/70 p-1"
                aria-label={`Remove image ${i + 1}`}
              >
                <X size={14} strokeWidth={2} style={{ color: "var(--color-text-primary)" }} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {photos.length > 0 ? (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={imageConsent}
            onChange={(e) => setImageConsent(e.target.checked)}
            className="mt-0.5"
          />
          {/* Final wording approved 2026-09-30 (see DECISIONS.md) — "these
              images" (plural) is C4's own, otherwise-unchanged edit. */}
          <span className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
            Everyone shown is an adult ({MIN_MEMBER_AGE}+) and has consented to these images being shared.
          </span>
        </label>
      ) : null}

      {photos.length < MAX_PHOTOS ? (
        <div>
          <label
            className={`btn-secondary inline-flex w-fit items-center gap-2 ${compressing ? "cursor-wait opacity-60" : "cursor-pointer"}`}
          >
            <ImagePlus size={16} strokeWidth={1.5} />
            {compressing ? "Processing…" : photos.length > 0 ? "Add another" : "Add photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={compressing}
              onChange={handlePhotoChange}
            />
          </label>
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            Up to three images.
          </p>
        </div>
      ) : (
        <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
          Three is the limit.
        </p>
      )}

      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      {/* Publish is disabled, not merely inert, while the consent box is
          unchecked — before the button itself had any :disabled styling
          (see globals.css, 2026-09-29), that state was indistinguishable
          from a working button that silently did nothing on click. This
          spells out why, on top of the visual fix. */}
      {photos.length > 0 && !imageConsent ? (
        <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
          Check the consent box above to publish.
        </p>
      ) : null}

      <button
        type="submit"
        className="btn-primary"
        disabled={submitting || compressing || (!content.trim() && photos.length === 0) || (photos.length > 0 && !imageConsent)}
      >
        {submitting ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}
