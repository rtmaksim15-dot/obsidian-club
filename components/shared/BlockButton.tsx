"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { userId: string; initialBlocked: boolean };

// Mutual block toggle — one-sided initiation, no explanation required
// (member protection mechanics, pre-launch legal package, 2026-08-09).
// Same optimistic-toggle shape as FollowButton.
export default function BlockButton({ userId, initialBlocked }: Props) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    if (!blocked && !window.confirm("Block this member?\n\nNeither of you will see each other's content.")) {
      return;
    }
    setBusy(true);
    const optimistic = !blocked;
    setBlocked(optimistic);

    const res = await fetch(`/api/users/${userId}/block`, { method: "POST" });
    if (!res.ok) {
      setBlocked(!optimistic);
    } else {
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} className="text-caption" style={{ color: "var(--color-text-muted)" }}>
      {blocked ? "Unblock" : "Block"}
    </button>
  );
}
