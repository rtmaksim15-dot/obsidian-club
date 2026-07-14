"use client";

// Hero-only email capture (Landing Page redesign, 2026-07). Deliberately
// does not submit to /api/waitlist itself — the API requires a full
// application (name + 18+ age, a compliance checkpoint) and this field is
// just an email. Submitting here scrolls to the real application form at
// #apply and carries the typed email down with it, per Max's decision
// (DECISIONS.md): the hero is a funnel, not a second intake path.
export default function HeroInviteForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    const emailInput = document.getElementById("oc-email") as HTMLInputElement | null;
    if (emailInput && typeof email === "string") {
      emailInput.value = email;
    }
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
      <div className="flex flex-wrap gap-2.5">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className="input min-w-[200px] flex-1"
        />
        <button type="submit" className="btn-primary whitespace-nowrap">
          Request Invitation
        </button>
      </div>
      <p className="text-ob-subtle m-0 font-inter text-[0.72rem] tracking-[0.04em]">
        Every request is read by hand. Not everyone is accepted.
      </p>
    </form>
  );
}
