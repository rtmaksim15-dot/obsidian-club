import { NextResponse } from "next/server";

// RETIRED (item 1, 2026-09-17, see DECISIONS.md). The #apply section's
// secondary path now posts to POST /api/email-capture (EmailCapture
// table) instead, with real copy, a honeypot, and an identical
// new/duplicate/invalid response — none of which this route had. Kept
// as a 410, not deleted, same "retire in place" pattern as the older
// /api/waitlist — the historical rows already in WaitingListEntry stay
// where they are, nothing currently depends on this route existing.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been retired. Leave an address via the landing page instead." },
    { status: 410 },
  );
}
