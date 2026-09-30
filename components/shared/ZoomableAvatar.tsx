"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

type Props = {
  avatarUrl: string | null;
  displayName: string;
  className: string;
};

/**
 * Profile avatar (2026-09-30, see DECISIONS.md) — same click-to-open
 * `Lightbox` pattern as `ZoomableImage` (post photos), just carrying its
 * own fallback-initial rendering since the avatar can be missing. A
 * missing avatar renders the same plain initial it always has and isn't
 * clickable — there's no photo underneath it to view large.
 */
export default function ZoomableAvatar({ avatarUrl, displayName, className }: Props) {
  const [open, setOpen] = useState(false);

  if (!avatarUrl) {
    return (
      <div className={className}>
        <div className="flex h-full w-full items-center justify-center bg-ob-surface text-2xl">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} style={{ cursor: "zoom-in" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
      </button>
      {open ? <Lightbox src={avatarUrl} alt={displayName} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
