import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { recordDmRulesAcceptance } from "@/lib/legal/dm-rules";
import { getClientIp } from "@/lib/security/rate-limit";

// POST /api/dm/rules-acceptance — item 4. One row, recorded in the
// existing consent log (see lib/legal/dm-rules.ts).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  await recordDmRulesAcceptance(user.id, getClientIp(request));
  return NextResponse.json({ ok: true });
}
