"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { token: string };

// Unlike InviteRegistrationForm (name pre-filled, email disabled — both
// known ahead of time from a reviewed Waitlist application), this form
// collects name AND email fresh, since a purchase-card/member-invite/
// partner token has no application behind it.
export default function JoinRegistrationForm({ token }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
      const res = await fetch(`/api/join/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Could not complete registration.");

      if (body.signedIn) {
        router.push("/feed");
        router.refresh();
      } else {
        router.push("/login?next=/feed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete registration.");
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
        <input
          id="email"
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
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

      <p className="text-caption text-center" style={{ color: "var(--color-text-muted)" }}>
        By continuing you confirm you are 18 or older.
      </p>
    </form>
  );
}
