"use client";

import { usePathname } from "next/navigation";
import { isDmThreadRoute } from "@/lib/config/nav";

// Wraps (platform)/layout.tsx's children with the padding that reserves
// space for TopBar/BottomTabBar — pulled into its own client component
// (item 1, 2026-09-22, see DECISIONS.md) only because it needs
// usePathname() to match BottomTabBar.tsx's own hide condition; the
// layout itself stays a Server Component (it already does async gating
// work no client component could do).
//
// Navigation v2 (Phase B, 2026-10-10, see DECISIONS.md): both bars are
// now universal across every breakpoint (replacing the old mobile-
// bottom-bar/desktop-top-bar fork), so both paddings apply unconditionally
// here too — no more `sm:` split. On an open DM thread, BottomTabBar
// renders nothing (same isDmThreadRoute check), so this stops reserving
// pb-16 for it — otherwise the thread's own h-dvh layout would run 64px
// past the real viewport bottom, pushing the composer behind the fold.
// TopBar itself is never route-hidden (same as the old DesktopNav),
// so pt-20 stays unconditional whenever fullAccess is true.
export default function PlatformShell({
  fullAccess,
  children,
}: {
  fullAccess: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reserveBottomNavSpace = fullAccess && !isDmThreadRoute(pathname);

  return <div className={`${reserveBottomNavSpace ? "pb-16" : ""} ${fullAccess ? "pt-20" : ""}`}>{children}</div>;
}
