import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";
import { grantAchievement } from "@/lib/utils/achievements";

const STATUS_LABEL: Record<string, string> = {
  done: "Done",
  deferred: "Pending",
  todo: "To do",
};

/**
 * The Initiation Ritual (PRODUCT.md §1 Stage 2). Only step 1 is a real,
 * checkable action right now — steps 2/3/5 need policy content Max
 * hasn't written yet, and step 4 needs Rooms (v0.4). See ADR-0013.
 */
export default async function RitualPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/ritual");

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const status = getRitualStatus(user, profile);

  if (status.complete) {
    await grantAchievement(user.id, "initiation-complete");
    redirect("/hall");
  }

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-xl">
        <p className="text-label mb-2">Initiation</p>
        <h1 className="text-h1 mb-4">Before you enter the Hall</h1>
        <p className="text-body mb-10">
          A short rite stands between approval and access.
        </p>

        <ol className="space-y-3">
          {status.steps.map((step) => (
            <li key={step.id} className="card flex items-start justify-between gap-4">
              <div>
                <p className="text-h2 !text-base">{step.label}</p>
                {step.note ? (
                  <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    {step.note}
                  </p>
                ) : null}
              </div>
              <span
                className="text-label shrink-0"
                style={{
                  color:
                    step.status === "done"
                      ? "var(--color-success)"
                      : step.status === "deferred"
                        ? "var(--color-text-muted)"
                        : "var(--color-accent)",
                }}
              >
                {STATUS_LABEL[step.status]}
              </span>
            </li>
          ))}
        </ol>

        {status.steps.some((s) => s.id === "profile" && s.status === "todo") ? (
          <a href={`/profile/${user.id}/edit`} className="btn-primary mt-10 inline-block">
            Complete your profile
          </a>
        ) : null}
      </div>
    </main>
  );
}
