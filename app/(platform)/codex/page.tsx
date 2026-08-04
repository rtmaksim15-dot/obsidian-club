import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

// The Codex (OBSIDIAN MASTER BIBLE Vol. III). Copy is final, supplied by
// Max 2026-08-03 — do not paraphrase or add/remove principles or red
// lines. Linked quietly from /ritual/safety-rules and
// /ritual/code-of-conduct ("Read the full Codex →"), not part of the
// Initiation Ritual itself — no completion state, nothing to accept.
const PRINCIPLES = [
  {
    numeral: "I",
    title: "Voluntariness",
    body: "Everything here is by one's own will: entry, role, participation, departure.",
    forbidden: "pressure, blackmail, manipulation, exploiting dependence — emotional, financial, or status.",
  },
  {
    numeral: "II",
    title: "Dignity",
    body: "A person remains a person in any role. Submission is not humiliation; it is a choice.",
    forbidden: "humiliation outside consent, public mockery, treating a person as a thing against their will.",
  },
  {
    numeral: "III",
    title: "Responsibility",
    body: "You answer for your words, your actions, and those you bring.",
    forbidden: "shifting blame; “I didn’t know” and “I was misunderstood” as excuses.",
  },
  {
    numeral: "IV",
    title: "Trust",
    body: "The Club stands on this: what is said here, stays here.",
    forbidden: "taking anything outside — content, names, stories, any knowledge of people.",
  },
  {
    numeral: "V",
    title: "Discipline",
    body: "Rules are kept when no one is watching. That is the entire point.",
    forbidden: "selective compliance, loophole-hunting, following the letter against the meaning.",
  },
  {
    numeral: "VI",
    title: "Respect",
    body: "Another's boundaries are not a topic for debate and not a challenge.",
    forbidden:
      "insults; hostility by race, nationality, faith, orientation, gender, or body. This is a red line, not a debate.",
  },
  {
    numeral: "VII",
    title: "Honesty",
    body: "You are who you claim to be. Your experience is what you say it is.",
    forbidden: "lying about age, identity, experience, competence, intentions.",
  },
  {
    numeral: "VIII",
    title: "Mastery",
    body: "What is done is valued here, not what is claimed. Growth is the only currency that cannot be bought.",
    forbidden: "taking credit for another's work, demanding status without contribution.",
  },
];

const RED_LINES = [
  {
    numeral: "RL-I",
    title: "Minors",
    body: "No presence of anyone under 18, no depiction, reference, or implication of minors in the context of the Club. Circumventing age verification is the same violation. There are no gradations, no context, no irony, no artistic license.",
  },
  {
    numeral: "RL-II",
    title: "Taking the Club Outside",
    body: "Screenshots, screen recording, filming with another device, downloading, forwarding, publishing — any member content. Lifetime.",
  },
  {
    numeral: "RL-III",
    title: "Violation of Consent",
    body: "Continuing after withdrawal. Acting beyond what was agreed. Coercion of any form. Ignoring a stop-word.",
  },
  {
    numeral: "RL-IV",
    title: "Hatred and Abuse",
    body: "Inciting racial, national, or religious hostility. Personal abuse. Harassment.",
  },
  {
    numeral: "RL-V",
    title: "Doxxing",
    body: "Publishing another member's real name, workplace, address, or contacts — or threatening to.",
  },
  {
    numeral: "RL-VI",
    title: "Another's Consent",
    body: "Publishing images or information about a third person without their consent — including partners, former partners, or strangers.",
  },
  {
    numeral: "RL-VII",
    title: "Unlawful",
    body: "Anything against the law of the jurisdiction.",
  },
];

export default async function CodexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/codex");

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-xl">
        <p className="text-label mb-2">The Codex</p>
        <h1 className="text-h1 mb-10">Eight principles. Seven red lines.</h1>

        <p className="text-label mb-6" style={{ color: "var(--color-text-secondary)" }}>
          The Eight Principles
        </p>
        <ol className="space-y-8">
          {PRINCIPLES.map((p) => (
            <li key={p.numeral} className="border-t border-ob-border pt-6">
              <div className="flex items-baseline gap-4">
                <span className="font-cinzel text-2xl text-ob-accent">{p.numeral}</span>
                <h2 className="text-h2 !text-base">{p.title}</h2>
              </div>
              <p className="text-body mt-3">{p.body}</p>
              <p className="text-caption mt-2" style={{ color: "var(--color-text-secondary)" }}>
                Forbidden: {p.forbidden}
              </p>
            </li>
          ))}
        </ol>

        <p className="text-label mb-6 mt-16" style={{ color: "var(--color-text-secondary)" }}>
          The Red Lines
        </p>
        <p className="text-body mb-8">
          Crossing any of these means immediate and permanent removal. No warning, no appeal, no return.
        </p>
        <ol className="space-y-8">
          {RED_LINES.map((rl) => (
            <li key={rl.numeral} className="border-t border-ob-border pt-6">
              <div className="flex items-baseline gap-4">
                <span className="font-cinzel text-2xl text-ob-accent">{rl.numeral}</span>
                <h2 className="text-h2 !text-base">{rl.title}</h2>
              </div>
              <p className="text-body mt-3">{rl.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <a href="/ritual" className="btn-secondary block w-full text-center">
            Back to the Ritual
          </a>
        </div>
      </div>
    </main>
  );
}
