"use client";

import { useState } from "react";
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

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-ob-border bg-ob-dark px-4 py-3"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <a href="/feed" aria-label="Feed" className="flex items-center">
          <LogoMark size={30} />
        </a>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setWorldOpen(true)}
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>

          {SEARCH_UI_ENABLED ? (
            <a href="/search" aria-label="Search" style={{ color: "var(--color-text-secondary)" }}>
              <Search size={22} strokeWidth={1.5} />
            </a>
          ) : null}

          <a href="/messages" aria-label="Messages" className="relative" style={{ color: "var(--color-text-secondary)" }}>
            <MessageCircle size={22} strokeWidth={1.5} />
            <Badge count={unreadDmCount} />
          </a>

          <a
            href="/notifications"
            aria-label="Notifications"
            className="relative"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Bell size={22} strokeWidth={1.5} />
            <Badge count={unreadNotificationCount} />
          </a>

          <button type="button" aria-label="Open my menu" onClick={() => setMineOpen(true)} className="avatar h-8 w-8">
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
