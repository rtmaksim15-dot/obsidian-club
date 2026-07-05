"use client";

import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Users, BookOpen, User } from "lucide-react";

// Mobile bottom navigation — CLAUDE.md's (2026-07-05) 5-tab structure:
// Feed / Shop / Community / Library / Profile, replacing the original
// DESIGN.md §8 layout (Hall/Rooms/Content/Events/Profile). See ADR-0015.
// "Community" points at /rooms (Rooms is what's actually built; groups/
// people-discovery/events-as-filter aren't — see /rooms's Events link
// and TECH_DEBT.md). "Profile" points at /hall (the self-view dashboard
// — "The Hall" stays the in-app/brand name; the nav label matches
// CLAUDE.md's generic term). Desktop keeps the platform usable without
// this (pages are still directly reachable by URL).
const ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/rooms", label: "Community", icon: Users },
  { href: "/library", label: "Library", icon: BookOpen },
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
            className="flex flex-1 flex-col items-center gap-1 py-3"
            style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
          >
            <Icon size={20} strokeWidth={1.5} />
            <span className="text-caption" style={{ color: "inherit" }}>
              {label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
