"use client";

import { useEffect } from "react";
import Logo from "@/components/ui/Logo";

// August hardening pass (ROADMAP v3.1), Block 3 (2026-08-04): Next.js's
// own 500 fallback is generic and off-brand — this catches any
// unhandled render/runtime error in the app and shows something
// on-brand instead of a raw stack trace. Must be a Client Component
// (Next.js convention for error.tsx) and can't reuse the root layout's
// chrome, since the error may have originated inside that layout.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-center text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8">Something Broke</h1>
      <p className="text-body mt-4 max-w-sm">
        Something went wrong on our end. It has been noted &mdash; try again, or come back shortly.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <a href="/" className="btn-ghost">
          Return home
        </a>
      </div>
    </main>
  );
}
