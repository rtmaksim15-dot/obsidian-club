import "server-only";
import type { AdminAuthEventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isAdminId } from "@/lib/auth/admin-allowlist";
import { sendAdminSignInAlert } from "@/lib/utils/email";

// Admin access hardening (item 2, 2026-09-17, see DECISIONS.md). Only
// events against a real, allowlisted admin account are worth logging —
// see resolveAdminByEmail() below, called before this at every site
// that might be dealing with an unknown/mistyped email.
export async function logAdminAuthEvent(params: {
  userId: string | null;
  email: string;
  type: AdminAuthEventType;
  ip: string;
  userAgent: string | null;
}) {
  await prisma.adminAuthEvent.create({ data: params });

  if (params.type === "sign_in_success") {
    // Fire-and-forget — an alert-email failure must never fail the
    // sign-in itself, same "never let a side effect block the real
    // action" rule this codebase already applies to daily-login REP.
    sendAdminSignInAlert({ email: params.email, ip: params.ip, userAgent: params.userAgent, at: new Date() }).catch(
      (err) => console.error("[admin-auth-log] Failed to send sign-in alert:", err),
    );
  }
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
