import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import AcceptCodeButton from "@/components/shared/AcceptCodeButton";

// The Code of Conduct (Initiation Ritual step 2). Copy is final, supplied
// by Max 2026-07-15 — do not paraphrase or add/remove laws.
const LAWS = [
  {
    numeral: "I",
    title: "Discretion Is Absolute",
    body: "What happens in the Circle stays in the Circle. Names, faces, words — none of it leaves. A single breach ends membership. Permanently.",
  },
  {
    numeral: "II",
    title: "Consent Is the Foundation",
    body: "Every interaction — spoken, written, physical — begins with a clear yes. Silence is not consent. Hesitation is not consent. This law protects everyone, including you.",
  },
  {
    numeral: "III",
    title: "Respect Is Not Optional",
    body: "You will disagree with members. You will not diminish them. Power is measured by restraint, not volume.",
  },
  {
    numeral: "IV",
    title: "Your Word Is Your Value",
    body: "Commitments made inside the Circle are kept. Reputation here is earned slowly and lost instantly.",
  },
  {
    numeral: "V",
    title: "The Circle Comes First",
    body: "Act in ways that strengthen it. Those who take without giving will find the doors closed.",
  },
];

export default async function CodeOfConductPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/ritual/code-of-conduct");

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const progress = (profile?.ritualProgress ?? {}) as Record<string, unknown>;
  const alreadyAccepted = progress.codeOfConduct === true;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-xl">
        <p className="text-label mb-2">The Code</p>
        <h1 className="text-h1 mb-10">Five laws. No exceptions.</h1>

        <ol className="space-y-8">
          {LAWS.map((law) => (
            <li key={law.numeral} className="border-t border-ob-border pt-6">
              <div className="flex items-baseline gap-4">
                <span className="font-cinzel text-2xl text-ob-accent">{law.numeral}</span>
                <h2 className="text-h2 !text-base">{law.title}</h2>
              </div>
              <p className="text-body mt-3">{law.body}</p>
            </li>
          ))}
        </ol>

        <p className="text-caption mt-10 border-t border-ob-border pt-6" style={{ color: "var(--color-text-secondary)" }}>
          By accepting, you bind yourself to the Code. A decision on violations, if any, is final.
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
            <AcceptCodeButton />
          )}
        </div>
      </div>
    </main>
  );
}
