import "server-only";
import { prisma } from "@/lib/db/prisma";
import { DM_RULES_VERSION } from "./doc-versions";

// The first time a member opens /messages, they accept the DM rules
// (2026-09-14, see DECISIONS.md) — recorded in the existing
// LegalConsent log, not a parallel table. A member reaching this point
// has already passed the platform-wide re-consent gate
// (app/(platform)/layout.tsx#needsLegalReconsent), so their latest
// row's terms/privacy/aup versions are already current; this only ever
// checks dmRulesVersion, never re-litigates those three.
export async function needsDmRulesAcceptance(userId: string): Promise<boolean> {
  const latest = await prisma.legalConsent.findFirst({
    where: { userId, dmRulesVersion: { not: null } },
    orderBy: { acceptedAt: "desc" },
  });
  return !latest || latest.dmRulesVersion !== DM_RULES_VERSION;
}

export async function recordDmRulesAcceptance(userId: string, ip: string | null) {
  const latestGeneral = await prisma.legalConsent.findFirst({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
  });
  if (!latestGeneral) {
    // Shouldn't happen — every real member has a registration-time row —
    // but fail loudly rather than writing a row with fabricated versions.
    throw new Error(`No prior LegalConsent row for user ${userId}; cannot record DM rules acceptance.`);
  }

  return prisma.legalConsent.create({
    data: {
      userId,
      termsVersion: latestGeneral.termsVersion,
      privacyVersion: latestGeneral.privacyVersion,
      aupVersion: latestGeneral.aupVersion,
      dmRulesVersion: DM_RULES_VERSION,
      acceptedIp: ip,
    },
  });
}
