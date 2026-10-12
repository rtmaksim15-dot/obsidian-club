import type { ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import { getCurrentUser } from "@/lib/auth/session";
import { computeFullAccess } from "@/lib/auth/full-access";
import { getMemberShellData } from "@/lib/nav/shell-data";
import TopBar from "@/components/shared/TopBar";

// Public legal pages (Block 2, 2026-08-10) — deliberately outside
// `(platform)`: no auth required (not in middleware.ts's
// PROTECTED_PREFIXES), since prospective members read these before an
// account exists and registration checkboxes link out to them.
// Master Bible canon styling — dark background, ivory text, no
// decoration — same shell every one of these pages shares.
//
// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — item 2.
// A signed-in, fullAccess member reaching one of these from inside the
// installed app (WorldDrawer, a footer link while already a member)
// was previously trapped: standalone mode has no browser chrome, and
// this layout never rendered TopBar, so there was no way back short of
// force-quitting the app. fullAccess visitors now get the real member
// shell (TopBar, with its own back button — see
// components/shared/BackButton.tsx) instead of the public header; an
// authenticated-but-not-yet-fullAccess visitor (mid-ritual/antechamber)
// is deliberately treated the same as a logged-out one below — those
// pages already have their own persistent sign-out
// (ritual/layout.tsx, antechamber/page.tsx), and a half-populated
// TopBar (no invite allowance/Veil state to show yet) would contradict
// that existing design decision (see app/(platform)/layout.tsx).
const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/guidelines", label: "Acceptable Use Policy" },
  { href: "/dmca", label: "DMCA Policy" },
];

function LegalFooter() {
  return (
    <footer className="border-t border-ob-border px-6 py-10">
      <nav className="mx-auto flex max-w-2xl flex-wrap gap-x-6 gap-y-2">
        {LEGAL_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="font-inter text-[0.7rem] tracking-[0.15em] text-ob-muted transition-colors hover:text-ob-text"
          >
            {link.label}
          </a>
        ))}
        <a href="/" className="font-inter text-[0.7rem] tracking-[0.15em] text-ob-muted transition-colors hover:text-ob-text">
          Home
        </a>
      </nav>
    </footer>
  );
}

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const fullAccess = user ? await computeFullAccess(user) : false;

  if (fullAccess && user) {
    const navData = await getMemberShellData(user);
    return (
      <div className="min-h-screen bg-ob-black pt-20 text-ob-text">
        <main className="mx-auto max-w-2xl px-6 py-16">{children}</main>
        <LegalFooter />
        <TopBar
          avatarUrl={navData.avatarUrl}
          displayName={user.displayName}
          unreadDmCount={navData.unreadDmCount}
          unreadNotificationCount={navData.unreadNotificationCount}
          worldDrawerProps={{}}
          mineMenuProps={{
            displayName: user.displayName,
            avatarUrl: navData.avatarUrl,
            username: user.username,
            title: navData.title,
            inviteAllowance: navData.inviteAllowance,
            hasOutstandingMemberInvite: navData.hasOutstandingMemberInvite,
            initialVeilEnabled: navData.veilEnabled,
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ob-black text-ob-text">
      <header className="flex items-center justify-between border-b border-ob-border px-6 py-6">
        <a href="/" className="inline-flex items-center gap-3">
          <Logo size={32} variant="dark" />
          <span className="font-cinzel text-xs font-semibold tracking-[0.3em] text-ob-text">OBSIDIAN CLUB</span>
        </a>
        <a href="/" className="font-inter text-[0.7rem] tracking-[0.15em] text-ob-muted transition-colors hover:text-ob-text">
          ← Back
        </a>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">{children}</main>

      <LegalFooter />
    </div>
  );
}
