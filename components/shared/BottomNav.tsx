"use client";

import { usePathname } from "next/navigation";
import { MessagesSquare, CalendarDays, BookOpen, LayoutGrid, User } from "lucide-react";

// Mobile bottom navigation per DESIGN.md §8: [Зал] [Комнаты] [Контент]
// [События] [Профиль]. Desktop keeps the platform usable without this
// (pages are still directly reachable by URL) — DESIGN.md scopes this
// nav to mobile ("Мобильная навигация (bottom bar)").
export default function BottomNav({ profileHref }: { profileHref: string }) {
  const pathname = usePathname();

  const items = [
    { href: "/hall", label: "Hall", icon: LayoutGrid },
    { href: "/rooms", label: "Rooms", icon: MessagesSquare },
    { href: "/content", label: "Content", icon: BookOpen },
    { href: "/events", label: "Events", icon: CalendarDays },
    { href: profileHref, label: "Profile", icon: User },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-ob-border bg-ob-dark sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/hall" && pathname.startsWith(href));
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
