"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 3;

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

// Accepts both the DOM `Touch` (native listeners) and React's own
// `Touch` type (JSX handlers) — only clientX/clientY are ever used.
function touchDistance(t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Fullscreen photo viewer (post photos, profile avatars — 2026-09-30,
 * see DECISIONS.md). Hand-rolled rather than @radix-ui/react-dialog
 * (a dependency already in package.json but unused everywhere else) or
 * a pinch/zoom library — matches the same "no dialog/portal primitive"
 * convention ReportModal.tsx already follows, and the interaction
 * surface here is small enough not to need one.
 *
 * Close: Escape, the button, or a click on the backdrop itself — never
 * a click on the image, since that's reserved for double-click-to-zoom
 * and drag-to-pan. Zoom: mouse wheel or double-click on desktop,
 * two-finger pinch on touch, all clamped to at least 3x (MAX_SCALE=4
 * for a little headroom past the spec'd minimum). No save button; the
 * browser's own right-click "Save Image" / long-press menu is left
 * alone on purpose (blocking it is trivially bypassed anyway, and
 * blocking it wasn't asked for).
 *
 * Wheel and touchmove need a real (non-passive) listener to actually
 * stop the browser's own page/viewport zoom during a pinch — React
 * attaches onWheel/onTouchMove as passive by default, where
 * preventDefault() is silently ignored. Registered once via a ref
 * pointing at latest scale/translate instead of re-subscribing on every
 * frame of a drag.
 */
export default function Lightbox({ src, alt, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [broken, setBroken] = useState(false);
  const [interacting, setInteracting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  // Body scroll lock, without the page jumping sideways (2026-09-30,
  // see DECISIONS.md) — `overflow: hidden` alone shifts everything left
  // the instant the scrollbar disappears; compensating with the same
  // width as right padding keeps the layout still.
  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const clampTranslate = useCallback((x: number, y: number, s: number) => {
    const maxOffset = ((s - 1) * Math.min(window.innerWidth, window.innerHeight)) / 2;
    return { x: clamp(x, -maxOffset, maxOffset), y: clamp(y, -maxOffset, maxOffset) };
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Native, non-passive wheel + touchmove listeners — see the file
  // comment for why these can't be plain JSX props.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = -e.deltaY * 0.0018;
      const next = clamp(scaleRef.current * (1 + delta), MIN_SCALE, MAX_SCALE);
      setScale(next);
      if (next === MIN_SCALE) setTranslate({ x: 0, y: 0 });
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const d = touchDistance(e.touches[0], e.touches[1]);
        const next = clamp((d / pinchRef.current.startDistance) * pinchRef.current.startScale, MIN_SCALE, MAX_SCALE);
        setScale(next);
        if (next === MIN_SCALE) setTranslate({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && panRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panRef.current.startX;
        const dy = e.touches[0].clientY - panRef.current.startY;
        setTranslate(clampTranslate(panRef.current.originX + dx, panRef.current.originY + dy, scaleRef.current));
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [clampTranslate]);

  function handleDoubleClick() {
    if (scale > MIN_SCALE) {
      resetZoom();
    } else {
      setScale(DOUBLE_TAP_SCALE);
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= MIN_SCALE) return;
    setInteracting(true);
    panRef.current = { startX: e.clientX, startY: e.clientY, originX: translate.x, originY: translate.y };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setTranslate(clampTranslate(panRef.current.originX + dx, panRef.current.originY + dy, scale));
  }
  function endDrag() {
    panRef.current = null;
    setInteracting(false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchRef.current = { startDistance: touchDistance(e.touches[0], e.touches[1]), startScale: scale };
      panRef.current = null;
    } else if (e.touches.length === 1 && scale > MIN_SCALE) {
      setInteracting(true);
      panRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        originX: translate.x,
        originY: translate.y,
      };
    }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) endDrag();
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50"
        style={{ color: "var(--color-text-primary)" }}
      >
        <X size={22} strokeWidth={1.5} />
      </button>

      {broken ? (
        <p className="text-body px-6 text-center" style={{ color: "var(--color-text-secondary)" }}>
          This photo is no longer available. Try reloading the page.
        </p>
      ) : (
        // `h-[90vh] w-[90vw]` (not max-h/max-w) is deliberate — an <img>
        // with only a max-size never grows past its own natural pixel
        // size, so a small source (e.g. an old low-res avatar) rendered
        // tiny and centered instead of filling the viewer. Forcing the
        // box to the full 90vh/90vw and letting object-contain fit the
        // image inside it scales small images up and large ones down,
        // in both cases preserving aspect ratio.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setBroken(true)}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="h-[90vh] w-[90vw] select-none object-contain"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: interacting ? "none" : "transform 0.15s ease-out",
            cursor: scale > MIN_SCALE ? "grab" : "zoom-in",
            touchAction: "none",
          }}
        />
      )}
    </div>
  );
}
