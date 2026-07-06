"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/auth/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth" ? "Google sign-in failed. Try again." : null
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

  async function handleGoogleSignIn() {
    setError(null);
    const supabase = createClient();
    const next = searchParams.get("next") || "/hall";
    await supabase.auth.signInWithOAuth({
      provider: "google",
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
        onClick={handleGoogleSignIn}
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
