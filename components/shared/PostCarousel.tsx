"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import VeiledPhoto from "./VeiledPhoto";
import ConfirmDialog from "./ConfirmDialog";

export type CarouselImage = { id: string; url: string; width: number | null; height: number | null };

type Props = {
  postId: string;
  images: CarouselImage[];
  veiled: boolean;
  className?: string;
  // C6 (2026-10-10, see DECISIONS.md) — "author can delete a single
  // image from their post." Only the post's own author gets this
  // control; PostCard computes that once (`isOwn`) and passes it down.
  canManage?: boolean;
};

// Multi-photo posts, Phase C (C5, 2026-10-10, see DECISIONS.md). A
// single image renders exactly as PostCard always has — no counter,
// no dots, same VeiledPhoto call — so an old, backfilled single-photo
// post is visually unchanged. Only 2+ images get the carousel: a
// native horizontal-scroll-snap strip (no gesture math to hand-roll,
// unlike Lightbox's pinch/pan — a plain swipe is exactly what
// scroll-snap already gives for free), sized to the FIRST image's
// aspect ratio. Veil applies per image — each VeiledPhoto below has
// its own independent reveal state, exactly as if each were its own
// PostCard photo.
export default function PostCarousel({ postId, images, veiled, className, canManage = false }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeImage(imageId: string) {
    setRemoving(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/images/${imageId}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    setRemoving(false);
    setConfirmingId(null);
    if (!res.ok) {
      setError(body?.error ?? "Could not remove the image.");
      return;
    }
    router.refresh();
  }

  if (images.length === 0) return null;

  const deleteButton = (imageId: string) =>
    canManage ? (
      <button
        type="button"
        onClick={() => setConfirmingId(imageId)}
        aria-label="Remove this image"
        className="absolute left-2 top-2 rounded-full bg-ob-black/70 p-1.5"
        style={{ color: "var(--color-text-primary)" }}
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    ) : null;

  const confirmDialog = confirmingId ? (
    <ConfirmDialog
      title="Remove this image from the post?"
      confirmLabel="Remove"
      busy={removing}
      onConfirm={() => removeImage(confirmingId)}
      onCancel={() => setConfirmingId(null)}
    />
  ) : null;

  if (images.length === 1) {
    return (
      <div className="relative">
        <VeiledPhoto src={images[0].url} alt="" className={className} veiled={veiled} />
        {deleteButton(images[0].id)}
        {error ? (
          <p className="text-caption absolute bottom-2 left-2 right-2" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        ) : null}
        {confirmDialog}
      </div>
    );
  }

  const first = images[0];
  const aspectRatio = first.width && first.height ? `${first.width} / ${first.height}` : "4 / 3";

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  }

  return (
    <div className={`relative overflow-hidden rounded-ob ${className ?? ""}`} style={{ aspectRatio }}>
      <div
        className="flex h-full snap-x snap-mandatory overflow-x-auto"
        onScroll={onScroll}
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((img) => (
          <div key={img.id} className="relative h-full w-full shrink-0 snap-start">
            <VeiledPhoto src={img.url} alt="" className="h-full w-full object-cover" veiled={veiled} />
            {deleteButton(img.id)}
          </div>
        ))}
      </div>

      <span
        aria-label={`Image ${index + 1} of ${images.length}`}
        className="text-caption absolute right-2 top-2 rounded-full px-2 py-0.5"
        style={{ backgroundColor: "rgba(10, 9, 8, 0.6)", color: "var(--color-text-primary)" }}
      >
        {index + 1}/{images.length}
      </span>

      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
        {images.map((img, i) => (
          <span
            key={img.id}
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: i === index ? "var(--color-text-primary)" : "rgba(255,255,255,0.4)" }}
          />
        ))}
      </div>

      {error ? (
        <p
          className="text-caption absolute bottom-6 left-2 right-2 text-center"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      ) : null}
      {confirmDialog}
    </div>
  );
}
