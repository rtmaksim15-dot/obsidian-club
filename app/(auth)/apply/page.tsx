import Logo from "@/components/ui/Logo";

// /apply — real destination for a first-time OAuth sign-in with no
// matching member account (see app/auth/callback/route.ts). The club is
// closed: a Google session alone doesn't grant access, so this lands
// here with a real Waitlist row already created, not a dead end.
// PRODUCT.md §1: declines carry no explanation — that same opacity
// applies here, so this doesn't promise a timeline either.
export default function ApplyPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const pending = searchParams.status === "pending";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-center text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8">{pending ? "Application Received" : "Request Access"}</h1>
      <p className="text-body mt-4 max-w-sm">
        {pending
          ? "Obsidian Club is closed. Your application has been recorded and is reviewed personally — there's no set timeline, and no explanation either way."
          : "Membership here isn't registered for — it's granted. Apply from the landing page, or wait for a personal invitation from an existing member."}
      </p>
      <a href="/" className="btn-ghost mt-10 inline-block">
        Return home
      </a>
    </main>
  );
}
