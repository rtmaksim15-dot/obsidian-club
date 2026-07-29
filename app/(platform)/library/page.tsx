import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Library (`/library`) — v1 is feed-first; Library isn't in the
 * "building now" list (OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md
 * §III/§IV). Route and nav tab stay; real content replaced with a
 * minimal teaser, same shape as /vault's while REP_UI_ENABLED is off.
 *
 * Unlike Vault/Houses, the real article/lecture/course/manifesto
 * browsing + composer this page used to have (built 2026-07-05/16) was
 * deleted outright rather than left gated behind `LIBRARY_UI_ENABLED` —
 * it shared `ContentComposer` with /feed, which was simplified to a
 * single always-"post" composer for v1's Threads-level-simplicity pass
 * (2026-07-29) and no longer supports a type selector or title field at
 * all. Rebuilding Library for real needs its own composer built for
 * what it actually needs — see TECH_DEBT.md.
 */
export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/library");

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Community</p>
        <h1 className="text-h1 mb-2">The Library</h1>
        <p className="text-body italic">The shelves are being filled.</p>
      </div>
    </main>
  );
}
