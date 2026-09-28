"use client";

import { useEffect, useState } from "react";

// Invite/Copy for an active (not yet redeemed) invite or partner link
// (/hall "My Invitation", 2026-08-08). The raw URL used to be printed
// on the page (2026-09-27: removed — it read as a technical dump, not
// an invitation into a private club); "Invite" and "Copy" are now the
// only ways to get at the link at all, so both must actually work.
// `canShare` starts false and flips in an effect rather than being
// computed inline — `navigator` doesn't exist during SSR, so computing
// it during the first render would make the client's first render
// disagree with the server-rendered HTML (a hydration mismatch); the
// effect runs after hydration, so the button's behavior settles a tick
// later instead.
export default function CopyShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied/unavailable — the explicit Copy
      // button next to this one is the only other way to reach it, and
      // it will fail the same way for the same reason.
    }
  }

  // "Invite" opens the OS share sheet when one exists; when it doesn't
  // (most desktop browsers), it copies instead — the button should
  // still do *something* useful. It deliberately does NOT fall back to
  // copying if a real share sheet was shown and the person cancelled
  // it or it failed — that's a declined share, not a missing feature,
  // and copying behind their back after a cancel would be surprising.
  async function handleInvite() {
    if (canShare) {
      try {
        await navigator.share({ url });
      } catch {
        // Cancelled or failed — no fallback, no error UI needed.
      }
      return;
    }
    await copy();
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={handleInvite} className="btn-primary !text-sm">
        Invite
      </button>
      <button type="button" onClick={copy} className="btn-ghost !text-xs !px-0">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
