"use client";

import { usePathname } from "next/navigation";
import { Home, Users, Plus, Archive, User } from "lucide-react";
import SignOutButton from "./SignOutButton";

// Desktop navigation (2026-09-12) — same 5 destinations as BottomNav
// (see that file's comment for why each href was chosen), plus sign-out,
// for the sm-and-up viewport BottomNav (`sm:hidden`) never covers.
// Rendered only by app/(platform)/layout.tsx's `fullAccess` gate: a
// member mid-ritual or waiting at the antechamber sees none of these
// destinations, since every one of them (Feed/Compose/Members/Hall
// directly, Community/Vault indirectly) would just bounce them back to
// /ritual or /antechamber — those two already have their own persistent
// sign-out (ritual/layout.tsx, antechamber/page.tsx) for exactly that
// state, so this bar doesn't stack a second one there.
const ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/rooms", label: "Community", icon: Users },
  { href: "/compose", label: "Create Post", icon: Plus },
  { href: "/vault", label: "Vault", icon: Archive },
  { href: "/hall", label: "Profile", icon: User },
];

export default function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 top-0 z-10 hidden border-b border-ob-border bg-ob-dark sm:flex sm:items-center sm:justify-between sm:px-8 sm:py-4">
      <p className="font-cinzel text-sm uppercase tracking-brand text-ob-gold">Obsidian Club</p>

      <div className="flex items-center gap-7">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href);
          return (
            <a
              key={label}
              href={href}
              className="flex items-center gap-2 whitespace-nowrap text-caption"
              style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </a>
          );
        })}
        <span className="whitespace-nowrap">
          <SignOutButton />
        </span>
      </div>
    </nav>
  );
}
