"use client";

import { usePathname } from "next/navigation";
import { Home, Users, Plus, Archive, User, MessageCircle } from "lucide-react";
import { isDmThreadRoute } from "@/lib/config/nav";

// Mobile bottom navigation — Threads-style redesign (OBSIDIAN_ROADMAP_v3.0,
// 2026-07-29), small text labels added under each icon (item 1, 2026-09-22,
// see DECISIONS.md). Order: Feed, Community, Post (center), Vault, Profile.
// Library's tab is gone (the route and its teaser still exist, just not
// linked from here — see app/(platform)/library/page.tsx). "Community"
// points at /rooms (Rooms is what's actually built; groups/people-
// discovery/events-as-filter aren't — see /rooms's Events link and
// TECH_DEBT.md). "Profile" points at /hall (the self-view dashboard —
// "The Hall" stays the in-app/brand name). "Post" links to /compose, its
// own screen (see ContentComposer.tsx) rather than a modal — no dialog/
// portal primitive exists elsewhere in this codebase, and a dedicated
// route matches how /ritual's steps are already built. Desktop keeps the
// platform usable without this (pages are still directly reachable by
// URL).
//
// Messages (item 3, 2026-09-18, see DECISIONS.md) — added as a sixth tab,
// right after Profile, rather than replacing one of the five: none of the
// existing five is a natural fit to drop, and Messages is a distinct enough
// destination (DMs, not community content) to earn its own icon.
const ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/rooms", label: "Community", icon: Users },
  { href: "/compose", label: "Post", icon: Plus },
  { href: "/vault", label: "Vault", icon: Archive },
  { href: "/hall", label: "Profile", icon: User },
  { href: "/messages", label: "Messages", icon: MessageCircle },
];

export default function BottomNav({ unreadDm = false }: { unreadDm?: boolean }) {
  const pathname = usePathname();

  // Hidden inside an open DM thread (item 1, 2026-09-22, see
  // DECISIONS.md) — that screen has its own header with a back control
  // to /messages, and the composer needs the full viewport height down
  // to the keyboard, not a fixed bar competing for the same space.
  // PlatformShell.tsx makes the matching adjustment to the pb-16 that
  // would otherwise still reserve space for this nav being gone.
  if (isDmThreadRoute(pathname)) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-ob-border bg-ob-dark sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href);
        return (
          <a
            key={label}
            href={href}
            aria-label={label}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-3"
            style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
          >
            <Icon size={22} strokeWidth={1.5} />
            <span className="text-[10px] leading-none">{label}</span>
            {href === "/messages" && unreadDm ? (
              <span
                aria-label="Unread messages"
                className="absolute right-1/3 top-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--color-accent)" }}
              />
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}
