import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import ApplicationsQueue from "@/components/shared/ApplicationsQueue";

// Admin panel v1 (BACKLOG.md v0.2) — approve/decline waitlist applications.
// Minimal by design: no styling polish beyond the base design tokens,
// since DESIGN.md doesn't specify an admin UI at all (member-facing only).
export default async function AdminApplicationsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/hall");
  }

  const applications = await prisma.waitlist.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-3xl">
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-10">Pending Applications</h1>
        <ApplicationsQueue
          initial={applications.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            age: a.age,
            city: a.city,
            source: a.source,
            referralCode: a.referralCode,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
