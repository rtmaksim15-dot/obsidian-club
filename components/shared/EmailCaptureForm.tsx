"use client";

import { useState } from "react";

// Item 1, 2026-09-17 — replaces WaitingListForm/the #apply placeholder
// copy. Always shows the same "Noted." on submit, regardless of whether
// the address was new, a duplicate, or rejected server-side — the API
// itself returns an identical response for all three (see
// app/api/email-capture/route.ts), so there's nothing here to branch on.
export default function EmailCaptureForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), website: data.get("website") }),
      });
    } catch {
      // Network failure gets the same "Noted." as everything else —
      // there's no error state to show that wouldn't itself be a signal.
    }
    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <p className="text-caption mt-4" style={{ color: "var(--color-text-secondary)" }}>
        Noted.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-4 max-w-xs" noValidate>
      {/* Honeypot — hidden from sighted users and skipped by tab order.
          Not display:none: some bots specifically skip fields hidden
          that way, so this is off-screen instead. A real visitor never
          fills it in; anything that does is treated as a bot server-side. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email"
          maxLength={254}
          className="input"
        />
        <button type="submit" className="btn-secondary shrink-0" disabled={submitting}>
          {submitting ? "…" : "Leave"}
        </button>
      </div>
    </form>
  );
}
