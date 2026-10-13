import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";
import { getBoundaries } from "@/lib/dm/boundaries";
import BoundariesForm from "@/components/shared/BoundariesForm";

// /boundaries (Package 4, Phase A, 2026-10-13, see DECISIONS.md) —
// behind BOUNDARIES_UI_ENABLED in MineMenu (lib/config/feature-flags.ts),
// which only renders its link for a fullAccess member to begin with;
// gated the same way as every other protected member page (ritual
// complete or admin, then doors/antechamber).
export default async function BoundariesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/boundaries");

  if (!user.isAdmin) {
    if (!(await isRitualComplete(user))) redirect("/ritual");
  }
  if (!bypassesDoors(user) && getDoorsState().active) redirect("/antechamber");

  const boundaries = await getBoundaries(user.id);

  return (
    <main className="min-h-screen bg-ob-black px-6 pb-16 pt-4 text-ob-text">
      <div className="mx-auto max-w-lg">
        <p className="text-label mb-2">My Boundaries</p>
        <h1 className="text-h1 mb-4">MY BOUNDARIES</h1>
        <p className="text-body mb-10" style={{ color: "var(--color-text-secondary)" }}>
          Here you decide who may approach you. Boundaries are not walls — they are the shape of trust.
        </p>
        <BoundariesForm initial={boundaries} />
      </div>
    </main>
  );
}
