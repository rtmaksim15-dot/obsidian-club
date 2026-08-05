import Logo from "@/components/ui/Logo";

// August hardening pass (ROADMAP v3.1), Block 3 (2026-08-04): Next.js's
// own 404 fallback is generic and off-brand — this replaces it for
// every route in the app (App Router picks up a root-level
// not-found.tsx automatically, no per-segment wiring needed).
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 py-24 text-center text-ob-text">
      <Logo size={100} variant="dark" />
      <h1 className="text-h1 mt-8">Nothing Here</h1>
      <p className="text-body mt-4 max-w-sm">
        This door doesn&rsquo;t lead anywhere. Whatever you were looking for isn&rsquo;t at this address.
      </p>
      <a href="/" className="btn-ghost mt-10 inline-block">
        Return home
      </a>
    </main>
  );
}
