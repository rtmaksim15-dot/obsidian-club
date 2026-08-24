import { NextResponse } from "next/server";

// LEGACY — retired (landing-page pivot, 2026-08-23, see DECISIONS.md).
// The landing page's inline application form (ApplicationForm.tsx, no
// longer rendered anywhere) used to POST here. Superseded by the
// Invitation Panel flow: applications now only come from /invitation
// (POST /api/applications), and the landing page's own "apply" section
// is now the artifact/waiting-list pair, not a form. Kept as a 410,
// not deleted, per the same "retire in place" pattern as the invite-
// batch generator — nothing currently depends on this route existing.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been retired. Applications now go through the invitation panel." },
    { status: 410 },
  );
}
