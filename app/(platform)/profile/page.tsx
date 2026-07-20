import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

// /profile — a stable, param-less entry point that redirects to the
// caller's own /profile/[username]. CLAUDE.md's roadmap asked for a
// basic "profile page after login"; /profile/[username] already has the
// real avatar/name/level/REP data, so this just gives it a memorable URL
// rather than duplicating the page.
export default async function ProfileSelfPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  redirect(`/profile/${user.username}`);
}
