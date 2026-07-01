"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function WaitlistForm() {
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
        throw new Error(body?.error ?? "Something went wrong.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="card-premium text-center">
        <p className="text-h2">Your application has been received.</p>
        <p className="text-body mt-4">
          Applications are reviewed manually. If you are accepted, you will be
          contacted. Not everyone is.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="input-label">
          Name
        </label>
        <input id="name" name="name" required className="input" placeholder="How you will be known" />
      </div>

      <div>
        <label htmlFor="email" className="input-label">
          Email
        </label>
        <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="age" className="input-label">
            Age
          </label>
          <input id="age" name="age" type="number" min={18} required className="input" placeholder="18+" />
        </div>
        <div>
          <label htmlFor="city" className="input-label">
            City
          </label>
          <input id="city" name="city" className="input" placeholder="Where you are" />
        </div>
      </div>

      <div>
        <label htmlFor="source" className="input-label">
          How you heard of us
        </label>
        <input id="source" name="source" className="input" placeholder="A name, a link, a whisper" />
      </div>

      <div>
        <label htmlFor="referralCode" className="input-label">
          Invitation code <span className="normal-case">(optional)</span>
        </label>
        <input id="referralCode" name="referralCode" className="input" placeholder="If you were invited" />
      </div>

      {status === "error" && error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit Application"}
      </button>

      <p className="text-caption text-center">
        Applications are reviewed manually. Not everyone is accepted.
      </p>
    </form>
  );
}
