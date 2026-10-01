"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import ReportModal from "./ReportModal";
import ConfirmDialog from "./ConfirmDialog";

type Props = {
  targetType: "post" | "profile" | "comment" | "message" | "direct_message";
  targetId: string;
  preview: string;
  canReport: boolean;
  // Post-only: the caller (PostCard) is a Server Component, so this
  // can't take an onClick — the delete call lives here instead, same
  // as DeletePostButton (now retired in favor of this single overflow
  // menu, item 4/6, 2026-09-20, see DECISIONS.md).
  deletePostId?: string;
  deleteRedirectTo?: string;
  // Instant-removal escape hatch (2026-09-29, see DECISIONS.md) — a
  // caller that keeps its own client-side list (FeedList's
  // `useState(initialPosts)`) passes this to splice the post out the
  // moment the DELETE actually succeeds, instead of relying on
  // `router.refresh()` alone: refresh() re-renders the server tree with
  // fresh props, but a child's `useState(initialProp)` only reads that
  // initializer on first mount, so the new prop value is silently
  // ignored and the deleted post stays on screen until a hard reload.
  // Callers with no such local list (e.g. /hall's PostList, a plain
  // function component with no state of its own) don't pass this —
  // `router.refresh()` is already correct there, since there's no
  // client array to go stale in the first place.
  onDeleted?: () => void;
  // Profile-only: same reasoning — BlockButton's toggle logic, folded
  // in here instead of a second inline control (item 2).
  blockUserId?: string;
  blockInitialBlocked?: boolean;
};

/**
 * The one discreet "···" control every reportable surface uses (item 6,
 * 2026-09-20, see DECISIONS.md) — a post, comment, room message, DM, or
 * profile. Its menu is just "Report" everywhere except a profile (and
 * the DM thread header, which reports/blocks the same "profile" target),
 * where Block/Unblock joins it (item 2). Renders nothing if none of
 * canReport/deletePostId/blockUserId apply.
 */
export default function ContentMenu({
  targetType,
  targetId,
  preview,
  canReport,
  deletePostId,
  deleteRedirectTo,
  onDeleted,
  blockUserId,
  blockInitialBlocked,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirming, setConfirming] = useState<"delete" | "block" | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(blockInitialBlocked ?? false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleDelete() {
    if (!deletePostId || busy) return;
    setOpen(false);
    setConfirming("delete");
  }

  async function performDelete() {
    if (!deletePostId) return;
    setBusy(true);
    setConfirming(null);
    const res = await fetch(`/api/posts/${deletePostId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return;
    if (deleteRedirectTo) router.push(deleteRedirectTo);
    else if (onDeleted) onDeleted();
    else router.refresh();
  }

  async function performBlock() {
    if (!blockUserId) return;
    setBusy(true);
    setConfirming(null);
    const optimistic = !blocked;
    setBlocked(optimistic);
    const res = await fetch(`/api/users/${blockUserId}/block`, { method: "POST" });
    if (!res.ok) {
      setBlocked(!optimistic);
    } else {
      router.refresh();
    }
    setBusy(false);
  }

  function handleBlockToggle() {
    if (!blockUserId || busy) return;
    setOpen(false);
    // Unblocking is the reverse, non-destructive direction — only the
    // actual block needs a confirmation, same as the window.confirm()
    // this replaced only ever gated that one direction.
    if (blocked) {
      performBlock();
      return;
    }
    setConfirming("block");
  }

  if (!canReport && !deletePostId && !blockUserId) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-6 items-center justify-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        <MoreHorizontal size={16} strokeWidth={1.5} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-ob border bg-ob-dark py-1"
          style={{ borderColor: "var(--color-border)" }}
        >
          {blockUserId ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleBlockToggle}
              disabled={busy}
              className="block w-full px-3 py-2 text-left text-caption"
              style={{ color: blocked ? "var(--color-text-secondary)" : "var(--color-btn-border)" }}
            >
              {blocked ? "Unblock" : "Block"}
            </button>
          ) : null}
          {deletePostId ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleDelete}
              disabled={busy}
              className="block w-full px-3 py-2 text-left text-caption"
              style={{ color: "var(--color-btn-border)" }}
            >
              Delete
            </button>
          ) : null}
          {canReport ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setReporting(true);
              }}
              className="block w-full px-3 py-2 text-left text-caption"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Report
            </button>
          ) : null}
        </div>
      ) : null}

      {reporting ? (
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          preview={preview}
          onClose={() => setReporting(false)}
        />
      ) : null}
      {confirming === "delete" ? (
        <ConfirmDialog
          title="Delete this post? This can't be undone."
          confirmLabel="Delete"
          busy={busy}
          onConfirm={performDelete}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
      {confirming === "block" ? (
        <ConfirmDialog
          title="Block this member? Neither of you will see each other's content."
          confirmLabel="Block"
          busy={busy}
          onConfirm={performBlock}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </div>
  );
}
