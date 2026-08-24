"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

// The landing page's quiet secondary path (landing-page pivot,
// 2026-08-23, see DECISIONS.md) — email only, deliberately not styled
// or worded as an application. No email is sent back and no token is
// ever minted from this; POST /api/waiting-list just records the row.
export default function WaitingListForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const email = new FormData(form).get("email");

    try {
      const res = await fetch("/api/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    // Bare placeholder — Max supplies the real acknowledgement copy
    // alongside the rest of this pivot's placeholder text.
    return (
      <p className="text-caption mt-4" style={{ color: "var(--color-warning)" }}>
        Received. PLACEHOLDER — acknowledgement copy pending
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-4 max-w-xs" noValidate>
      <div className="flex items-center gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email"
          className="input"
        />
        <button type="submit" className="btn-secondary shrink-0" disabled={status === "submitting"}>
          {status === "submitting" ? "…" : "Submit"}
        </button>
      </div>
      {status === "error" && error ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
