import { redirect } from "next/navigation";
import LogoMark from "@/components/ui/LogoMark";
import HeroInviteForm from "@/components/shared/HeroInviteForm";
import ApplicationForm from "@/components/shared/ApplicationForm";
import { Reveal, RevealGroup, RevealItem } from "@/components/shared/Reveal";
import { getCurrentUser } from "@/lib/auth/session";

// Landing Page — recreated pixel-for-pixel from the approved design handoff
// (design_handoff_obsidian_club_landing/, 2026-07). Copy, spacing and color
// values are final per that handoff; do not improvise new copy here.

const PRINCIPLES = [
  { n: "01", title: "Power", line: "Not a right, but a duty. Held quietly, exercised deliberately." },
  { n: "02", title: "Discipline", line: "To master yourself is to master everything else that follows." },
  { n: "03", title: "Trust", line: "Earned in full, never demanded. The currency of every room." },
  { n: "04", title: "Respect", line: "To yourself, to others, to the rules that hold the circle together." },
  { n: "05", title: "Freedom", line: "Arrived at through conscious choice — not granted, but taken well." },
];

const ADMISSION = [
  {
    numeral: "I",
    title: "You Apply",
    body: "Submit your name and your reasons. Brevity is respected; embellishment is not. We are more interested in who you are than in what you have collected.",
  },
  {
    numeral: "II",
    title: "We Review In Silence",
    body: "Every application is read by hand. There is no algorithm, no queue you can pay to skip, no favour that will move you forward faster than your own merit.",
  },
  {
    numeral: "III",
    title: "The Invitation",
    body: "If you belong in the circle, a single message will find you. If you do not, there is only silence. We do not explain, and we do not reconsider.",
  },
];

const NAV_LINKS = [
  { href: "#ethos", label: "The Ethos" },
  { href: "#principles", label: "Principles" },
  { href: "#admission", label: "Admission" },
];

