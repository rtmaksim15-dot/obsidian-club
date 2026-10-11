"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, BookOpen, Archive } from "lucide-react";
import { isDmThreadRoute } from "@/lib/config/nav";
import { COMMUNITY_UI_ENABLED, LIBRARY_UI_ENABLED } from "@/lib/config/feature-flags";
import PostSheet from "./PostSheet";

// Navigation v2, B2 (2026-10-10, see DECISIONS.md) — replaces the old
// BottomNav.tsx entirely. Feed - [Community] - [+] (center, accent,
// opens PostSheet instead of linking straight to /compose) - [Library]
// - Vault. Messages and Profile both moved off this bar: Messages is
// now top-bar only (B1), Profile is reached via the avatar -> MINE menu
// (B5) instead of a tab. Min 44px tap target on every item (py-3 + a
// 22px icon comfortably clears that).
const ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  ...(COMMUNITY_UI_ENABLED ? [{ href: "/rooms", label: "Community", icon: Users }] : []),
] as const;

const TRAILING_ITEMS = [
  ...(LIBRARY_UI_ENABLED ? [{ href: "/library", label: "Library", icon: BookOpen }] : []),
  { href: "/vault", label: "Vault", icon: Archive },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();
  const [postSheetOpen, setPostSheetOpen] = useState(false);

  if (isDmThreadRoute(pathname)) {
    return null;
  }

  function renderItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Home }) {
    const active = pathname === href || pathname.startsWith(href);
    return (
      <a
        key={label}
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-3"
        style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
      >
        <Icon size={22} strokeWidth={1.5} />
        <span className="text-[10px] leading-none">{label}</span>
        {active ? (
          <span
            aria-hidden="true"
            className="absolute bottom-0 h-[2px] w-8 rounded-full"
            style={{ backgroundColor: "var(--color-gold)" }}
          />
        ) : null}
      </a>
    );
  }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-ob-border bg-ob-dark"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {ITEMS.map(renderItem)}
        <button
          type="button"
          aria-label="Post"
          onClick={() => setPostSheetOpen(true)}
          className="flex flex-1 flex-col items-center justify-center py-3"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-accent)", color: "var(--color-text-primary)" }}
          >
            <Plus size={20} strokeWidth={2} />
          </span>
        </button>
        {TRAILING_ITEMS.map(renderItem)}
      </nav>
      <PostSheet open={postSheetOpen} onOpenChange={setPostSheetOpen} />
    </>
  );
}
