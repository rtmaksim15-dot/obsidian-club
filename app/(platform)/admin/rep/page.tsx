import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import RepAdjustmentForm from "@/components/shared/RepAdjustmentForm";
import { REP_UI_ENABLED } from "@/lib/config/feature-flags";

// Admin REP adjustment (REP system + Vault task, Part A #3). Same
// not-discoverable pattern as /admin/applications: 404, not a redirect,
// for non-admins. v1 is feed-first — REP UI is deferred, so this 404s
// for everyone (admins included) while the flag is off, not just for
// non-admins.
export default async function AdminRepPage() {
  if (!REP_UI_ENABLED) {
    notFound();
  }

  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-md">
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-10">Adjust REP</h1>
        <RepAdjustmentForm />
      </div>
    </main>
  );
}
