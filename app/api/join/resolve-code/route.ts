import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

// POST /api/join/resolve-code — resolves a printed OBS-XXXX-XXXX short
// code to its full token, for the manual-entry fallback at /join when
// scanning the QR isn't possible (batch generator v2, 2026-08-14).
//
// Security fix (2026-09-23, see DECISIONS.md), two changes:
//
// 1. Beyond the per-IP rate limit (5/hr — still the first line of
// defense against a single actor), every attempt is now logged to
// ShortCodeAttempt and a GLOBAL, rolling-window failure count gates the
// whole endpoint regardless of which IP is asking — a distributed
// guesser spreading attempts across many IPs to stay under any one IP's
// budget can't evade this the way it could the per-IP limit alone.
// There's no separate "locked until" timestamp: the rolling window
// itself is the cooldown — once enough old failures age out of it, the
// budget naturally has room again, and continued attack pressure during
// the lockout keeps extending it for exactly the same reason (every
// blocked attempt is logged too, feeding the same window). The budget
// is set high enough that normal traffic for a small private club
// (typo'd codes included) will essentially never trip it, but far below
// what a real brute-force campaign against the ~10^12 short-code
// keyspace would need to get anywhere.
//
// 2. This used to return the resolved 48-hex-char token directly in the
// JSON body, for client-side JS to router.push() to /join/:token —
// meaning the token passed through readable client state (a fetch
// response body) for no reason a redirect couldn't serve just as well.
// This route is now POSTed to via a plain HTML form (no fetch/JS
// involved — see ShortCodeEntryForm.tsx), and responds with a real
// HTTP redirect: 303 straight to /join/:token on a match (the browser
// follows it as a normal top-level navigation; no application code ever
// reads the token value), or back to /join with an ?error= code on
// anything else. The token still ends up in the URL bar either way —
// that's inherent to /join/:token's own design, not something this
// change removes — but it's no longer something a JSON response body
// or a piece of client JS state ever has to carry.
const RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };
const GLOBAL_FAILURE_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_FAILURE_BUDGET = 30;

function redirectToJoin(request: NextRequest, error: string, status = 303) {
  const url = new URL("/join", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, status);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rateLimit = await checkRateLimit(`join-resolve-code:${ip}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return redirectToJoin(request, "rate_limited");
  }

  const windowStart = new Date(Date.now() - GLOBAL_FAILURE_WINDOW_MS);
  const recentFailures = await prisma.shortCodeAttempt.count({
    where: { success: false, createdAt: { gte: windowStart } },
  });
  if (recentFailures >= GLOBAL_FAILURE_BUDGET) {
    await prisma.shortCodeAttempt.create({ data: { shortCode: "(locked-out)", success: false, ip } });
    return redirectToJoin(request, "locked");
  }

  let shortCode: string | undefined;
  try {
    const formData = await request.formData();
    shortCode = formData.get("shortCode")?.toString().trim().toUpperCase();
  } catch {
    return redirectToJoin(request, "invalid");
  }
  if (!shortCode) {
    return redirectToJoin(request, "invalid");
  }

  const invite = await prisma.inviteToken.findUnique({
    where: { shortCode },
    select: { token: true },
  });

  await prisma.shortCodeAttempt.create({ data: { shortCode, success: Boolean(invite), ip } });

  if (!invite) {
    return redirectToJoin(request, "not_found");
  }

  return NextResponse.redirect(new URL(`/join/${invite.token}`, request.url), 303);
}
