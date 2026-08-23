import { NextResponse } from "next/server";

// POST /api/admin/invite-batches — RETIRED as of the Invitation Panel
// flow (A1, 2026-08-2x, see DECISIONS.md). The physical card no longer
// carries a unique token — every card points at the same public
// invitation panel, and a token is only ever minted on Accept in the
// applications queue (see app/api/admin/applications/[id]/route.ts).
// Kept as a guarded 410, not deleted, so a stale bookmark or direct
// call can't mint a meaningless batch. History: git log this file for
// the original card-number-sequencing generator.
export async function POST() {
  return NextResponse.json(
    { error: "Batch generation has been retired. New invitations go through the applications queue." },
    { status: 410 },
  );
}
