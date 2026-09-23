import type { Metadata } from "next";
import Logo from "@/components/ui/Logo";
import InvitationPanelForm from "@/components/shared/InvitationPanelForm";

// The invitation panel (`/invitation`) — Invitation Panel flow, A2
// (2026-08-2x, see DECISIONS.md). The single fixed public URL every
// physical card's QR points to; all cards are identical, none carries a
// unique token. A separate page from `/apply` on purpose: `/apply` is
// the pre-existing OAuth-callback status page (no form of its own, see
// its own file) and stays exactly as it was — this is new, additive
// surface, not a repurposing of it.
//
// Landing-page pivot (2026-08-23): nothing on the site links here —
// this is obscurity, not access control (the real gate is the Accept
// decision), but it still shouldn't be crawled or indexed. Paired with
// the `disallow` entry in app/robots.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function InvitationPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-ob-black px-6 py-24 text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8 text-center">Request Consideration</h1>

      {/* Community description — final copy (2026-09-23, see
          DECISIONS.md), replacing the placeholder block. */}
      <div className="mt-6 w-full max-w-sm text-center">
        <p className="font-cormorant text-[1.05rem] leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
          A private community for those who value trust, restraint, and the quiet strength of chosen roles.
        </p>
        <p className="font-cormorant mt-5 text-[0.9375rem] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Tell us who you are. We read every request personally.
        </p>
      </div>

      <InvitationPanelForm />
    </main>
  );
}
