import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { recordVerificationResult } from "@/lib/age-verification";

// GET /verify/return (A5) — Yoti's `callback.url`, hit after the hosted
// flow finishes. A5's own instruction: "fetch result server-side; never
// trust query params." Taken literally here — this page never reads
// its own search params at all. Instead it looks up the CALLER's own
// most recent `pending` AgeVerification row and asks the provider for
// THAT session's real result server-side. Safe even if Yoti's exact
// callback query-string shape (never confirmed — see
// lib/age-verification/yoti.ts's header comment) turns out to carry
// nothing usable, or something an attacker could forge.
export default async function VerifyReturnPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/verify/return");

  const pending = await prisma.ageVerification.findFirst({
    where: { userId: user.id, status: "pending" },
    orderBy: { createdAt: "desc" },
  });

  if (pending) {
    const updated = await recordVerificationResult(pending.providerSessionId);
    if (updated?.status === "passed") {
      redirect("/ritual");
    }
  }

  // failed / still pending / expired / cancelled / nothing outstanding
  // — /verify itself reads the live state and shows the right copy.
  redirect("/verify");
}
