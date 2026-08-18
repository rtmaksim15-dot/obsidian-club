import Logo from "@/components/ui/Logo";
import ShortCodeEntryForm from "@/components/shared/ShortCodeEntryForm";

// /join — manual short-code entry (batch generator v2, 2026-08-14), for
// a member who has a printed OBS-XXXX-XXXX code but can't scan the
// card's QR. Distinct from /join/[token], the actual redemption
// landing this hands off to once the code resolves.
export default function JoinIndexPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8">Welcome to the Circle</h1>
      <p className="text-body mt-2 max-w-sm text-center italic">
        Enter the invitation code from your card.
      </p>
      <ShortCodeEntryForm />
    </main>
  );
}
