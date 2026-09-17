import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Logo from "@/components/ui/Logo";
import MfaChallengeForm from "@/components/shared/MfaChallengeForm";

// /login/mfa — item 2, 2026-09-17. The shared step-up screen both
// sign-in paths land on when a factor is enrolled and the session isn't
// aal2 yet. Requires an existing aal1 session (you get here only after
// the password check or the OAuth callback already succeeded) — not a
// login form of its own.
export default async function LoginMfaPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rawNext = searchParams.next;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/feed";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8">Verify</h1>
      <p className="text-body mt-2 text-center italic">One more step.</p>
      <Suspense fallback={null}>
        <MfaChallengeForm next={next} />
      </Suspense>
    </main>
  );
}
