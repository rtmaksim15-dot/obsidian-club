import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";

// /profile — a stable, param-less entry point that redirects to the
// caller's own /profile/[username]. CLAUDE.md's roadmap asked for a
// basic "profile page after login"; /profile/[username] already has the
// real avatar/name/level/REP data, so this just gives it a memorable URL
// rather than duplicating the page.
//
// Ritual gate, then username check, then the real redirect (2026-09-25,
// see DECISIONS.md) — this route used to build `/profile/${user.username}`
// unconditionally, which with no username at all became `/profile/`,
// normalized by Next.js back to `/profile`, re-running this same
// function — an infinite redirect loop for any signed-in member without
// one. The ritual gate goes first (matching every other ritual-gated
// page, e.g. hall/page.tsx) so an ordinary member without a username
// lands on the ritual's own explanation rather than a bare "go pick a
// name" with no context; only past that gate (or for an isAdmin account,
// which bypasses the ritual entirely) does an empty username send them
// straight to the one place that can fix it.
export default async function ProfileSelfPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  if (!user.isAdmin) {
    const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    const ritual = await getRitualStatus(user, profile);
    if (!ritual.complete) redirect("/ritual");
  }

  if (!user.username) redirect("/profile/edit");
  redirect(`/profile/${user.username}`);
}
