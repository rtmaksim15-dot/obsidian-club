import "server-only";

// NEXT_PUBLIC_APP_URL loud-failure fix (2026-09-12, see DECISIONS.md).
// Every prior reader of this env var did `process.env.NEXT_PUBLIC_APP_URL
// || ""` and interpolated the result straight into a URL — when unset,
// that produced a domain-less string (e.g. "/join/abc123") that looks
// like a plausible value right up until someone tries to actually open
// it outside the app. Confirmed live in production: og:image resolved to
// localhost, and the /hall "My Invitation"/"Partner" copy links would
// have silently done the same to anyone who used them while the var was
// unset. `getAppUrl()` centralizes the read so every caller gets the
// same loud server-side log instead of rediscovering the silent-`""`
// failure independently — callers still decide their own user-facing
// treatment (a hard crash isn't right for every one of them; see
// app/layout.tsx vs hall/page.tsx).
export function getAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    console.error(
      "[config] NEXT_PUBLIC_APP_URL is not set — any link built from it is being suppressed rather than silently rendered without a domain.",
    );
    return null;
  }
  return url;
}
