"use client";

import { useEffect, useState } from "react";

// Invite/Copy for an active (not yet redeemed) invite or partner link
// (/hall "My Invitation", 2026-08-08). The raw URL used to be printed
// on the page (2026-09-27: removed — it read as a technical dump, not
// an invitation into a private club); these buttons are now the only
// ways to get at the link at all, so they must actually work — and be
// unambiguous about what each one does (2026-09-29, see DECISIONS.md):
// on desktop, where there's no OS share sheet, "Invite" (primary, red)
// next to "Copy" (barely-visible ghost text) did the exact same thing
// under two different-looking controls, and clicking the one labeled
// "Invite" gave no feedback at all — only the *other* button's label
// silently flipped to "Copied". Now: one real button when there's only
// one real action (desktop copies), two same-weight buttons when there
// are genuinely two (mobile can also open the share sheet) — and
// whichever button was actually clicked is the one that confirms it.
//
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
      // Clipboard permission denied/unavailable — on a canShare device
      // the Share button next to this one is the only other way to
      // reach it; on desktop, where this is the only button, there's
      // nothing left to fall back to either way.
    }
  }

  // Deliberately does NOT fall back to copying if the share sheet was
  // shown and the person cancelled it or it failed — that's a declined
  // share, not a missing feature, and copying behind their back after a
  // cancel would be surprising.
  async function share() {
    try {
      await navigator.share({ url });
    } catch {
      // Cancelled or failed — no fallback, no error UI needed.
    }
  }

  // No system share sheet to offer (most desktop browsers) — copying is
  // the only real action, so there's only one button.
  if (!canShare) {
    return (
      <button type="button" onClick={copy} className="btn-primary !text-sm">
        {copied ? "Copied" : "Copy invitation link"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={share} className="btn-primary !text-sm">
        Share invitation
      </button>
      <button type="button" onClick={copy} className="btn-secondary !text-sm">
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
