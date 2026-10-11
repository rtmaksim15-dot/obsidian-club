import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isLocked } from "@/lib/age-verification";
import { AGE_VERIFICATION_ENABLED } from "@/lib/age-verification/gate";
import Logo from "@/components/ui/Logo";
import AgeVerificationPanel from "@/components/shared/AgeVerificationPanel";

// A7 — exact copy, approved verbatim. Deliberately outside `(platform)`
// (same reasoning as /legal-reconsent): app/(platform)/layout.tsx
// redirects here, so this page must never itself be wrapped by that
// same check.
export type VerifyState = "initial" | "pending" | "failed" | "locked" | "passed";

export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/verify");

  if (!AGE_VERIFICATION_ENABLED || user.ageVerified) {
    redirect("/ritual");
  }

  const locked = await isLocked(user.id);
  const latest = locked
    ? null
    : await prisma.ageVerification.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  const state: VerifyState = locked
    ? "locked"
    : latest?.status === "pending"
      ? "pending"
      : latest?.status === "failed"
        ? "failed"
        : latest?.status === "passed"
          ? "passed"
          : "initial";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8 text-center">THE THRESHOLD</h1>
      <p className="text-body mt-2 max-w-sm text-center italic">
        Before the door opens, one thing must be certain. The Circle is for those of twenty-one years and older. A
        trusted partner confirms your age. We receive only the answer — never your face, never your documents.
      </p>
      <AgeVerificationPanel initialState={state} />
    </main>
  );
}
