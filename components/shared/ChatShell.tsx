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
 * the keyboard, static vh doesn't.
 *
 * Navigation v2 (Phase B, 2026-10-10, see DECISIONS.md): TopBar is now
 * universal on every breakpoint (replacing DesktopNav, which was
 * desktop-only) — the `sm:`-only top offset this component used to
 * need is now unconditional. `calc(100dvh-5rem)` subtracts
 * PlatformShell's `pt-20` (reserving space for the fixed TopBar, which
 * — like the old DesktopNav before it — is never route-hidden, even on
 * an open DM thread) back out, on every breakpoint, so padding-top +
 * box height still sum to exactly 100dvh.
 *
 * `reserveBottomNavSpace` (found live while verifying Room chat on
 * mobile, 2026-09-24): unlike the DM thread's route — which hides
 * BottomTabBar entirely via isDmThreadRoute(), and correspondingly
 * stops PlatformShell reserving its `pb-16` — Room chat's route keeps
 * the bottom tab bar and that same `pb-16`, now on every breakpoint
 * too (BottomTabBar replaced the old mobile-only BottomNav). Subtracts
 * that same 4rem (64px) back out when this route still reserves the
 * space; pass `false` only for a route where BottomTabBar is hidden
 * the way the DM thread's is.
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
      className={`flex flex-col overflow-hidden bg-ob-black text-ob-text ${
        reserveBottomNavSpace ? "h-[calc(100dvh-9rem)]" : "h-[calc(100dvh-5rem)]"
      }`}
    >
      {header}
      {children}
    </div>
  );
}
