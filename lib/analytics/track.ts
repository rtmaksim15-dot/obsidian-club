import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// SPEC-analytics-panel.md §2.3/§2.2. `import "server-only"` is the only
// guarantee this can't leak into a Client Component bundle — events are
// written by the server exclusively (§1: client-side events are
// forgeable, and a REP grant backed by a forged event devalues the
// whole system). `type` must be one of the `domain.action` values in
// §2.2 — do not invent new ones here; add to the taxonomy in the spec
// first.
type TrackInput = {
  userId?: string | null;
  type: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
};

export async function track(input: TrackInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: { ...input, meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  } catch (err) {
    console.error("[analytics] track failed", input.type, err);
    // Never throw — analytics must not break the user-facing flow it's
    // instrumenting.
  }
}
