"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Item 4 — shown once, the first time a member opens /messages, or
// reached via /messages/rules?next=... from "Request a conversation" on
// a profile so accepting routes back there instead of into the inbox.
export default function DmRulesGate({ next }: { next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/dm/rules-acceptance", { method: "POST" });
    if (res.ok) {
      if (next) router.push(next);
      else router.refresh();
    } else {
      setError("Could not record your acceptance. Try again shortly.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-xl">
        <p className="text-label mb-2">Before You Message</p>
        <h1 className="text-h1 mb-8">A Few Rules</h1>

        <ul className="space-y-6">
          <li>
            <p className="text-data">No solicitation of paid services.</p>
            <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Direct messages aren&apos;t a channel for advertising or selling anything.
            </p>
          </li>
          <li>
            <p className="text-data">No sharing content outside the club.</p>
            <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
              What&apos;s said here stays here — the same trust the rest of the community runs on.
            </p>
          </li>
          <li>
            <p className="text-data">Reported messages are reviewed by the admin.</p>
            <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
              A report is the only way a message is ever read by anyone but the two of you.
            </p>
          </li>
        </ul>

        <p className="text-caption mt-8" style={{ color: "var(--color-text-muted)" }}>
          These sit alongside the Acceptable Use Policy you&apos;ve already agreed to — they don&apos;t replace it.
        </p>

        {error ? (
          <p className="text-caption mt-4" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        ) : null}

        <button type="button" className="btn-primary mt-8" disabled={busy} onClick={accept}>
          {busy ? "…" : "I agree"}
        </button>
      </div>
    </main>
  );
}