export default async function LandingPage() {
  // Already-authenticated visitors land on /feed, not the marketing
  // page — /feed's own ritual gate (see that page) still routes them to
  // /ritual first if the Initiation Ritual isn't complete yet.
  const user = await getCurrentUser();
  if (user) redirect("/feed");

  return (
    <div className="relative overflow-hidden bg-ob-black">
      {/* ============ TOP NAV ============ */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-[rgba(10,9,8,0.9)] to-transparent px-[clamp(20px,5vw,64px)] py-5 backdrop-blur-[2px]">
        <a href="#top" className="flex items-center gap-3.5">
          <LogoMark size={34} />
          <span className="font-cinzel text-[0.9rem] font-semibold tracking-[0.34em] text-ob-text">
            OBSIDIAN CLUB
          </span>
        </a>
        <nav className="flex items-center gap-[clamp(18px,3vw,40px)]">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="ob-navlink hidden font-inter text-[0.72rem] font-medium tracking-[0.22em] text-ob-muted transition-colors hover:text-ob-text min-[780px]:inline"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/login"
            className="ob-navlink font-inter text-[0.7rem] font-medium tracking-[0.2em] text-ob-muted transition-colors hover:text-ob-text"
          >
            Sign In
          </a>
          <a href="#apply" className="btn-secondary !px-[1.4rem] !py-[0.6rem] !text-[0.72rem]">
            Apply
          </a>
        </nav>
      </header>

      {/* ============ HERO ============ */}
      <section
        id="top"
        className="relative flex min-h-screen items-center overflow-hidden bg-ob-black px-[clamp(20px,6vw,64px)] pb-24 pt-[132px]"
      >
        <div
          className="animate-ob-drift pointer-events-none absolute left-[34%] top-[44%] h-[min(820px,110vw)] w-[min(820px,110vw)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(139,26,26,0.24)_0%,rgba(139,26,26,0.07)_34%,transparent_66%)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-[clamp(44px,6vw,88px)] md:grid-cols-2">
          {/* Poster */}
          <Reveal className="flex justify-center">
            <div className="relative w-full max-w-[392px]">
              <div className="pointer-events-none absolute -inset-[13px] border border-ob-border" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-library.png"
                alt="Obsidian Club — Private Community"
                width={853}
                height={1844}
                className="block aspect-[853/1844] w-full shadow-[0_26px_80px_rgba(0,0,0,0.72)]"
              />
            </div>
          </Reveal>

          {/* Copy */}
          <div className="flex flex-col items-start text-left">
            <Reveal>
              <p className="m-0 mb-[26px] font-inter text-[0.74rem] font-semibold tracking-[0.42em] text-ob-accent">
                By Invitation Only
              </p>
            </Reveal>

            <Reveal>
              <h1 className="m-0 font-cinzel text-[clamp(2.1rem,4.6vw,3.9rem)] font-semibold uppercase leading-[1.12] tracking-[0.05em] text-ob-text">
                A Private Community
                <br />
                For Those Who Lead
              </h1>
            </Reveal>

            <Reveal>
              <p className="m-0 mt-[26px] max-w-[480px] font-cormorant text-[clamp(1.12rem,1.8vw,1.42rem)] font-light leading-[1.6] text-ob-muted">
                Not a network. Not a status symbol. A closed circle of those who
                understand that power is a responsibility — and carry it in
                silence.
              </p>
            </Reveal>

            <Reveal>
              <div className="my-[34px] flex items-center gap-5">
                <span className="font-cinzel text-[0.8rem] tracking-[0.3em] text-ob-gold">POWER</span>
                <span className="h-[5px] w-[5px] rotate-45 bg-ob-accent" />
                <span className="font-cinzel text-[0.8rem] tracking-[0.3em] text-ob-gold">DISCIPLINE</span>
                <span className="h-[5px] w-[5px] rotate-45 bg-ob-accent" />
                <span className="font-cinzel text-[0.8rem] tracking-[0.3em] text-ob-gold">TRUST</span>
              </div>
            </Reveal>

            <Reveal className="w-full max-w-[460px]">
              <HeroInviteForm />
            </Reveal>
          </div>
        </div>
      </section>

      <hr className="divider-accent mx-[clamp(20px,10vw,220px)]" />

      {/* ============ ETHOS / FOUNDER ============ */}
      <section id="ethos" className="mx-auto max-w-[1180px] px-[clamp(20px,6vw,64px)] py-[clamp(80px,12vh,150px)]">
        <div className="grid grid-cols-1 items-center gap-[clamp(40px,6vw,90px)] md:grid-cols-2">
          <div>
            <Reveal>
              <p className="m-0 mb-[26px] font-inter text-[0.72rem] font-semibold tracking-[0.32em] text-ob-accent">
                The Founder
              </p>
            </Reveal>
            <Reveal>
              <blockquote className="m-0 font-cormorant text-[clamp(1.6rem,3.2vw,2.5rem)] font-light italic leading-[1.32] text-ob-text">
                &ldquo;Power is not a privilege. It is a responsibility — to
                yourself, and to those around you.&rdquo;
              </blockquote>
            </Reveal>
            <Reveal>
              <div className="mt-[34px] flex items-center gap-4">
                <span className="h-px w-11 bg-ob-gold" />
                <span className="font-cinzel text-[0.82rem] tracking-[0.28em] text-ob-gold">LORD OBSIDIAN</span>
              </div>
            </Reveal>
            <Reveal>
              <p className="text-body mt-7 max-w-[460px]">
                He speaks rarely, and only when it matters. The Club is built
                in his image: composed, deliberate, and closed to those who
                mistake noise for strength.
              </p>
            </Reveal>
          </div>

          <Reveal>
            <div className="relative">
              <div className="pointer-events-none absolute -inset-[14px] z-[3] border border-ob-border" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/lord-obsidian-hero.png"
                alt="Lord Obsidian"
                width={1122}
                height={1402}
                className="block aspect-[1122/1402] w-full shadow-[0_0_40px_rgba(0,0,0,0.6)]"
              />
              <div className="mt-7 text-center">
                <p className="m-0 font-cormorant text-[clamp(1.3rem,2.4vw,1.75rem)] font-light italic leading-[1.32] text-ob-text">
                  &ldquo;I speak rarely. Only when it matters.&rdquo;
                </p>
                <div className="mt-5 flex items-center justify-center gap-3.5">
                  <span className="h-px w-[34px] bg-ob-gold" />
                  <span className="font-cinzel text-[0.78rem] tracking-[0.28em] text-ob-gold">— LORD OBSIDIAN</span>
                  <span className="h-px w-[34px] bg-ob-gold" />
                </div>
                <p className="mt-3.5 font-inter text-[0.72rem] uppercase tracking-[0.18em] text-ob-muted">
                  Founder. The Circle begins with him.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ PRINCIPLES ============ */}
      <section id="principles" className="bg-ob-dark px-[clamp(20px,6vw,64px)] py-[clamp(80px,12vh,150px)]">
        <div className="mx-auto max-w-[1180px]">
          <Reveal className="mb-[clamp(48px,7vh,84px)] text-center">
            <p className="m-0 mb-5 font-inter text-[0.72rem] font-semibold tracking-[0.32em] text-ob-accent">
              The Five Principles
            </p>
            <h2 className="m-0 font-cinzel text-[clamp(1.7rem,3.4vw,2.7rem)] font-semibold uppercase tracking-[0.06em] text-ob-text">
              What We Stand Upon
            </h2>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 gap-px border border-ob-border bg-ob-border sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <RevealItem key={p.n} index={i} className="bg-ob-black p-[clamp(28px,3vw,44px)]">
                <span className="font-cinzel text-[0.8rem] tracking-[0.2em]" style={{ color: "var(--color-accent-muted)" }}>
                  {p.n}
                </span>
                <h3 className="my-4 font-cinzel text-[1.25rem] font-semibold uppercase tracking-[0.1em] text-ob-text">
                  {p.title}
                </h3>
                <p className="text-body m-0 !text-base">{p.line}</p>
              </RevealItem>
            ))}
            <RevealItem index={5} className="flex items-center justify-center bg-ob-black p-[clamp(28px,3vw,44px)]">
              <LogoMark size={70} opacity={0.5} />
            </RevealItem>
          </RevealGroup>
        </div>
      </section>

      {/* ============ ADMISSION ============ */}
      <section id="admission" className="mx-auto max-w-[1000px] px-[clamp(20px,6vw,64px)] py-[clamp(80px,12vh,150px)]">
        <Reveal className="mb-[clamp(48px,7vh,80px)] text-center">
          <p className="m-0 mb-5 font-inter text-[0.72rem] font-semibold tracking-[0.32em] text-ob-accent">Admission</p>
          <h2 className="m-0 font-cinzel text-[clamp(1.7rem,3.4vw,2.7rem)] font-semibold uppercase tracking-[0.06em] text-ob-text">
            There Is Only One Way In
          </h2>
        </Reveal>

        <div className="flex flex-col">
          {ADMISSION.map((step, i) => (
            <Reveal key={step.numeral}>
              <div
                className={`grid grid-cols-[80px_1fr] items-baseline gap-[clamp(20px,4vw,48px)] border-t border-ob-border py-[38px] ${
                  i === ADMISSION.length - 1 ? "border-b" : ""
                }`}
              >
                <span className="font-cinzel text-[2rem] text-ob-accent">{step.numeral}</span>
                <div>
                  <h3 className="m-0 mb-[10px] font-cinzel text-[1.2rem] font-semibold uppercase tracking-[0.1em] text-ob-text">
                    {step.title}
                  </h3>
                  <p className="text-body m-0 max-w-[600px]">{step.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ APPLICATION FORM ============ */}
      <section id="apply" className="scroll-mt-16 bg-ob-dark px-[clamp(20px,6vw,64px)] py-[clamp(80px,12vh,150px)]">
        <div className="mx-auto max-w-[600px]">
          <Reveal className="mb-12 text-center">
            <div className="mb-7 flex justify-center">
              <LogoMark size={60} />
            </div>
            <h2 className="m-0 font-cinzel text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold uppercase tracking-[0.06em] text-ob-text">
              Request Consideration
            </h2>
            <p className="text-body mx-auto mt-4 max-w-[440px]">
              Answer plainly. What you leave out tells us as much as what you write.
            </p>
          </Reveal>

          <ApplicationForm />
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-ob-border px-[clamp(20px,6vw,64px)] pb-11 pt-[clamp(48px,7vh,80px)]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-start justify-between gap-9">
          <div className="flex max-w-[320px] flex-col gap-4">
            <div className="flex items-center gap-[13px]">
              <LogoMark size={30} />
              <span className="font-cinzel text-[0.85rem] font-semibold tracking-[0.32em] text-ob-text">
                OBSIDIAN CLUB
              </span>
            </div>
            <p className="text-ob-subtle m-0 font-inter text-[0.72rem] tracking-[0.24em]">BY INVITATION ONLY</p>
          </div>
          <nav className="flex flex-wrap gap-[clamp(28px,5vw,64px)]">
            <a href="#ethos" className="font-inter text-[0.72rem] font-medium tracking-[0.22em] text-ob-muted transition-colors hover:text-ob-text">
              The Ethos
            </a>
            <a href="#principles" className="font-inter text-[0.72rem] font-medium tracking-[0.22em] text-ob-muted transition-colors hover:text-ob-text">
              Principles
            </a>
            <a href="#admission" className="font-inter text-[0.72rem] font-medium tracking-[0.22em] text-ob-muted transition-colors hover:text-ob-text">
              Admission
            </a>
            <a href="#apply" className="font-inter text-[0.72rem] font-medium tracking-[0.22em] text-ob-muted transition-colors hover:text-ob-text">
              Apply
            </a>
          </nav>
        </div>
        <div className="mx-auto mt-[52px] flex max-w-[1180px] flex-wrap items-center justify-between gap-4 border-t pt-7" style={{ borderColor: "var(--color-border-subtle)" }}>
          <span className="text-ob-subtle font-inter text-[0.68rem] tracking-[0.14em]">
            © MMXXVI OBSIDIAN CLUB. ALL RIGHTS RESERVED.
          </span>
          <span className="font-cinzel text-[0.7rem] tracking-[0.3em] text-ob-gold">POWER · DISCIPLINE · TRUST</span>
        </div>
      </footer>
    </div>
  );
}
