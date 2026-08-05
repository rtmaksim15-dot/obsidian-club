"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { token: string; defaultName: string; email: string };

export default function InviteRegistrationForm({ token, defaultName, email }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not complete registration.");
        setSubmitting(false);
        return;
      }

      if (body.signedIn) {
        router.push("/feed");
        router.refresh();
      } else {
        // Account was created but the automatic sign-in failed — a real
        // account exists, so send them to log in with what they just set.
        router.push("/login?next=/feed");
      }
    } catch {
      // Block 3 (August hardening pass, 2026-08-04): a raw fetch()
      // failure never carries a human-authored message — fixed
      // fallback, not err.message.
      setError("Could not complete registration.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 w-full max-w-sm space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="input-label">
          Name
        </label>
        <input
          id="name"
          required
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="How you will be known"
        />
      </div>

      <div>
        <label htmlFor="email" className="input-label">
          Email
        </label>
        <input id="email" className="input" value={email} disabled />
      </div>

      <div>
        <label htmlFor="password" className="input-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="input-label">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Entering…" : "Enter"}
      </button>
    </form>
  );
}
