import Logo from "@/components/ui/Logo";
import InvitationPanelForm from "@/components/shared/InvitationPanelForm";

// The invitation panel (`/invitation`) — Invitation Panel flow, A2
// (2026-08-2x, see DECISIONS.md). The single fixed public URL every
// physical card's QR points to; all cards are identical, none carries a
// unique token. A separate page from `/apply` on purpose: `/apply` is
// the pre-existing OAuth-callback status page (no form of its own, see
// its own file) and stays exactly as it was — this is new, additive
// surface, not a repurposing of it.
export default function InvitationPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-ob-black px-6 py-24 text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8 text-center">Request Consideration</h1>

      {/* Community description — copy pending, see A2. Clearly marked,
          not written here. */}
      <div
        className="mt-6 w-full max-w-sm rounded-ob border border-dashed p-4 text-center"
        style={{ borderColor: "var(--color-warning)" }}
      >
        <p className="text-caption" style={{ color: "var(--color-warning)" }}>
          PLACEHOLDER — copy pending
        </p>
        <p className="text-caption mt-2" style={{ color: "var(--color-text-muted)" }}>
          A short description of the community goes here before launch.
        </p>
      </div>

      <InvitationPanelForm />
    </main>
  );
}
