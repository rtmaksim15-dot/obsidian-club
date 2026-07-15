import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import IntroductionContent from "@/components/shared/IntroductionContent";

// Lord Obsidian's Introduction (Initiation Ritual step 3). Copy is final,
// supplied by Max 2026-07-15 — do not paraphrase.
export default async function IntroductionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/ritual/introduction");

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const progress = (profile?.ritualProgress ?? {}) as Record<string, unknown>;
  const alreadyCompleted = progress.introMaterial === true;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-xl">
        <p className="text-label mb-2">The Founder</p>
        <h1 className="text-h1 mb-10">Lord Obsidian&rsquo;s Introduction</h1>
        <IntroductionContent alreadyCompleted={alreadyCompleted} />
      </div>
    </main>
  );
}
