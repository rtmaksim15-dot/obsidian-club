import "server-only";
import { prisma } from "@/lib/db/prisma";
import { LEGAL_DOC_VERSIONS } from "./doc-versions";

// Called once at account creation (app/api/join/[token]/route.ts,
// app/api/invite/[token]/route.ts) and again by the one-time re-consent
// interstitial for members whose latest row predates the current
// LEGAL_DOC_VERSIONS. By the time either caller reaches this, all three
// registration checkboxes were necessarily checked — the form disables
// submit until they are — so this row's mere existence is the record of
// that, no separate booleans needed.
export async function recordLegalConsent(userId: string, ip: string) {
  return prisma.legalConsent.create({
    data: {
      userId,
      termsVersion: LEGAL_DOC_VERSIONS.terms,
      privacyVersion: LEGAL_DOC_VERSIONS.privacy,
      aupVersion: LEGAL_DOC_VERSIONS.aup,
      acceptedIp: ip,
    },
  });
}
