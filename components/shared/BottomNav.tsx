"use client";

import { usePathname } from "next/navigation";
import { Home, Users, Plus, Archive, User } from "lucide-react";

// Mobile bottom navigation — Threads-style redesign (OBSIDIAN_ROADMAP_v3.0,
// 2026-07-29): five icon-only tabs, no text labels. Order: Feed, Community,
// Create Post (center), Vault, Profile. Library's tab is gone (the route
// and its teaser still exist, just not linked from here — see
// app/(platform)/library/page.tsx). "Community" points at /rooms (Rooms is
// what's actually built; groups/people-discovery/events-as-filter aren't —
// see /rooms's Events link and TECH_DEBT.md). "Profile" points at /hall
// (the self-view dashboard — "The Hall" stays the in-app/brand name).
// "Create Post" links to /compose, its own screen (see ContentComposer.tsx)
// rather than a modal — no dialog/portal primitive exists elsewhere in this
// codebase, and a dedicated route matches how /ritual's steps are already
// built. Desktop keeps the platform usable without this (pages are still
// directly reachable by URL).
const ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/rooms", label: "Community", icon: Users },
  { href: "/compose", label: "Create Post", icon: Plus },
  { href: "/vault", label: "Vault", icon: Archive },
  { href: "/hall", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

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
            className="flex flex-1 items-center justify-center py-4"
            style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
          >
            <Icon size={22} strokeWidth={1.5} />
          </a>
        );
      })}
    </nav>
  );
}
