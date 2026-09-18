import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";
import { needsDmRulesAcceptance } from "@/lib/legal/dm-rules";
import DmRulesGate from "@/components/shared/DmRulesGate";

// /messages/rules — a standalone entry point for the same gate
// /messages shows inline, reachable from "Request a conversation" on a
// profile so accepting doesn't dump the member into their inbox: `next`
// (validated to same-origin-relative only) is where they land after
// agreeing, back on the profile they came from.
export default async function MessagesRulesPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  // Same-origin-relative only — "/x" is fine, "//evil.com" (a
  // protocol-relative URL some routers/browsers treat as external) and
  // anything else falls back to /messages.
  const rawNext = searchParams.next;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/messages";
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  // Ritual and Doors are checked separately (2026-09-18, launch preview,
  // see DECISIONS.md) — see messages/page.tsx.
  if (!user.isAdmin) {
    if (!(await isRitualComplete(user))) redirect("/ritual");
  }
  if (!bypassesDoors(user) && getDoorsState().active) redirect("/antechamber");

  if (!(await needsDmRulesAcceptance(user.id))) redirect(next);

  return <DmRulesGate next={next} />;
}
