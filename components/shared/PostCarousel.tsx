"use client";

import { useEffect, useState } from "react";
import VeiledPhoto from "./VeiledPhoto";
import Lightbox from "./Lightbox";

export type CarouselImage = { id: string; url: string; width: number | null; height: number | null };

type Props = {
  images: CarouselImage[];
  veiled: boolean;
  className?: string;
  // Navigation v2 fix pass (2026-10-11, see DECISIONS.md) — replaces
  // the always-visible trash icon this used to render directly on the
  // image (founder feedback: too easy to tap by accident while
  // swiping/zooming). Fires with whichever image is currently shown —
  // on mount and on every swipe — so PostCard can offer "Delete this
  // image" in the post's own "..." menu, acting on whichever image is
  // actually on screen.
  onActiveImageChange?: (imageId: string | null) => void;
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
export default function PostCarousel({ images, veiled, className, onActiveImageChange }: Props) {
  const [index, setIndex] = useState(0);
  // No-way-out fix pass (2026-10-14, see DECISIONS.md) — a single shared
  // Lightbox instance for the whole carousel (not one per thumbnail),
  // so opening any image lets the viewer swipe across all of them with
  // a working "i/N" counter, instead of each thumbnail's own isolated
  // single-image viewer.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Clamp if the image set shrinks from under us (e.g. the active
  // image was just deleted and a refresh hasn't landed new props yet).
  useEffect(() => {
    if (index >= images.length && images.length > 0) setIndex(images.length - 1);
  }, [images.length, index]);

  useEffect(() => {
    onActiveImageChange?.(images[index]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onActiveImageChange is expected to be a stable setter, not re-run per render
  }, [index, images]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return <VeiledPhoto src={images[0].url} alt="" className={className} veiled={veiled} />;
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
        {images.map((img, i) => (
          <div key={img.id} className="relative h-full w-full shrink-0 snap-start">
            <VeiledPhoto
              src={img.url}
              alt=""
              className="h-full w-full object-cover"
              veiled={veiled}
              onOpen={() => setLightboxIndex(i)}
            />
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

      {lightboxIndex !== null ? (
        <Lightbox
          images={images.map((img) => ({ src: img.url, alt: "", veiled }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}
