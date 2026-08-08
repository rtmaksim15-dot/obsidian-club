"use client";

import { useEffect, useState } from "react";

// Full-URL display + Copy/Share for an active (not yet redeemed) invite
// or partner link (/hall "My Invitation", 2026-08-08). `canShare` starts
// false and flips in an effect rather than being computed inline —
// `navigator` doesn't exist during SSR, so computing it during the first
// render would make the client's first render disagree with the
// server-rendered HTML (a hydration mismatch); the effect runs after
// hydration, so the button appears a tick later instead.
export default function CopyShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied/unavailable — the URL text below is
      // still there to select and copy by hand.
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ url });
    } catch {
      // User cancelled the share sheet, or the share failed — no error
      // UI needed either way.
    }
  }

  return (
    <div>
      <p className="text-caption break-all" style={{ color: "var(--color-text-secondary)" }}>
        {url}
      </p>
      <div className="flex gap-3 mt-2">
        <button type="button" onClick={handleCopy} className="btn-ghost !text-xs !px-0">
          {copied ? "Copied" : "Copy"}
        </button>
        {canShare ? (
          <button type="button" onClick={handleShare} className="btn-ghost !text-xs !px-0">
            Share
          </button>
        ) : null}
      </div>
    </div>
  );
}
