"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { classifySwipe } from "@/lib/photo-viewer/gestures";
import { createHistoryGuard, type HistoryGuard } from "@/lib/photo-viewer/history-guard";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 3;
const SWIPE_DISTANCE_THRESHOLD = 60;

export type LightboxImage = { src: string; alt: string; veiled?: boolean };

type Props = {
  images: LightboxImage[];
  initialIndex?: number;
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
 * Fullscreen photo viewer (post photos, profile avatars, profile Photos
 * grid, keepsakes — 2026-09-30, extended 2026-10-14 for the no-way-out
 * fix pass, see DECISIONS.md). Hand-rolled rather than
 * @radix-ui/react-dialog (a dependency already in package.json but
 * unused everywhere else) or a pinch/zoom library — matches the same
 * "no dialog/portal primitive" convention ReportModal.tsx already
 * follows, and the interaction surface here is small enough not to
 * need one.
 *
 * Close: Escape, the ✕ button, a tap on the dark backdrop, or a
 * swipe-down on the current image (only while it isn't zoomed in —
 * see the single-finger touchstart branch below, which arms either
 * pan or swipe/close depending on `scale` at the moment the finger
 * lands). Every one of those routes through `requestClose`, which
 * pops the history entry this component pushed on mount — see the
 * "History" block below for why that's the one true close path.
 *
 * Carousel: `images.length > 1` adds a "current/total" counter,
 * left/right chevrons, swipe-left/right (also only while unzoomed),
 * and the ArrowLeft/ArrowRight keys. A single image renders exactly
 * as before (no counter, no chevrons).
 *
 * Zoom: mouse wheel or double-click on desktop, two-finger pinch on
 * touch, all clamped to at least 3x (MAX_SCALE=4 for a little headroom
 * past the spec'd minimum). No save button; the browser's own
 * right-click "Save Image" / long-press menu is left alone on purpose
 * (blocking it is trivially bypassed anyway, and blocking it wasn't
 * asked for).
 *
 * Veil: an image with `veiled: true` renders the same blur +
 * "Tap to reveal" treatment as the thumbnail grid (VeiledPhoto.tsx)
 * before showing the real photo — swiping into a still-veiled image
 * must never bypass that gate. Seeded revealed only for `initialIndex`
 * (the only index the caller can guarantee was already revealed,
 * since that's the one the member actually tapped to get here); any
 * other veiled index needs its own tap inside the viewer too. This is
 * intentionally a second, independent reveal state from the grid's
 * own (matching VeiledPhoto's own "never persisted" comment) — a
 * photo already revealed in the grid can still ask to be re-revealed
 * here. Minor, accepted redundancy rather than lifting shared state
 * across both call sites for this.
 *
 * Wheel and touchmove need a real (non-passive) listener to actually
 * stop the browser's own page/viewport zoom during a pinch — React
 * attaches onWheel/onTouchMove as passive by default, where
 * preventDefault() is silently ignored. Registered once via a ref
 * pointing at latest scale/translate instead of re-subscribing on every
 * frame of a drag.
 */
export default function Lightbox({ images, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(clamp(initialIndex, 0, images.length - 1));
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [broken, setBroken] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(() => new Set([initialIndex]));

  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Switching images (via swipe or the chevrons) always starts the new
  // image at 1x, never carrying over the previous image's zoom/pan.
  useEffect(() => {
    resetZoom();
    setBroken(false);
  }, [index, resetZoom]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);
  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, images.length - 1));
  }, [images.length]);

  // Body scroll lock, without the page jumping sideways (2026-09-30,
  // see DECISIONS.md) — `overflow: hidden` alone shifts everything left
  // the instant the scrollbar disappears; compensating with the same
  // width as right padding keeps the layout still. Also captures and
  // restores the exact scroll position on close — iOS Safari (and the
  // installed PWA in particular) can otherwise snap the page to the
  // top the moment `overflow` flips back, since nothing else pins it.
  useEffect(() => {
    const savedScrollY = window.scrollY;
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
      window.scrollTo(0, savedScrollY);
    };
  }, []);

  // History (fix pass, 2026-10-14, see DECISIONS.md) — opening the
  // viewer pushes one dummy history entry (same URL, so Next's own
  // router treats it as a no-op). The system/browser Back button (and
  // the Android back gesture) then pops it like any other entry,
  // closing the viewer instead of leaving the page entirely. Every
  // explicit close trigger below (✕/backdrop/swipe-down/Escape) calls
  // `requestClose()`, never `onClose` directly, so Back history never
  // accumulates a dead entry behind an already-closed viewer — see
  // lib/photo-viewer/history-guard.ts for the actual rule (pure,
  // unit-tested there) and why it's injected rather than inlined here.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const guardRef = useRef<HistoryGuard | null>(null);
  useEffect(() => {
    const guard = createHistoryGuard(
      {
        pushState: () => window.history.pushState({ obsidianLightbox: true }, ""),
        back: () => window.history.back(),
        addPopStateListener: (fn) => window.addEventListener("popstate", fn),
        removePopStateListener: (fn) => window.removeEventListener("popstate", fn),
      },
      () => onCloseRef.current(),
    );
    guardRef.current = guard;
    return () => {
      guard.dispose();
      guardRef.current = null;
    };
  }, []);

  const requestClose = useCallback(() => {
    guardRef.current?.requestClose();
  }, []);

  // Keyboard: Escape always closes; arrows navigate a multi-image
  // carousel. Held in a ref (rather than as the effect's own deps) so
  // the listener doesn't re-subscribe on every zoom/pan re-render.
  const actionsRef = useRef({ requestClose, goPrev, goNext });
  useEffect(() => {
    actionsRef.current = { requestClose, goPrev, goNext };
  });
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") actionsRef.current.requestClose();
      else if (e.key === "ArrowLeft") actionsRef.current.goPrev();
      else if (e.key === "ArrowRight") actionsRef.current.goNext();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const clampTranslate = useCallback((x: number, y: number, s: number) => {
    const maxOffset = ((s - 1) * Math.min(window.innerWidth, window.innerHeight)) / 2;
    return { x: clamp(x, -maxOffset, maxOffset), y: clamp(y, -maxOffset, maxOffset) };
  }, []);

  // Native, non-passive wheel + touchmove listeners — see the file
  // comment for why these can't be plain JSX props. Attached to the
  // whole container (not just the <img>) so a pinch/pan/swipe started
  // over the letterboxed backdrop margin around a non-square image
  // still works.
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
      } else if (e.touches.length === 1 && swipeRef.current) {
        // Not zoomed — this single finger is a carousel-swipe/close
        // gesture in progress (decided on touchend below). Suppress
        // the native scroll/bounce only; no live drag-follow visual.
        e.preventDefault();
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
      swipeRef.current = null;
    } else if (e.touches.length === 1) {
      if (scale > MIN_SCALE) {
        setInteracting(true);
        panRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          originX: translate.x,
          originY: translate.y,
        };
      } else {
        // Not zoomed — this finger might be a swipe (switch image) or
        // a swipe-down (close); decided on touchend by direction/
        // distance, not here.
        swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
      }
    }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) {
      endDrag();
      const swipeStart = swipeRef.current;
      swipeRef.current = null;
      if (!swipeStart) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - swipeStart.startX;
      const dy = touch.clientY - swipeStart.startY;
      const action = classifySwipe(dx, dy, SWIPE_DISTANCE_THRESHOLD);
      if (action === "close") requestClose();
      else if (action === "next") goNext();
      else if (action === "prev") goPrev();
    }
  }

  const current = images[index];
  const isVeiledHidden = Boolean(current.veiled) && !revealedIndices.has(index);
  const hasMultiple = images.length > 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90"
      style={{ touchAction: "none" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={requestClose}
        aria-label="Close"
        className="nav-control absolute z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50"
        style={{
          top: "max(env(safe-area-inset-top), 0.75rem)",
          right: "max(env(safe-area-inset-right), 0.75rem)",
          color: "var(--color-text-primary)",
        }}
      >
        <X size={22} strokeWidth={1.5} />
      </button>

      {hasMultiple ? (
        <span
          aria-label={`Photo ${index + 1} of ${images.length}`}
          className="text-caption absolute top-0 z-10 -translate-x-1/2 rounded-full px-2 py-0.5"
          style={{
            left: "50%",
            top: "max(env(safe-area-inset-top), 0.75rem)",
            backgroundColor: "rgba(10, 9, 8, 0.6)",
            color: "var(--color-text-primary)",
          }}
        >
          {index + 1}/{images.length}
        </span>
      ) : null}

      {hasMultiple && index > 0 ? (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous photo"
          className="nav-control absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50"
          style={{ color: "var(--color-text-primary)" }}
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
      ) : null}
      {hasMultiple && index < images.length - 1 ? (
        <button
          type="button"
          onClick={goNext}
          aria-label="Next photo"
          className="nav-control absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50"
          style={{ color: "var(--color-text-primary)" }}
        >
          <ChevronRight size={22} strokeWidth={1.5} />
        </button>
      ) : null}

      {broken ? (
        <p className="text-body px-6 text-center" style={{ color: "var(--color-text-secondary)" }}>
          This photo is no longer available. Try reloading the page.
        </p>
      ) : isVeiledHidden ? (
        <div className="relative h-[90vh] w-[90vw]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
            style={{ filter: "blur(24px)" }}
          />
          <button
            type="button"
            onClick={() => setRevealedIndices((prev) => new Set(prev).add(index))}
            aria-label="Tap to reveal image"
            className="text-body absolute inset-0 flex items-center justify-center"
            style={{ color: "var(--color-text-primary)", backgroundColor: "rgba(10, 9, 8, 0.4)" }}
          >
            Tap to reveal
          </button>
        </div>
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
          key={current.src}
          src={current.src}
          alt={current.alt}
          draggable={false}
          onError={() => setBroken(true)}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          className="h-[90vh] w-[90vw] select-none object-contain"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: interacting ? "none" : "transform 0.15s ease-out",
            cursor: scale > MIN_SCALE ? "grab" : "zoom-in",
          }}
        />
      )}
    </div>
  );
}
