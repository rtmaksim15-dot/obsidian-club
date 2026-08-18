import { prisma } from "@/lib/db/prisma";
import Logo from "@/components/ui/Logo";
import JoinRegistrationForm from "@/components/shared/JoinRegistrationForm";
import { computeClientExpiresAt, evaluateTokenLifecycle, lifecycleMessage } from "@/lib/invites/lifecycle";

// Join (`/join/[token]`) — redemption landing for purchase-card,
// member-invite, and partner tokens (Invitation & Partner system v1,
// OBSIDIAN_ROADMAP_v3.1, 2026-08-01). Separate from `/invite/[token]`
// (the original admin-reviewed Waitlist-application flow, untouched):
// there's no prior application here, and no name/email known ahead of
// time — the visitor provides both, straight into registration.
//
// Lifecycle v2 (2026-08-14): the FIRST real GET of a print-batch token
// "arms" its 7-day client window (`firstScannedAt`/`clientExpiresAt`,
// see lib/invites/lifecycle.ts). This can also fire on a link-preview
// prefetch or a bot crawl rather than a genuine visitor — accepted per
// spec rather than gated behind an extra interaction, but logged so a
// pattern of premature arming is visible if it ever becomes a problem.
export default async function JoinPage({ params }: { params: { token: string } }) {
  let invite = await prisma.inviteToken.findUnique({ where: { token: params.token } });

  let message: string | null = null;
  if (!invite) {
    message = "This invite link isn't valid.";
  } else {
    const lifecycle = evaluateTokenLifecycle(invite);
    if (!lifecycle.ok) {
      message = lifecycleMessage(lifecycle.reason);
    } else if (!invite.firstScannedAt) {
      const now = new Date();
      const clientExpiresAt = computeClientExpiresAt(now, invite.clientWindowDays, invite.validUntil);
      console.log(`[join] Arming token ${invite.id} on first scan (source: ${invite.source}).`);
      invite = await prisma.inviteToken.update({
        where: { id: invite.id },
        data: { firstScannedAt: now, clientExpiresAt, status: "opened" },
      });
    }
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
            Complete your details to enter.
          </p>
          <JoinRegistrationForm token={params.token} />
        </>
      )}
    </main>
  );
}
