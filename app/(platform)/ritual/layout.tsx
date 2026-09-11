import SignOutButton from "@/components/shared/SignOutButton";

// Every /ritual* page (2026-09-10, production incident) — a member
// whose ritual is incomplete can reach nothing else in the app (every
// other gated page bounces back here), BottomNav is mobile-only
// (`sm:hidden`) and doesn't even link anywhere reachable while
// incomplete, and desktop has no nav chrome at all outside what a page
// renders itself. None of the four /ritual pages rendered a sign-out
// control, so there was no way out of the platform at all until the
// ritual finished -- the same gap /antechamber's own comment already
// flagged and fixed for itself, just never carried over here. Fixed
// position, not inline in each page, so it's always reachable
// regardless of scroll position or which step's content is showing.
export default function RitualLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed right-4 top-4 z-20">
        <SignOutButton />
      </div>
      {children}
    </>
  );
}
