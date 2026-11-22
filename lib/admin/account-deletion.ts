// Admin "Delete account" (2026-11-22, see DECISIONS.md) — pure pieces
// shared by the DELETE route and its confirm dialog.
/**
 * ModerationAction.adminId is nullable specifically so a system-
 * initiated action can omit it (see that column's own schema
 * comment) — reused here: deleting the admin who took a past action
 * nulls adminId (never deletes the action itself; that would erase
 * real moderation history for whoever it was taken against) and
 * swaps actorLabel to this, so the row still says who/what it was.
 */
export function deletedAdminActorLabel(displayName: string): string {
  return `deleted-admin:${displayName}`;
}
