import { redirect } from "next/navigation";

// Folded into the Admin Console as Zone 3, Arbitration (2026-09-09, see
// DECISIONS.md) — kept as a redirect, not deleted.
export default function AdminReportsRedirect() {
  redirect("/admin");
}
