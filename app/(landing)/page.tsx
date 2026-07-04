import {
  MessagesSquare,
  CalendarDays,
  BookOpen,
  Star,
  ShoppingBag,
  MapPin,
  ArrowRight,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import WaitlistForm from "@/components/shared/WaitlistForm";
import {
  Reveal,
  RevealGroup,
  RevealItem,
  RevealList,
  RevealListItem,
} from "@/components/shared/Reveal";

const INSIDE = [
  {
    icon: MessagesSquare,
    name: "Rooms",
    line: "Private rooms — general, thematic, by rank. Some you see. Some stay locked.",
  },
  {
    icon: CalendarDays,
    name: "Events",
    line: "Closed gatherings — dinners, parties, journeys. Entry by level, trust, and dress code.",
  },
  {
    icon: BookOpen,
    name: "Library",
    line: "Essays, lectures, manifestos, courses. Part open to members, part earned by rank.",
  },
  {
    icon: Star,
    name: "Reputation",
    line: "Five stars, watched closely — your conduct, your contribution, the company you keep.",
  },
  {
    icon: ShoppingBag,
    name: "Marketplace",
    line: "The club's vitrine — limited collections, tickets, artifacts. Each piece an exhibit, not a product.",
  },
  {
    icon: MapPin,
    name: "Local Circles",
    line: "Real connection by city — SF, LA, Miami, NY, Berlin, London, Tokyo.",
  },
];

const LEVELS = [
  { rank: "I", name: "Initiate", line: "First light after the Rite of Initiation." },
  { rank: "II", name: "Member", line: "A steady presence. Thematic rooms open." },
  { rank: "III", name: "Senior Member", line: "A trusted contributor. The library, in full." },
  { rank: "IV", name: "Mentor", line: "Guardian of newcomers. Keeper of the culture." },
  { rank: "V", name: "Master", line: "Leader of a domain. The voice of the craft." },
  { rank: "VI", name: "Council", line: "By personal invitation. The stewardship of the club." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ob-black text-ob-text">
      {/* ============================= HERO ============================= */}
      <section
        className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-24 text-center"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 20%, rgba(139,26,26,0.10), transparent 60%), var(--color-bg-primary)",
        }}
      >
        <div className="animate-fade-in-up flex flex-col items-center">
          <Logo size={180} variant="dark" />
          <h1 className="text-display mt-10">Obsidian Club</h1>
          <p className="mt-3 font-cinzel uppercase tracking-ultra text-ob-accent text-sm sm:text-base">
            Private Community
          </p>
          <p
            className="mt-6 font-cinzel uppercase tracking-brand text-xs sm:text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Power. Discipline. Trust.
          </p>

          <hr className="divider-accent my-10 w-56" />

          <p className="text-body max-w-md italic">
            A closed society for those who understand.
          </p>

          <a href="#apply" className="btn-primary mt-10 inline-flex items-center gap-2">
            Request Access
            <ArrowRight size={16} strokeWidth={2} />
          </a>
        </div>
      </section>

      {/* ========================== PHILOSOPHY ========================== */}
      <section className="mx-auto max-w-2xl px-6 py-24 sm:py-32">
        <Reveal>
          <p className="text-label mb-5">The Philosophy</p>
          <h2 className="text-h1">This is not a social network.</h2>
          <div className="mt-8 space-y-6">
            <p className="text-body">
              Obsidian Club is not a place you register. It is a place you are
              granted access to. Membership is not bought — it is earned, extended,
              and, when it must be, withdrawn.
            </p>
            <p className="text-body">
              Everything here rests on four things: reputation, rating, influence,
              and trust. They are not numbers to inflate. They are the record of how
              you conduct yourself, who you bring, and what you give.
            </p>
            <p className="text-body">
              An invitation is an act of responsibility. Those you bring reflect on
              you. Those who understand this rise. Those who do not, quietly leave.
            </p>
            <p className="text-body italic text-ob-muted">
              If a person brings no value to the club, the club no longer brings
              value to them.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ========================== WHAT'S INSIDE ====================== */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="text-label mb-5 text-center">Within</p>
          <h2 className="text-h2 mb-12 text-center">What lies inside</h2>
        </Reveal>
        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSIDE.map(({ icon: Icon, name, line }, i) => (
            <RevealItem key={name} index={i} className="card group">
              <Icon
                size={22}
                strokeWidth={1.5}
                className="text-ob-accent transition-colors group-hover:text-ob-accent-h"
              />
              <h3 className="text-h2 mt-4 !text-base">{name}</h3>
              <p className="text-body mt-2 !text-base">{line}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ============================ LEVELS =========================== */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <Reveal>
          <p className="text-label mb-5 text-center">The Order</p>
          <h2 className="text-h2 mb-12 text-center">Six levels. One beyond them.</h2>

          {/* Lord Obsidian — above all */}
          <div
            className="mx-auto mb-10 max-w-md rounded-ob border p-6 text-center"
            style={{
              borderColor: "var(--color-gold-muted)",
              boxShadow: "0 0 24px rgba(201,168,76,0.12)",
            }}
          >
            <p
              className="font-cinzel uppercase tracking-brand"
              style={{ color: "var(--color-gold)" }}
            >
              Lord Obsidian
            </p>
            <p className="text-body mt-2 !text-base">
              Beyond the levels. The one. The founder. The voice of the club.
            </p>
          </div>
        </Reveal>

        <RevealList className="space-y-3">
          {LEVELS.map((l, i) => (
            <RevealListItem key={l.rank} index={i} className="card flex items-center gap-5">
              <span className="status-line h-10 shrink-0" />
              <span className="font-cinzel text-ob-muted w-10 shrink-0 text-lg">
                {l.rank}
              </span>
              <div>
                <h3 className="font-cinzel uppercase tracking-brand text-ob-text text-sm">
                  {l.name}
                </h3>
                <p className="text-body !text-base">{l.line}</p>
              </div>
            </RevealListItem>
          ))}
        </RevealList>
      </section>

      {/* ============================ APPLY ============================ */}
      <section id="apply" className="mx-auto max-w-lg scroll-mt-16 px-6 py-24 sm:py-32">
        <Reveal>
          <p className="text-label mb-5 text-center">Application</p>
          <h2 className="text-h1 mb-10 text-center">Apply for membership</h2>
          <WaitlistForm />
        </Reveal>
      </section>

      {/* ============================ FOOTER =========================== */}
      <footer className="border-t border-ob-border px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <Logo size={72} variant="dark" />
          {/* color overridden to --color-text-secondary: --color-text-muted
              is 2.86:1 on this background, below WCAG AA's 4.5:1 for real
              links/copy (still fine for true de-emphasized tags/labels) */}
          <p
            className="text-caption order-last sm:order-none"
            style={{ color: "var(--color-text-secondary)" }}
          >
            © {new Date().getFullYear()} Obsidian Club. All rights reserved.
          </p>
          <nav className="flex gap-6">
            <a
              href="#"
              className="text-caption transition-colors hover:text-ob-text"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-caption transition-colors hover:text-ob-text"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Terms
            </a>
            <a
              href="#"
              className="text-caption transition-colors hover:text-ob-text"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
