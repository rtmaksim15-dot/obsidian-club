import "server-only";
import type { AdminAuthEventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isAdminId } from "@/lib/auth/admin-allowlist";

// Admin access hardening (item 2, 2026-09-17, see DECISIONS.md). Only
// events against a real, allowlisted admin account are worth logging —
// see resolveAdminByEmail() below, called before this at every site
// that might be dealing with an unknown/mistyped email.
//
// Pure DB write only (item 3, 2026-09-22, see DECISIONS.md) — alert
// emailing used to live here too, fired unconditionally whenever
// `type === "sign_in_success"`. Moved out to each call site instead:
// this function can't tell "first-factor success, awaiting code" apart
// from "already at aal2" or "no authenticator enrolled at all," and
// couldn't distinguish a login step-up's mfa_challenge_success from an
// account/security enrollment confirmation's — both are the same event
// type. Each caller has that context; this one just records history.
export async function logAdminAuthEvent(params: {
  userId: string | null;
  email: string;
  type: AdminAuthEventType;
  ip: string;
  userAgent: string | null;
}) {
  await prisma.adminAuthEvent.create({ data: params });
}

/**
 * Resolves an attempted sign-in email to a real, allowlisted admin
 * account, or null. Used to decide whether an event is even worth
 * writing to the log — a typo'd email or a stranger's login attempt
 * against a non-admin account isn't "an admin sign-in attempt" just
 * because someone typed something.
 */
export async function resolveAdminByEmail(email: string): Promise<{ id: string } | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user && isAdminId(user.id)) return { id: user.id };
  return null;
}
