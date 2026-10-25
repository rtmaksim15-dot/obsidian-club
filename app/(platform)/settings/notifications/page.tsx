import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";
import { PUSH_ENABLED } from "@/lib/config/feature-flags";
import { getNotificationPreferences } from "@/lib/push/preferences";
import NotificationSettingsForm from "@/components/shared/NotificationSettingsForm";

// /settings/notifications — Web Push, Package N1 (2026-10-25, see
// DECISIONS.md). 404s while PUSH_ENABLED is false, same "hide the page
// itself, not just the link to it" posture as every other flag-gated
// page in this codebase (e.g. the practices API routes two packages
// ago) — MineMenu.tsx only links here when the flag is on, but a
// direct hit while it's off shouldn't reveal a half-built settings
// screen either.
export default async function NotificationSettingsPage() {
  if (!PUSH_ENABLED) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/notifications");

  if (!user.isAdmin) {
    if (!(await isRitualComplete(user))) redirect("/ritual");
  }
  if (!bypassesDoors(user) && getDoorsState().active) redirect("/antechamber");

  const preferences = await getNotificationPreferences(user.id);

  return (
    <main className="min-h-screen bg-ob-black px-6 pb-16 pt-4 text-ob-text">
      <div className="mx-auto max-w-lg">
        <p className="text-label mb-2">Settings</p>
        <h1 className="text-h1 mb-4">NOTIFICATIONS</h1>
        <p className="text-body mb-10" style={{ color: "var(--color-text-secondary)" }}>
          The Club speaks rarely. Choose when it may reach you.
        </p>
        <NotificationSettingsForm initialPreferences={preferences} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      </div>
    </main>
  );
}
