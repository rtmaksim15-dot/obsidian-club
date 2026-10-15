"use client";

import { useState } from "react";
import ZoomableImage from "./ZoomableImage";

type Props = {
  src: string;
  alt: string;
  className?: string;
  veiled: boolean;
  // Forwarded straight to ZoomableImage — see that component's own
  // comment (multi-photo carousel fix pass, 2026-10-14, DECISIONS.md).
  onOpen?: () => void;
};

// Veil (Phase B, B6, 2026-10-10, see DECISIONS.md) — reveal is per-image
// and never persisted (local component state only), exactly per spec.
// Wraps ZoomableImage rather than replacing it, so a revealed image
// still opens the full Lightbox/zoom experience exactly as before.
export default function VeiledPhoto({ src, alt, className, veiled, onOpen }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (!veiled || revealed) {
    return <ZoomableImage src={src} alt={alt} className={className} onOpen={onOpen} />;
  }

  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" className={className} style={{ filter: "blur(24px)" }} />
      <button
        type="button"
        onClick={() => setRevealed(true)}
        aria-label="Tap to reveal image"
        className="text-caption absolute inset-0 flex items-center justify-center"
        style={{ color: "var(--color-text-primary)", backgroundColor: "rgba(10, 9, 8, 0.4)" }}
      >
        Tap to reveal
      </button>
    </div>
  );
}
