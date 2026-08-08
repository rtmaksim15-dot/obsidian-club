import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getRitualCompleteMemberCount } from "@/lib/auth/ritual";
import { getDoorsState, formatDoorsDate } from "@/lib/config/doors";
import SignOutButton from "@/components/shared/SignOutButton";

/**
 * The Antechamber (`/antechamber`) — the Doors mechanic (pre-launch
 * cleanup, 2026-08-08), October 1 cohort launch. Ritual-complete
 * members are redirected here from `/feed`, `/hall`, `/compose`, and
 * `/members` while `DOORS_OPEN_DATE` is in the future — see
 * `lib/config/doors.ts`. Admins bypass at each of those gate points, so
 * they never land here through normal navigation; this page itself
 * doesn't re-check admin status, since arriving here already implies
 * the gate upstream decided to send a non-admin.
 *
 * No live-updating countdown/counter — same "static until the next
 * navigation" behavior as the ritual gate itself elsewhere in this
 * app; refreshing or revisiting re-evaluates the doors state fresh.
 *
 * Includes Sign Out (usually only on `/hall`) — `/hall` itself is one
 * of the gated pages, so without this a waiting member would have no
 * way to sign out at all while doors.active is true.
 */
export default async function AntechamberPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/antechamber");

  const doors = getDoorsState();
  const count = await getRitualCompleteMemberCount();

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">The Circle</p>
        <h1 className="text-h1 mb-2">
          {doors.date ? `The Hall opens ${formatDoorsDate(doors.date)}.` : "The Hall opens soon."}
        </h1>
        <p className="text-body italic" style={{ color: "var(--color-text-secondary)" }}>
          You have been accepted. The doors have not yet been unlocked.
        </p>

        <div className="card mt-10 inline-block px-8 py-6 text-center">
          <p className="text-h1">{count}</p>
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            {count === 1 ? "member stands" : "members stand"} at the doors
          </p>
        </div>

        <div className="mt-10">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
