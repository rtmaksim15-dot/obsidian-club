// Fullscreen photo viewer, no-way-out fix pass (2026-10-14, see
// DECISIONS.md) — the whole "opening pushes a history entry; the
// system/browser Back closes the viewer; an explicit close (✕,
// backdrop, swipe-down, Escape) pops that same entry so Back history
// stays clean" rule, as one pure unit with its side effects injected
// (`deps`) instead of calling `window.history`/`window.addEventListener`
// directly — this project's test runner is Node-only, no DOM (see
// vitest.config.ts), so this is what makes the rule itself unit-
// testable without one. Lightbox.tsx is the thin wrapper that supplies
// the real `window.history` and real listener functions as `deps`.
//
// The one invariant this exists to guarantee: `onClose` is NEVER called
// directly by an explicit close trigger — only `deps.back()` is, and
// `onClose` fires exclusively from the popstate callback. Both the
// real "user pressed Back" case and the "user tapped ✕" case are
// therefore the exact same code path once `deps.back()` has run,
// so there's only one way this can go wrong instead of two.
export type HistoryGuardDeps = {
  pushState: () => void;
  back: () => void;
  addPopStateListener: (fn: () => void) => void;
  removePopStateListener: (fn: () => void) => void;
};

export type HistoryGuard = {
  /** Call from every explicit close trigger (✕, backdrop, swipe-down, Escape). */
  requestClose: () => void;
  /** Call on unmount to stop listening for further Back presses. */
  dispose: () => void;
};

export function createHistoryGuard(deps: HistoryGuardDeps, onClose: () => void): HistoryGuard {
  function handlePopState() {
    onClose();
  }

  deps.pushState();
  deps.addPopStateListener(handlePopState);

  return {
    requestClose: () => deps.back(),
    dispose: () => deps.removePopStateListener(handlePopState),
  };
}
