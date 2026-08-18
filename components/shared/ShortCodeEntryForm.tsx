"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Manual fallback for a member who has a printed short code but can't
// scan the card's QR (batch generator v2, 2026-08-14) — resolves to
// the real token, then hands off to the same /join/[token] flow.
export default function ShortCodeEntryForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/join/resolve-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortCode: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not look up that code.");
        setSubmitting(false);
        return;
      }
      router.push(`/join/${data.token}`);
    } catch {
      setError("Could not look up that code.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 w-full max-w-sm space-y-5" noValidate>
      <div>
        <label htmlFor="shortCode" className="input-label">
          Invitation code
        </label>
        <input
          id="shortCode"
          required
          className="input text-center uppercase tracking-[0.15em]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="OBS-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>

      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={submitting || !code.trim()}>
        {submitting ? "Looking up…" : "Continue"}
      </button>
    </form>
  );
}
