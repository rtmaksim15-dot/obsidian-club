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

// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — the four
// destinations BottomTabBar.tsx's own ITEMS/TRAILING_ITEMS link to
// (Library included even though it's currently hidden behind
// LIBRARY_UI_ENABLED — the route still exists and still shouldn't grow
// a back button the moment that flag flips). TopBar.tsx uses this to
// decide whether to show its back button in place of the OC monogram:
// a tab-bar root is reached by tapping a tab, not by drilling in, so
// there's nothing above it to go back to.
const BOTTOM_TAB_ROOT_PATHS = ["/feed", "/rooms", "/vault", "/library"];

export function isBottomTabRoot(pathname: string): boolean {
  return BOTTOM_TAB_ROOT_PATHS.includes(pathname);
}
