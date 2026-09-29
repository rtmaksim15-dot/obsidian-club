import { NextResponse } from "next/server";

// POST /api/csp-report — the `report-uri` target for the Report-Only
// Content-Security-Policy header (Fix 8, 2026-09-29, see DECISIONS.md).
// Unauthenticated by necessity (the browser sends these on its own,
// with no session context) and publicly reachable, so this stays as
// cheap as possible: no DB write, just a distinctly-tagged console line
// Vercel's function logs capture — same "grep-able tag" pattern as
// [DB_POOL_EXHAUSTED] in lib/db/prisma.ts. Nothing here invents a new
// AnalyticsEvent type; that taxonomy is for real user behavior (see its
// own file's comment), not browser-generated security telemetry.
export async function POST(request: Request) {
  try {
    const body = await request.text();
    // Browsers cap a single report's size in practice, but nothing stops
    // a hostile client from POSTing an arbitrarily large body here —
    // truncate what we log either way.
    console.error("[CSP_REPORT]", body.slice(0, 4000));
  } catch (err) {
    console.error("[CSP_REPORT] failed to read report body:", err);
  }
  // Browsers don't read this response; 204 is the conventional reply
  // for a report-uri endpoint.
  return new NextResponse(null, { status: 204 });
}
