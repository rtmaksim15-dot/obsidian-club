import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Logo from "@/components/ui/Logo";
import ReconsentForm from "@/components/shared/ReconsentForm";

// One-time re-consent interstitial (Block 4, 2026-08-10) — reached only
// via app/(platform)/layout.tsx's redirect for a member whose
// LegalConsent predates the current document versions. Deliberately
// outside `(platform)`, so that layout's own check never wraps this
// page and can't loop.
export default async function LegalReconsentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/legal-reconsent");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8 text-center">Review and Accept the Terms</h1>
      <p className="text-body mt-2 max-w-sm text-center italic">
        Our legal documents have been updated. Please review and accept them to continue.
      </p>
      <ReconsentForm />
    </main>
  );
}
