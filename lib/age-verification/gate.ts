import "server-only";
import { NextResponse } from "next/server";
import { AGE_VERIFICATION_ENABLED } from "./index";

export { AGE_VERIFICATION_ENABLED };

type GateUser = { isAdmin: boolean; ageVerified: boolean };

// A6: gate applies only while AGE_VERIFICATION_ENABLED=true, and admins
// always bypass — same "founder exception" every other member-facing
// gate in this app (ritual, Doors) already uses.
export function needsAgeVerification(user: GateUser): boolean {
  if (!AGE_VERIFICATION_ENABLED) return false;
  if (user.isAdmin) return false;
  return !user.ageVerified;
}

// Drop this at the top of a member API route, right after
// getCurrentUser(): `const blocked = requireAgeVerifiedApi(user); if
// (blocked) return blocked;`
export function requireAgeVerifiedApi(user: GateUser): NextResponse | null {
  if (!needsAgeVerification(user)) return null;
  return NextResponse.json({ error: "Age verification required." }, { status: 403 });
}
