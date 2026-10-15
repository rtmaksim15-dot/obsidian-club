// Fullscreen photo viewer, no-way-out fix pass (2026-10-14, see
// DECISIONS.md) — pure, no DOM. A single-finger touch end position
// relative to its start, classified into the one carousel/close action
// it represents. Only ever called while the current image is at 1x
// (Lightbox.tsx arms pan instead of this whenever `scale > 1`), so
// there's no zoom/pan state to consider here.
export type SwipeAction = "close" | "prev" | "next" | "none";

export function classifySwipe(dx: number, dy: number, threshold: number): SwipeAction {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDy > absDx && dy > threshold) return "close";
  if (absDx > absDy && absDx > threshold) return dx < 0 ? "next" : "prev";
  return "none";
}
