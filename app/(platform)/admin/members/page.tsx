import { redirect } from "next/navigation";

// Superseded by the Admin Console's Zone 2, People (2026-09-09, see
// DECISIONS.md). Same reasoning as /admin/applications's redirect --
// not explicitly named in the fold instruction, but left live it would
// contradict "no navigation away from /admin." Kept as a redirect, not
// deleted.
export default function AdminMembersRedirect() {
  redirect("/admin");
}
