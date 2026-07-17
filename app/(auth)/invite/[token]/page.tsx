import { prisma } from "@/lib/db/prisma";
import Logo from "@/components/ui/Logo";
import InviteRegistrationForm from "@/components/shared/InviteRegistrationForm";

// Invite registration (`/invite/[token]`) — Closed Registration & Invite
// System, 2026-07-17. The only way an account gets created; see
// app/api/invite/[token]/route.ts and app/register/route.ts (which
// blocks any other path).
export default async function InvitePage({ params }: { params: { token: string } }) {
  const application = await prisma.waitlist.findUnique({ where: { inviteToken: params.token } });

  let message: string | null = null;
  if (!application) {
    message = "This invite link isn't valid.";
  } else if (application.inviteTokenUsedAt) {
    message = "This invite has already been used.";
  } else if (application.status !== "approved") {
    message = "This invite is no longer valid.";
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8">Welcome to the Circle</h1>

      {message ? (
        <p className="text-body mt-6 max-w-sm text-center">{message}</p>
      ) : (
        <>
          <p className="text-body mt-2 max-w-sm text-center italic">
            Set a password to complete your access.
          </p>
          <InviteRegistrationForm
            token={params.token}
            defaultName={application!.name ?? ""}
            email={application!.email}
          />
        </>
      )}
    </main>
  );
}
