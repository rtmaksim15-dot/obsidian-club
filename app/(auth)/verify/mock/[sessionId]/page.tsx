import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import MockVerificationPanel from "@/components/shared/MockVerificationPanel";

// Local stand-in for Yoti's hosted page (A3's mock provider) — only
// reachable when AGE_VERIFICATION_PROVIDER isn't "yoti", enforced both
// here and (defensively, again) in the route this page's buttons call.
export default async function VerifyMockPage({ params }: { params: { sessionId: string } }) {
  if (process.env.AGE_VERIFICATION_PROVIDER === "yoti") {
    redirect("/verify");
  }

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/verify/mock/${params.sessionId}`);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-ob-text">
      <h1 className="text-h1 text-center">Mock Verification</h1>
      <p className="text-body mt-2 max-w-sm text-center italic">
        Local stand-in for Yoti&#x2019;s hosted flow — never shown outside development.
      </p>
      <MockVerificationPanel sessionId={params.sessionId} />
    </main>
  );
}
