"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Item 6: "leave the conversation" — always available, silent, no
// explanation. The confirm dialog here is for the leaver's own benefit
// (a real, hard-to-undo exit — matches Decline/Revoke's own confirm
// pattern elsewhere in this app), not an explanation sent to the other
// participant; nothing is sent to them either way.
export default function LeaveThreadButton({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    if (!window.confirm("Leave this conversation? You won't be able to see it or reply anymore.")) return;
    setBusy(true);
    const res = await fetch(`/api/dm/threads/${threadId}/leave`, { method: "POST" });
    if (res.ok) {
      router.push("/messages");
    } else {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={leave} disabled={busy} className="text-caption" style={{ color: "var(--color-text-muted)" }}>
      Leave
    </button>
  );
}
