"use client";

import { useState } from "react";

// "Request a conversation" (item 1) — on a member's profile. Opens a
// short form with one required opening message; sending it makes the
// request, it does not open a thread (see /messages for accept/decline).
export default function RequestConversationButton({ recipientId }: { recipientId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setStatus("sending");
    setError(null);

    const res = await fetch("/api/dm/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, message: trimmed }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body?.error ?? "Could not send.");
      setStatus("error");
      return;
    }

    setRemaining(typeof body.remaining === "number" ? body.remaining : null);
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
        Request sent.
        {remaining !== null ? ` ${remaining} request${remaining === 1 ? "" : "s"} left today.` : ""}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost">
        Request a conversation
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <textarea
        className="input min-h-[6rem] w-full"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Say why you'd like to talk"
        maxLength={1000}
        autoFocus
      />
      {error ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex gap-3">
        <button type="submit" className="btn-primary" disabled={status === "sending" || !message.trim()}>
          {status === "sending" ? "…" : "Send"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={status === "sending"}>
          Cancel
        </button>
      </div>
    </form>
  );
}
