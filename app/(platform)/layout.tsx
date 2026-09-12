import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { needsLegalReconsent } from "@/lib/legal/reconsent";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getDoorsState } from "@/lib/config/doors";
import BottomNav from "@/components/shared/BottomNav";
import DesktopNav from "@/components/shared/DesktopNav";

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

  // Desktop nav gap (2026-09-12) — DesktopNav's five destinations are
  // exactly the pages the ritual gate (feed/compose/members/hall) and
  // the doors gate (same four) bounce a non-admin member back from
  // while incomplete/waiting. `fullAccess` mirrors those pages' own gate
  // logic so the bar only ever appears once it can't dead-end: admins
  // always pass (same founder exception as those pages), everyone else
  // needs both ritual.complete and doors open. Mid-ritual and
  // antechamber members keep their existing sign-out (ritual/layout.tsx,
  // antechamber/page.tsx) instead of a second one from this bar.
  let fullAccess = false;
  if (user) {
    fullAccess = user.isAdmin || ((await isRitualComplete(user)) && !getDoorsState().active);
  }

  return (
    <>
      <div className={`pb-16 sm:pb-0 ${fullAccess ? "sm:pt-20" : ""}`}>{children}</div>
      {user ? <BottomNav /> : null}
      {fullAccess ? <DesktopNav /> : null}
    </>
  );
}
