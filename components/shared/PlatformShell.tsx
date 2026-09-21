"use client";

import { usePathname } from "next/navigation";
import { isDmThreadRoute } from "@/lib/config/nav";

// Wraps (platform)/layout.tsx's children with the padding that reserves
// space for BottomNav — pulled into its own client component (item 1,
// 2026-09-22, see DECISIONS.md) only because it needs usePathname() to
// match BottomNav.tsx's own hide condition; the layout itself stays a
// Server Component (it already does async gating work no client
// component could do). On an open DM thread, BottomNav renders nothing,
// so this stops reserving pb-16 for it — otherwise the thread's own
// h-dvh layout would run 64px past the real viewport bottom, pushing
// the composer behind the fold.
export default function PlatformShell({
  fullAccess,
  children,
}: {
  fullAccess: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reserveBottomNavSpace = !isDmThreadRoute(pathname);

  return (
    <div className={`${reserveBottomNavSpace ? "pb-16" : ""} sm:pb-0 ${fullAccess ? "sm:pt-20" : ""}`}>{children}</div>
  );
}
