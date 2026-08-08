import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";
import { getDoorsState } from "@/lib/config/doors";
import ContentComposer from "@/components/shared/ContentComposer";
import { HOUSES_UI_ENABLED } from "@/lib/config/feature-flags";

/**
 * Compose (`/compose`) — dedicated post-creation screen reached from
 * the bottom nav's center "+" tab (Threads-style nav redesign,
 * 2026-07-29). Previously the composer lived inline at the top of
 * /feed; pulling it out makes the feed itself pure content, matching
 * the roadmap's Threads-level-simplicity reference.
 */
export default async function ComposePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/compose");

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const ritual = await getRitualStatus(user, profile);
  if (!ritual.complete) redirect("/ritual");

  // Doors mechanic (2026-08-08) — admins always bypass; everyone else
  // sees the antechamber instead of real content while doors.active.
  if (!user.isAdmin && getDoorsState().active) redirect("/antechamber");

  const houses = HOUSES_UI_ENABLED
    ? (
        await prisma.houseMembership.findMany({
          where: { userId: user.id },
          select: { house: { select: { id: true, name: true } } },
        })
      ).map((m) => m.house)
    : [];

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <a href="/feed" className="text-caption mb-6 inline-block" style={{ color: "var(--color-text-muted)" }}>
          ← Back
        </a>
        <ContentComposer houses={houses} />
      </div>
    </main>
  );
}
