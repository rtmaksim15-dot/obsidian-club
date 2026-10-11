"use client";

import { useState } from "react";
import type { VerifyState } from "@/app/(auth)/verify/page";

// A7 — exact copy per state, approved verbatim. Initial/failed share
// the same "Begin verification" button (failed just adds its own line
// above it); pending/locked/passed show no button at all.
export default function AgeVerificationPanel({ initialState }: { initialState: VerifyState }) {
  const [state, setState] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/age-verification/start", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not start verification.");
        setSubmitting(false);
        return;
      }
      if (body.locked) {
        setState("locked");
        setSubmitting(false);
        return;
      }
      window.location.href = body.redirectUrl;
    } catch {
      setError("Could not start verification.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10 w-full max-w-sm space-y-4 text-center">
      {state === "pending" ? (
        <p className="text-body italic">Your answer is being confirmed. Remain.</p>
      ) : null}

      {state === "passed" ? <p className="text-body italic">It is confirmed. Enter.</p> : null}

      {state === "failed" ? (
        <p className="text-body italic">The threshold was not crossed. You may try again.</p>
      ) : null}

      {state === "locked" ? (
        <p className="text-body italic">
          The door remains closed for now. Write to{" "}
          <a href="mailto:safety@obsidianclub.online" className="underline">
            safety@obsidianclub.online
          </a>
          .
        </p>
      ) : null}

      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      {state === "initial" || state === "failed" ? (
        <button type="button" className="btn-primary w-full" disabled={submitting} onClick={begin}>
          {submitting ? "Beginning…" : "Begin verification"}
        </button>
      ) : null}

      {state === "passed" ? (
        <a href="/ritual" className="btn-primary w-full inline-block">
          Enter
        </a>
      ) : null}
    </div>
  );
}
