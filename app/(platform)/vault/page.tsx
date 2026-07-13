import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * The Vault (`/vault`) — real access mechanic, replacing the
 * `/shop` placeholder (Max, 2026-07-09). Per CLAUDE.md: access opens
 * through reputation (REP), not a direct purchase. Locked items are
 * shown, not hidden — same "visible but marked" pattern as Rooms —
 * so members can see what more REP unlocks. No catalog is invented:
 * items only appear once Max creates them via `POST
 * /api/admin/vault-items` (see ADR-0016), so this is honestly empty
 * today.
 */
export default async function VaultPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/vault");

  const items = await prisma.vaultItem.findMany({
    where: { isActive: true },
    orderBy: { minRep: "asc" },
  });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Access</p>
        <h1 className="text-h1 mb-2">The Vault</h1>
        <p className="text-body mb-10 italic">
          Earned through reputation, not purchased outright.
        </p>

        {items.length === 0 ? (
          <p className="text-body">Nothing in the Vault yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const locked = user.rep < item.minRep;
              return (
                <li key={item.id} className={`card ${locked ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-h2 !text-base">{item.name}</p>
                    {locked ? (
                      <Lock size={16} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
                    ) : null}
                  </div>
                  {item.description ? <p className="text-caption mt-1">{item.description}</p> : null}
                  <p className="text-caption mt-2" style={{ color: "var(--color-text-muted)" }}>
                    {locked ? `Requires ${item.minRep} REP (you have ${user.rep})` : "Unlocked"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
