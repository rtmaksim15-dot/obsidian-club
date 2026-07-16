import { redirect } from "next/navigation";
import { Lock, Gem } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * The Vault (`/vault`) — real access mechanic, replacing the
 * `/shop` placeholder (Max, 2026-07-09). Per CLAUDE.md: access opens
 * through reputation (REP), not a direct purchase. Locked items are
 * shown, not hidden — same "visible but marked" pattern as Rooms —
 * so members can see what more REP unlocks. No catalog is invented:
 * real items get created via `POST /api/admin/vault-items` (ADR-0016);
 * the three seeded here (2026-07-16, REP system + Vault task) are
 * explicitly named test items for exercising the REP-gating logic, not
 * real catalog content.
 *
 * Ecosystem Rule check (CLAUDE.md): strengthens **profile** (REP finally
 * has somewhere to be *spent*, not just displayed), **houses** (joining
 * + posting in a house is a real REP source feeding this gate), and
 * **admin** (item management via the API above) — three systems, not
 * just a standalone page.
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
      <div className="mx-auto max-w-3xl">
        <p className="text-label mb-2">Access</p>
        <h1 className="text-h1 mb-2">The Vault</h1>
        <p className="text-body mb-10 italic">
          Earned through reputation, not purchased outright.
        </p>

        {items.length === 0 ? (
          <p className="text-body">Nothing in the Vault yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const locked = user.rep < item.minRep;
              return (
                <div key={item.id} className={`card flex flex-col ${locked ? "opacity-60" : ""}`}>
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-ob bg-ob-surface">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <Gem size={32} strokeWidth={1.25} style={{ color: "var(--color-text-muted)" }} />
                    )}
                    {locked ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-ob-black/50">
                        <Lock size={22} strokeWidth={1.5} style={{ color: "var(--color-text-primary)" }} />
                      </div>
                    ) : null}
                  </div>

                  <p className="text-h2 mt-4 !text-base">{item.name}</p>
                  {item.description ? <p className="text-caption mt-1">{item.description}</p> : null}

                  <div className="mt-auto pt-4">
                    {locked ? (
                      <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                        Unlocks at {item.minRep} REP — you have {user.rep}
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary w-full cursor-not-allowed opacity-60"
                        disabled
                        title="Redemption isn't set up yet"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
