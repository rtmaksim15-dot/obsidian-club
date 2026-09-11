import { redirect } from "next/navigation";

// Superseded by the Admin Console's Zone 1, Applications (2026-09-09,
// see DECISIONS.md). Not explicitly named in the fold instruction
// (only /admin/waiting-list and /admin/reports were), but leaving this
// as a separate, independently-reachable page would directly contradict
// the console's own defining constraint ("no navigation away from
// /admin") -- flagging the reasoning here rather than silently
// assuming it. Kept as a redirect, not deleted.
export default function AdminApplicationsRedirect() {
  redirect("/admin");
}
