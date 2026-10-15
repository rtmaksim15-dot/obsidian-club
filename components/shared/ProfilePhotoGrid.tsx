"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

type Photo = { postId: string; imageUrl: string };

// Profile lite, B5 (Package 4, Phase B, 2026-10-13, see DECISIONS.md) —
// the "Photos" tab: every image from the member's own published posts,
// newest post first. A plain grid, not the full post-card list the old
// flat layout showed — that's what "Photos" (a dedicated tab, distinct
// from "About") asked for.
//
// No-way-out fix pass (2026-10-14, see DECISIONS.md) — tapping a photo
// now opens the same shared fullscreen Lightbox every other photo
// surface uses (feed, post page, keepsakes), swiping across the whole
// grid, rather than navigating to that photo's post (the only
// inconsistent call site found when auditing every place that opens
// "the viewer" — see that entry). A member who wants the post itself
// (to comment, etc.) still has it one tap away on the adjacent "Posts"
// tab of this same page — nothing is actually unreachable. These grid
// thumbnails were never veiled to begin with (unlike the Posts tab's
// own PostCard/PostCarousel), so the viewer opens them as plain,
// unveiled images too — flagged, not fixed, as a separate pre-existing
// gap in TECH_DEBT.md.
export default function ProfilePhotoGrid({ photos }: { photos: Photo[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
        No photos yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {photos.map((photo, i) => (
        <button
          key={`${photo.postId}-${i}`}
          type="button"
          onClick={() => setLightboxIndex(i)}
          className="nav-control block aspect-square overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.imageUrl} alt="" className="h-full w-full object-cover" style={{ cursor: "zoom-in" }} />
        </button>
      ))}

      {lightboxIndex !== null ? (
        <Lightbox
          images={photos.map((photo) => ({ src: photo.imageUrl, alt: "" }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}
