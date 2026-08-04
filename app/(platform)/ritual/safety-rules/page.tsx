import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import AcceptSafetyButton from "@/components/shared/AcceptSafetyButton";

// Safety & Respect Guidelines (Initiation Ritual step 5). Copy is final,
// supplied by Max 2026-08-03 — do not paraphrase or add/remove clauses.
// Each entry is split at its first sentence (verbatim) for a lead/body
// visual split, matching the Code of Conduct page's rhythm — there's no
// roman-numeral scheme here (that's /codex's device, not this page's).
const CLAUSES = [
  {
    lead: "Consent is a state, not a signature.",
    body: "It is given freely, it is specific, and it can be withdrawn at any moment, by anyone, without explanation. Withdrawal is final the moment it happens. Continuing past it is not a mistake — it is a violation, and it ends membership.",
  },
  {
    lead: "Boundaries are not an invitation to negotiate.",
    body: "What a member has declared off-limits stays off-limits. A refusal requires no reason and invites no second attempt. Pressing after “no” — in comments, in rooms, anywhere — is pursued as a violation, not a misunderstanding.",
  },
  {
    lead: "Discretion is absolute.",
    body: "What happens in the Circle stays in the Circle. No screenshots, no recordings, no retelling — of content, names, or stories. A single breach ends membership permanently, wherever it occurs.",
  },
  {
    lead: "Identity belongs to its owner.",
    body: "Revealing another member's real name, workplace, contacts, or likeness — or threatening to — ends membership. This includes images of partners, former partners, or any third person shared without their consent.",
  },
  {
    lead: "Some lines have no context.",
    body: "Anything involving minors — presence, imagery, reference, implication. Hatred by race, nation, faith, orientation, gender, or body. Anything unlawful. These are not judged case by case. They end membership immediately, permanently, without appeal.",
  },
  {
    lead: "If something goes wrong, speak.",
    body: "Support is a closed channel. The fact of your report is never revealed. Doubt is resolved in favor of safety, not seniority.",
  },
];

export default async function SafetyRulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/ritual/safety-rules");

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const progress = (profile?.ritualProgress ?? {}) as Record<string, unknown>;
  const alreadyAccepted = progress.safetyRules === true;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-xl">
        <p className="text-label mb-2">The Guidelines</p>
        <h1 className="text-h1 mb-6">Safety &amp; Respect</h1>
        <p className="text-body mb-10">
          The Code told you what we believe. This tells you what protects you — and what will remove you.
        </p>

        <ol className="space-y-8">
          {CLAUSES.map((clause) => (
            <li key={clause.lead} className="border-t border-ob-border pt-6">
              <h2 className="text-h2 !text-base">{clause.lead}</h2>
              <p className="text-body mt-3">{clause.body}</p>
            </li>
          ))}
        </ol>

        <p className="text-caption mt-10 border-t border-ob-border pt-6" style={{ color: "var(--color-text-secondary)" }}>
          By confirming, you accept that these terms bind you — and shield you.
        </p>

        <p className="text-caption mt-4">
          <a href="/codex" style={{ color: "var(--color-text-muted)" }}>
            Read the full Codex &rarr;
          </a>
        </p>

        <div className="mt-8">
          {alreadyAccepted ? (
            <a href="/ritual" className="btn-secondary block w-full text-center">
              Already accepted — back to the Ritual
            </a>
          ) : (
            <AcceptSafetyButton />
          )}
        </div>
      </div>
    </main>
  );
}
