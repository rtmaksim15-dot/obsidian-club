import type { ReactNode } from "react";
import Logo from "@/components/ui/Logo";

// Public legal pages (Block 2, 2026-08-10) — deliberately outside
// `(platform)`: no auth required (not in middleware.ts's
// PROTECTED_PREFIXES), since prospective members read these before an
// account exists and registration checkboxes link out to them.
// Master Bible canon styling — dark background, ivory text, no
// decoration — same shell every one of these pages shares.
const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/guidelines", label: "Acceptable Use Policy" },
  { href: "/dmca", label: "DMCA Policy" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ob-black text-ob-text">
      <header className="border-b border-ob-border px-6 py-6">
        <a href="/" className="inline-flex items-center gap-3">
          <Logo size={32} variant="dark" />
          <span className="font-cinzel text-xs font-semibold tracking-[0.3em] text-ob-text">OBSIDIAN CLUB</span>
        </a>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">{children}</main>

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
    </div>
  );
}
