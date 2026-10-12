// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — item 2.
// Pure decision at the core of the TopBar back button: history.back()
// is only safe once we know this tab actually has an earlier page of
// OUR OWN app on its history stack.
export type BackTarget = { type: "back" } | { type: "path"; path: string };

const FALLBACK_PATH = "/feed";
const VISITED_KEY = "oc-visited-before";
const CAN_BACK_KEY = "oc-can-go-back";

export function resolveBackTarget(hasInternalHistory: boolean): BackTarget {
  return hasInternalHistory ? { type: "back" } : { type: "path", path: FALLBACK_PATH };
}

/**
 * Called once per full page load (NavigationHistoryTracker, mounted in
 * the root layout, on every page). This app has no next/link anywhere
 * (confirmed: zero imports across app/ and components/) — every
 * internal link is a plain <a>, so each click is a full navigation,
 * not an SPA route change. That rules out usePathname()-diffing across
 * mounts (a fresh mount only ever sees ITS OWN single path — there's
 * never a "previous" pathname to compare against in the same component
 * instance). sessionStorage is what actually survives a full reload
 * within the same tab, so "was there an earlier page in this tab" has
 * to be answered with a read-then-write pair: read what the PREVIOUS
 * page's own call to this function already recorded (that becomes
 * THIS page's answer, captured once via canGoBack() below), then
 * record this page's own visit for whichever page comes next.
 */
export function recordPageLoad(): void {
  try {
    const visitedBefore = sessionStorage.getItem(VISITED_KEY) === "1";
    sessionStorage.setItem(CAN_BACK_KEY, visitedBefore ? "1" : "0");
    sessionStorage.setItem(VISITED_KEY, "1");
  } catch {
    // sessionStorage unavailable (private mode etc.) — canGoBack()
    // below just reads nothing, and the back button falls back to
    // /feed every time, never a crash.
  }
}

export function canGoBack(): boolean {
  try {
    return sessionStorage.getItem(CAN_BACK_KEY) === "1";
  } catch {
    return false;
  }
}
