// Single source of truth for "is this an open DM thread" (item 1,
// 2026-09-22, see DECISIONS.md) — BottomNav.tsx hides itself on this
// route, and PlatformShell.tsx needs the identical condition to stop
// reserving pb-16 space for a nav that isn't there, or the thread's own
// h-dvh layout would run 64px past the bottom of the viewport, pushing
// the composer down behind the fold — the same "composer covered"
// symptom this whole item exists to fix, just from the padding side
// instead of the keyboard side. /messages itself and /messages/rules
// (the DM-rules interstitial) are not threads and keep the bottom nav.
export function isDmThreadRoute(pathname: string): boolean {
  return pathname.startsWith("/messages/") && pathname !== "/messages/rules";
}
