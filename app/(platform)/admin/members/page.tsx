import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import MembersAgeVerification from "@/components/shared/MembersAgeVerification";

// Admin member view (2026-08-03) — minimal by design, same as
// /admin/applications and /admin/rep: no styling polish beyond base
// design tokens, notFound() (not redirect) so it's not discoverable by a
// logged-in non-admin. Built specifically to host the Age Verification
// toggle (DECISIONS.md) for members who already have an account; the
// approval-time checkbox in ApplicationsQueue.tsx covers the other case
// (before the account exists).
export default async function AdminMembersPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const members = await prisma.user.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-3xl">
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-10">Members</h1>
        <MembersAgeVerification
          initial={members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            username: m.username,
            email: m.email,
            age: m.age,
            ageVerified: m.ageVerified,
          }))}
        />
      </div>
    </main>
  );
}
