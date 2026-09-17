"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Item 2, 2026-09-17 — the per-sign-in TOTP step-up, shared by both
// sign-in paths (password: app/(auth)/login/page.tsx redirects here
// after a successful password check that still needs aal2; OAuth:
// app/auth/callback/route.ts redirects here the same way instead of
// going straight to `next`). One challenge screen, not two copies of
// the same logic.
export default function MfaChallengeForm({ next }: { next: string }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/auth/mfa/factors")
      .then((res) => res.json())
      .then((body) => {
        const verified = (body.factors ?? []).find((f: { status: string }) => f.status === "verified");
        if (verified) setFactorId(verified.id);
        else setLoadError(true);
      })
      .catch(() => setLoadError(true));
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId, code }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Incorrect code.");
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (loadError) {
    return (
      <p className="text-body text-center" style={{ color: "var(--color-error)" }}>
        No authenticator on file. Sign in again, or contact support.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 w-full max-w-sm space-y-5">
      <div>
        <label htmlFor="mfa-code" className="input-label">
          Code from your authenticator app
        </label>
        <input
          id="mfa-code"
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          maxLength={6}
          autoFocus
          autoComplete="one-time-code"
        />
      </div>
      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn-primary w-full" disabled={busy || !factorId || code.length < 6}>
        {busy ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
