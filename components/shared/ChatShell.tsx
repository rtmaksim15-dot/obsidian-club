/**
 * Full-height chat screen shell — header pinned top, children (the
 * scrollable message list + composer) fill the rest, so only the
 * message list itself ever scrolls. Shared by Room chat and the DM
 * thread (2026-09-24, see DECISIONS.md): the DM thread's own fix for
 * this (2026-09-22) was applied only there, leaving Room chat with the
 * identical below-the-fold-composer bug on desktop. No hooks here, so
 * this stays a plain (server-renderable) component — the header can be
 * authored server-side by the page without forcing a client boundary
 * any higher than the chat body itself already requires.
 *
 * `h-dvh` (dynamic viewport height, not the static 100vh `min-h-screen`
 * Room chat used to fall back on) is what actually keeps the composer
 * above an open on-screen keyboard on iOS/Android — dvh shrinks with
 * the keyboard, static vh doesn't. `sm:h-[calc(100dvh-5rem)]` accounts
 * for PlatformShell's `sm:pt-20` (reserving space for the fixed
 * DesktopNav), which isn't route-aware and still pushes this block down
 * by that same 5rem on desktop — subtracting it back out here keeps
 * padding-top + box height summing to exactly 100dvh again, still
 * fully dvh-derived, never a hardcoded pixel height.
 *
 * `reserveBottomNavSpace` (found live while verifying Room chat on
 * mobile, 2026-09-24): unlike the DM thread's route — which hides
 * BottomNav entirely via isDmThreadRoute(), and correspondingly stops
 * PlatformShell reserving its `pb-16` — Room chat's route keeps the
 * mobile bottom nav and that same `pb-16`. A flat `h-dvh` on mobile here
 * ran exactly that reserved 64px past the true bottom of the viewport,
 * putting the composer behind the fixed nav — the identical "composer
 * covered" bug the DM thread's own comment already named, just from the
 * padding side, on the one route that never got the matching mobile
 * exemption. `h-[calc(100dvh-4rem)]` subtracts that same 4rem (64px)
 * back out on mobile when this route still reserves the space; pass
 * `false` only for a route where BottomNav is hidden the way the DM
 * thread's is.
 */
export default function ChatShell({
  header,
  children,
  reserveBottomNavSpace = true,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  reserveBottomNavSpace?: boolean;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden bg-ob-black text-ob-text sm:h-[calc(100dvh-5rem)] ${
        reserveBottomNavSpace ? "h-[calc(100dvh-4rem)]" : "h-dvh"
      }`}
    >
      {header}
      {children}
    </div>
  );
}
