"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const MIN_ANSWER_LENGTH = 20;

// The invitation panel's form — Invitation Panel flow, A2 (2026-08-2x).
// Field order is deliberate, per instruction: the free-text question is
// the only field that requires thought, so it goes last, right before
// submit — putting it first would lose people who hit it cold.
export default function InvitationPanelForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [ageAndTruthChecked, setAgeAndTruthChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedAnswer = answer.trim();
    if (trimmedAnswer.length < MIN_ANSWER_LENGTH) {
      setError(`Please write at least ${MIN_ANSWER_LENGTH} characters.`);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          city: formData.get("city"),
          ageConfirmed: formData.get("ageConfirmed") === "on",
          answer: trimmedAnswer,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      // A raw fetch() failure never carries a human-authored message —
      // fixed fallback, not err.message (same pattern as ApplicationForm).
      setError("Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    // Final copy (2026-09-09, see DECISIONS.md) — one line, nothing
    // else. No timeline, no next steps, no "we'll be in touch." The
    // club's impersonal voice: restraint is the point.
    return (
      <div className="card-premium mt-10 w-full max-w-sm text-center" style={{ padding: "clamp(32px, 6vw, 48px)" }}>
        <p className="text-h2 !text-base m-0">Your request has been received.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-premium mt-10 flex w-full max-w-sm flex-col gap-[22px]" noValidate>
      <div>
        <label htmlFor="ip-name" className="input-label">
          Name
        </label>
        <input id="ip-name" name="name" required className="input" placeholder="How you wish to be known" />
      </div>

      <div>
        <label htmlFor="ip-email" className="input-label">
          Email
        </label>
        <input id="ip-email" name="email" type="email" required className="input" placeholder="you@example.com" />
        <p className="text-caption mt-1.5" style={{ color: "var(--color-text-muted)" }}>
          Use the email address from your order.
        </p>
      </div>

      <div>
        <label htmlFor="ip-city" className="input-label">
          City <span className="normal-case">(optional)</span>
        </label>
        <input id="ip-city" name="city" className="input" placeholder="Where you are" />
      </div>

      <label className="flex items-start gap-3 text-left text-[0.8rem] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        <input type="checkbox" name="ageConfirmed" required className="mt-1 shrink-0" />
        <span>I am at least 18 years old.</span>
      </label>

      {/* The two safety checkboxes (2026-09-09, see DECISIONS.md) —
          real copy, replacing the placeholder block. Both required,
          both gate Submit below. The first restates the age condition
          the standalone 18+ checkbox above already covers (flagged,
          not merged — implemented literally as specified). */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 text-left text-[0.8rem] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          <input
            type="checkbox"
            required
            checked={ageAndTruthChecked}
            onChange={(e) => setAgeAndTruthChecked(e.target.checked)}
            className="mt-1 shrink-0"
          />
          <span>I am 18 or older, and everything I&apos;ve written here is true.</span>
        </label>
        <label className="flex items-start gap-3 text-left text-[0.8rem] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          <input
            type="checkbox"
            required
            checked={privacyChecked}
            onChange={(e) => setPrivacyChecked(e.target.checked)}
            className="mt-1 shrink-0"
          />
          <span>I understand this is a private community. What happens inside stays inside.</span>
        </label>
      </div>

      <div>
        <label htmlFor="ip-answer" className="input-label">
          What do you hope to find in a circle like this?
        </label>
        <textarea
          id="ip-answer"
          name="answer"
          required
          rows={4}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="input resize-y font-cormorant"
        />
        <p className="text-caption mt-1.5" style={{ color: "var(--color-text-muted)" }}>
          We read every answer.
        </p>
      </div>

      {status === "error" && error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={status === "submitting" || !ageAndTruthChecked || !privacyChecked}
      >
        {status === "submitting" ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
