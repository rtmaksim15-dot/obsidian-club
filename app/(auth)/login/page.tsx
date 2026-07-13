"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/auth/supabase-browser";

// Gates the "Continue with Apple" button on a real, working backend —
// Supabase's Apple provider needs a paid Apple Developer account, a
// Services ID, and a signed key configured in its own dashboard (none
// of which exist yet, see TECH_DEBT.md). Rendering a clickable button
// that's guaranteed to fail would be a real, live-visitor-facing bug,
// not just an internal placeholder — so this stays disabled until Max
// sets NEXT_PUBLIC_APPLE_SIGNIN_ENABLED=true once it's actually wired up
// in the Supabase dashboard, the same "degrade gracefully, don't crash
// or half-work" rule applied to every other unconfigured integration.
const appleSignInEnabled = process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED === "true";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth" ? "Sign-in failed. Try again." : null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setSubmitting(false);
      return;
    }

    router.push(searchParams.get("next") || "/hall");
    router.refresh();
  }

  async function handleOAuthSignIn(provider: "google" | "apple") {
    setError(null);
    const supabase = createClient();
    const next = searchParams.get("next") || "/hall";
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8">Enter</h1>
      <p className="text-body mt-2 text-center italic">Access is granted, not registered for.</p>

      <form onSubmit={handleSubmit} className="mt-10 w-full max-w-sm space-y-5" noValidate>
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
            autoComplete="email"
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
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
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

      <div className="mt-8 flex w-full max-w-sm items-center gap-4">
        <hr className="flex-1 border-ob-border" />
        <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
          or
        </span>
        <hr className="flex-1 border-ob-border" />
      </div>

      <button
        type="button"
        onClick={() => handleOAuthSignIn("google")}
        className="btn-secondary mt-8 flex w-full max-w-sm items-center justify-center gap-3"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11C3.25 21.3 7.28 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.61H1.27A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.27 5.39l4-3.11z"
          />
          <path
            fill="#EA4335"
            d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.25 2.7 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77z"
          />
        </svg>
        Continue with Google
      </button>

      {appleSignInEnabled ? (
        <button
          type="button"
          onClick={() => handleOAuthSignIn("apple")}
          className="btn-secondary mt-4 flex w-full max-w-sm items-center justify-center gap-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M16.365 1.43c0 1.14-.415 2.06-1.246 2.99-.94.94-2.11 1.55-3.33 1.44-.09-1.1.41-2.06 1.23-2.98.9-.94 2.14-1.5 3.34-1.45zM20.5 17.28c-.51 1.17-.75 1.69-1.4 2.72-.9 1.44-2.18 3.24-3.75 3.25-1.4.01-1.76-.92-3.66-.91-1.9.01-2.3.93-3.7.92-1.57-.02-2.78-1.63-3.68-3.07-2.53-4.03-2.8-8.77-1.24-11.28.79-1.28 2.28-2.09 3.85-2.13 1.6-.04 2.6.94 3.6.94.98 0 2.31-1.16 3.9-.99.66.03 2.51.27 3.7 2.03-3.19 1.75-2.67 6.28.28 7.52z" />
          </svg>
          Continue with Apple
        </button>
      ) : (
        <div
          className="mt-4 flex w-full max-w-sm cursor-not-allowed items-center justify-center gap-3 opacity-40"
          style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            padding: "0.875rem 2rem",
            border: "1px solid var(--color-border)",
            borderRadius: "2px",
          }}
          title="Apple Sign-In isn't configured yet"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M16.365 1.43c0 1.14-.415 2.06-1.246 2.99-.94.94-2.11 1.55-3.33 1.44-.09-1.1.41-2.06 1.23-2.98.9-.94 2.14-1.5 3.34-1.45zM20.5 17.28c-.51 1.17-.75 1.69-1.4 2.72-.9 1.44-2.18 3.24-3.75 3.25-1.4.01-1.76-.92-3.66-.91-1.9.01-2.3.93-3.7.92-1.57-.02-2.78-1.63-3.68-3.07-2.53-4.03-2.8-8.77-1.24-11.28.79-1.28 2.28-2.09 3.85-2.13 1.6-.04 2.6.94 3.6.94.98 0 2.31-1.16 3.9-.99.66.03 2.51.27 3.7 2.03-3.19 1.75-2.67 6.28.28 7.52z" />
          </svg>
          Continue with Apple
        </div>
      )}

      <p className="text-caption mt-10 text-center" style={{ color: "var(--color-text-secondary)" }}>
        Haven&apos;t applied yet?{" "}
        <a href="/#apply" className="underline hover:text-ob-text">
          Request access
        </a>
        .
      </p>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
