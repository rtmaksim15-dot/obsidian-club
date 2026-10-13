// Clean Hall, B6 (Package 5, Phase B, 2026-10-14, see DECISIONS.md).
// Pure — no "server-only", no Prisma.

/** Whether a test account (or something it authored) should be hidden from this viewer. */
export function shouldHideTestAccount(targetIsTest: boolean, viewerIsAdmin: boolean): boolean {
  return targetIsTest && !viewerIsAdmin;
}
