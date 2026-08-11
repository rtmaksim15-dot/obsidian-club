import "server-only";
import { prisma } from "@/lib/db/prisma";
import { LEGAL_DOC_VERSIONS } from "./doc-versions";

// True if a member has never given registration consent (pre-dates
// this feature entirely — the 3 real accounts as of 2026-08-10) or
// their most recent consent names an older version of any of the three
// documents. Checked once per protected-page load from
// app/(platform)/layout.tsx, same "live query, no cache" posture the
// ritual-completion and Doors checks already use in this codebase.
export async function needsLegalReconsent(userId: string): Promise<boolean> {
  const latest = await prisma.legalConsent.findFirst({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
  });
  if (!latest) return true;
  return (
    latest.termsVersion !== LEGAL_DOC_VERSIONS.terms ||
    latest.privacyVersion !== LEGAL_DOC_VERSIONS.privacy ||
    latest.aupVersion !== LEGAL_DOC_VERSIONS.aup
  );
}
