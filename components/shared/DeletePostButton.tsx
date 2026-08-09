"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Immediate, self-service post deletion — by the button, not through
// support, no one else's approval needed (member protection mechanics,
// pre-launch legal package, 2026-08-09). Reuses the existing author-or-
// admin DELETE /api/posts/:id route, previously unwired to any UI.
export default function DeletePostButton({ postId, redirectTo }: { postId: string; redirectTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Delete this post?\n\nThis can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="text-caption"
      style={{ color: "var(--color-text-muted)" }}
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
