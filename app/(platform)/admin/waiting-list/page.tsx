import { redirect } from "next/navigation";

// Folded into the Admin Console (2026-09-09, see DECISIONS.md) — kept
// as a redirect, not deleted, so any bookmarked/linked URL still lands
// somewhere real.
export default function AdminWaitingListRedirect() {
  redirect("/admin");
}
