"use client";

// LEGACY — retired (landing-page pivot, 2026-08-23, see DECISIONS.md).
// No longer rendered anywhere (was app/(landing)/page.tsx's "apply"
// section, now the artifact/waiting-list pair). Posted to
// POST /api/waitlist, itself retired to a 410. Kept, not deleted.

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ApplicationForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      // Block 3 (August hardening pass, 2026-08-04): a raw fetch()
      // failure never carries a human-authored message — fixed
      // fallback, not err.message.
      setError("Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="card-premium text-center" style={{ padding: "clamp(40px, 6vw, 64px)" }}>
        <p className="text-h2 m-0">Your application has been received.</p>
        <p className="text-body mt-4">
          Applications are reviewed manually. If you are accepted, you will be
          contacted. Not everyone is.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <span className="h-px w-10 bg-ob-gold" />
          <span className="bg-ob-accent h-1.5 w-1.5 rotate-45" />
          <span className="h-px w-10 bg-ob-gold" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-premium flex flex-col gap-[22px]" noValidate>
      <div>
        <label htmlFor="oc-name" className="input-label">
          Name
        </label>
        <input id="oc-name" name="name" required className="input" placeholder="How you will be known" />
      </div>

      <div>
        <label htmlFor="oc-email" className="input-label">
          Email
        </label>
        <input id="oc-email" name="email" type="email" required className="input" placeholder="you@example.com" />
      </div>

      <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2">
        <div>
          <label htmlFor="oc-age" className="input-label">
            Age
          </label>
          <input id="oc-age" name="age" type="number" min={18} required className="input" placeholder="18+" />
        </div>
        <div>
          <label htmlFor="oc-city" className="input-label">
            City
          </label>
          <input id="oc-city" name="city" className="input" placeholder="Where you are" />
        </div>
      </div>

      <div>
        <label htmlFor="oc-source" className="input-label">
          How you heard of us
        </label>
        <input id="oc-source" name="source" className="input" placeholder="A name, a link, a whisper" />
      </div>

      <div>
        <label htmlFor="oc-reason" className="input-label">
          Why you belong here
        </label>
        <textarea
          id="oc-reason"
          name="reason"
          rows={4}
          className="input resize-y font-cormorant"
          placeholder="Be brief. Be honest."
        />
      </div>

      <div>
        <label htmlFor="oc-code" className="input-label">
          Invitation code <span className="normal-case">(optional)</span>
        </label>
        <input id="oc-code" name="referralCode" className="input" placeholder="If one was given to you" />
      </div>

      {status === "error" && error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary mt-1.5 w-full" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit Application"}
      </button>

      <p className="text-ob-subtle m-0 text-center font-inter text-[0.7rem] tracking-[0.04em]">
        By applying you accept that a decision, if any, is final.
      </p>
    </form>
  );
}
