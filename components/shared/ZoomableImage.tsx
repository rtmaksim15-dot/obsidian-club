"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Thin client island (2026-09-30, see DECISIONS.md) wrapping a plain
 * thumbnail `<img>` with a click-to-open `Lightbox` — kept separate
 * from `PostCard`/the profile pages so those can stay server components;
 * only this small piece needs to be interactive, same pattern
 * `LikeButton`/`ContentMenu` already use inside `PostCard`.
 */
export default function ZoomableImage({ src, alt, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={className}
        style={{ cursor: "zoom-in" }}
        onClick={() => setOpen(true)}
      />
      {open ? <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
