"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, MessageCircle, Bell } from "lucide-react";
import LogoMark from "@/components/ui/LogoMark";
import WorldDrawer, { type WorldDrawerProps } from "./WorldDrawer";
import MineMenu, { type MineMenuProps } from "./MineMenu";
import { SEARCH_UI_ENABLED } from "@/lib/config/feature-flags";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] leading-none"
      style={{ backgroundColor: "var(--color-accent)", color: "var(--color-text-primary)" }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

type Props = {
  avatarUrl: string | null;
  displayName: string;
  unreadDmCount: number;
  unreadNotificationCount: number;
  worldDrawerProps: WorldDrawerProps;
  mineMenuProps: MineMenuProps;
};

// Navigation v2, B1 (2026-10-10, see DECISIONS.md) — top bar on every
// member screen: OC monogram (left, -> /feed) - menu (-> THE WORLD) -
// [search, if SEARCH_UI_ENABLED] - Messages+badge - Notifications+badge
// - Avatar (-> MINE). Rendered on ALL breakpoints (replaces the old
// DesktopNav entirely, and is new on mobile, which previously had no
// top bar at all) — see DECISIONS.md for why this session chose a
// single universal nav shell over keeping the old mobile/desktop fork.
export default function TopBar({
  avatarUrl,
  displayName,
  unreadDmCount,
  unreadNotificationCount,
  worldDrawerProps,
  mineMenuProps,
}: Props) {
  const [worldOpen, setWorldOpen] = useState(false);
  const [mineOpen, setMineOpen] = useState(false);
  const pathname = usePathname();

  // Navigation v2 fix pass (2026-10-11, see DECISIONS.md) — item 1.
  // Same active treatment BottomTabBar's own tabs already use
  // (accent color + thin gold underline), applied here to Messages/
  // Notifications. The avatar gets a ring instead of an underline (it
  // isn't a text+icon tab) on the member's own profile or /keepsakes —
  // both are "mine" destinations reachable from this same avatar.
  const messagesActive = pathname.startsWith("/messages");
  const notificationsActive = pathname.startsWith("/notifications");
  const avatarActive =
    (mineMenuProps.username != null && pathname.startsWith(`/profile/${mineMenuProps.username}`)) ||
    pathname.startsWith("/keepsakes");

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-ob-border bg-ob-dark px-4 py-3"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <a href="/feed" aria-label="Feed" className="nav-control flex items-center">
          <LogoMark size={30} />
        </a>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setWorldOpen(true)}
            className="nav-control"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>

          {SEARCH_UI_ENABLED ? (
            <a href="/search" aria-label="Search" className="nav-control" style={{ color: "var(--color-text-secondary)" }}>
              <Search size={22} strokeWidth={1.5} />
            </a>
          ) : null}

          <a
            href="/messages"
            aria-label="Messages"
            aria-current={messagesActive ? "page" : undefined}
            className="nav-control relative"
            style={{ color: messagesActive ? "var(--color-accent)" : "var(--color-text-secondary)" }}
          >
            <MessageCircle size={22} strokeWidth={1.5} />
            <Badge count={unreadDmCount} />
            {messagesActive ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-[9px] left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: "var(--color-gold)" }}
              />
            ) : null}
          </a>

          <a
            href="/notifications"
            aria-label="Notifications"
            aria-current={notificationsActive ? "page" : undefined}
            className="nav-control relative"
            style={{ color: notificationsActive ? "var(--color-accent)" : "var(--color-text-secondary)" }}
          >
            <Bell size={22} strokeWidth={1.5} />
            <Badge count={unreadNotificationCount} />
            {notificationsActive ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-[9px] left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: "var(--color-gold)" }}
              />
            ) : null}
          </a>

          <button
            type="button"
            aria-label="Open my menu"
            aria-current={avatarActive ? "page" : undefined}
            onClick={() => setMineOpen(true)}
            className="nav-control avatar h-8 w-8"
            style={avatarActive ? { boxShadow: "0 0 0 2px var(--color-gold)" } : undefined}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </nav>

      <WorldDrawer open={worldOpen} onOpenChange={setWorldOpen} {...worldDrawerProps} />
      <MineMenu open={mineOpen} onOpenChange={setMineOpen} {...mineMenuProps} />
    </>
  );
}
