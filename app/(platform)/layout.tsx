import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { needsLegalReconsent } from "@/lib/legal/reconsent";
import BottomNav from "@/components/shared/BottomNav";

// Legal re-consent gate (Block 4, 2026-08-10) — applied once here
// rather than duplicated per-page (unlike the smaller, deliberately
// page-by-page Doors/ritual gates — see DECISIONS.md) because this
// needs to cover every one of middleware.ts's ~17 protected prefixes,
// and this layout already wraps all of them. /legal-reconsent itself
// lives outside `(platform)` (in `(auth)`) specifically so it isn't
// wrapped by this same check — redirecting to a page this layout also
// gates would loop.
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user && (await needsLegalReconsent(user.id))) {
    redirect("/legal-reconsent");
  }

  return (
    <>
      <div className="pb-16 sm:pb-0">{children}</div>
      {user ? <BottomNav /> : null}
    </>
  );
}
