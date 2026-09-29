// Security headers (Fix 8, 2026-09-29, see DECISIONS.md) — applied via
// next.config's headers() rather than middleware.ts, so they can't
// interfere with that file's session-refresh/route-protection logic
// and apply even to routes middleware's matcher excludes (static
// assets, /auth/callback).
const SUPABASE_ORIGIN = "https://fsleaavvmvlpvfsevosw.supabase.co";
const SUPABASE_WS_ORIGIN = "wss://fsleaavvmvlpvfsevosw.supabase.co";

// Content-Security-Policy — Report-Only for now, by explicit instruction:
// enforcing mode fails closed and silently on production (a blocked
// script/image just doesn't load, no visible error for anyone to
// notice), so this observes real traffic first via the report-uri
// below. 'unsafe-inline' on script-src/style-src matches this app's
// actual current baseline (Next.js's own hydration scripts, Tailwind's
// inline styles) — the point of Report-first is to catch anything
// beyond that baseline (an unexpected third-party script/connection),
// not to flood the reports with expected framework internals before a
// nonce-based tightening pass (separate task, after this one).
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "report-uri /api/csp-report",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No camera/mic/geolocation/payment feature anywhere in this
          // app — locked down rather than left at the browser default.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()",
          },
          // includeSubDomains without preload: the whole site is HTTPS-only
          // on Vercel already, but preload is a much harder-to-reverse
          // commitment (a browser-shipped list) than this task calls for.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
