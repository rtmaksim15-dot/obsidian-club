"use client";

import { useSearchParams } from "next/navigation";

// Manual fallback for a member who has a printed short code but can't
// scan the card's QR (batch generator v2, 2026-08-14) — resolves to
// the real token, then hands off to the same /join/[token] flow.
//
// Security fix (2026-09-23, see DECISIONS.md) — this used to fetch()
// POST /api/join/resolve-code, read the resolved token out of the JSON
// response, and router.push() to it client-side. Now a plain HTML form
// posts directly to that route; the server responds with a real HTTP
// redirect (either straight to /join/:token, or back here with an
// ?error= code) that the browser follows as a normal navigation. No
// client-side code ever sees or handles the token — see that route's
// own comment for the full reasoning.
const ERROR_MESSAGES: Record<string, string> = {
  not_found: "That code wasn't found.",
  invalid: "Enter a code.",
  rate_limited: "Too many attempts from this connection. Try again later.",
  locked: "Code lookup is temporarily unavailable. Try again shortly.",
};

export default function ShortCodeEntryForm() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const error = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Could not look up that code.") : null;

  return (
    <form action="/api/join/resolve-code" method="POST" className="mt-10 w-full max-w-sm space-y-5" noValidate>
      <div>
        <label htmlFor="shortCode" className="input-label">
          Invitation code
        </label>
        <input
          id="shortCode"
          name="shortCode"
          required
          className="input text-center uppercase tracking-[0.15em]"
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

      <button type="submit" className="btn-primary w-full">
        Continue
      </button>
    </form>
  );
}
