"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

type Props = {
  src: string;
  alt: string;
  className?: string;
  // Multi-photo carousel fix pass (2026-10-14, see DECISIONS.md) — when
  // a caller with several images (PostCarousel) needs one shared,
  // carousel-aware Lightbox instance instead of each thumbnail owning
  // its own single-image one, it passes this to take over the click
  // instead of this component's own `open` state below.
  onOpen?: () => void;
};

/**
 * Thin client island (2026-09-30, see DECISIONS.md) wrapping a plain
 * thumbnail `<img>` with a click-to-open `Lightbox` — kept separate
 * from `PostCard`/the profile pages so those can stay server components;
 * only this small piece needs to be interactive, same pattern
 * `LikeButton`/`ContentMenu` already use inside `PostCard`. Uncontrolled
 * by default (owns its own single-image Lightbox) — see `onOpen` above
 * for the one caller that takes over instead.
 */
export default function ZoomableImage({ src, alt, className, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const handleClick = onOpen ?? (() => setOpen(true));

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={className}
        style={{ cursor: "zoom-in" }}
        onClick={handleClick}
      />
      {!onOpen && open ? <Lightbox images={[{ src, alt }]} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
