// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md) —
// task 5's "approximate location from IP (country/region only)" for
// the admin sign-in alert email. Deliberately NOT a MaxMind/IP-API
// lookup (a new paid or rate-limited external dependency for one email
// field) — Vercel already attaches geolocation headers to every request
// at the edge (x-vercel-ip-country / -country-region), country/region
// only, exactly the granularity asked for, no new service to integrate
// or secret to provision. Absent in local dev (no edge network in
// front of `next dev`) and on any host other than Vercel — degrades to
// "Unknown location" rather than guessing, same fail-safe pattern as
// every other optional-signal helper in this codebase.
export function getApproxLocation(headers: Headers): string {
  const country = headers.get("x-vercel-ip-country");
  const region = headers.get("x-vercel-ip-country-region");

  if (!country) return "Unknown location";
  return region ? `${region}, ${country}` : country;
}
