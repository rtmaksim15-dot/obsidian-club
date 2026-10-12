// Extracted from components/shared/MineMenu.tsx's inline ternary
// (Package 2 reconcile, 2026-10-11, see DECISIONS.md) so the
// pluralization rule (0 / 1 / N) is unit-testable as pure logic — no
// behavior change, same three strings, same thresholds.
export function formatInvitationCount(inviteAllowance: number): string {
  if (inviteAllowance <= 0) return "No invitations remain.";
  return `You hold ${inviteAllowance} ${inviteAllowance === 1 ? "invitation" : "invitations"}.`;
}
