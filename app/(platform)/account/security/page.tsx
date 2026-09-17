import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import MfaSecurityPanel from "@/components/shared/MfaSecurityPanel";

// /account/security — item 2, 2026-09-17 (see DECISIONS.md). MFA
// enrollment lives OUTSIDE /admin on purpose: requireAdmin() (what
// gates /admin) demands aal2, and an admin with no factor enrolled yet
// has nothing to step up from — gating enrollment behind aal2 would be
// a lock with no key. This page only checks isAdmin directly, same
// reasoning as the enroll/verify/unenroll routes it talks to. Under
// (platform) for the shared chrome (nav, sign-out) an admin already
// gets everywhere else — the ritual/doors gate in that layout is a
// no-op for an admin either way.
export default async function AccountSecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/security");
  if (!user.isAdmin) redirect("/feed");

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-xl">
        <p className="text-label mb-2">Account</p>
        <h1 className="text-h1 mb-8">Two-Factor Authentication</h1>
        <MfaSecurityPanel />
      </div>
    </main>
  );
}
