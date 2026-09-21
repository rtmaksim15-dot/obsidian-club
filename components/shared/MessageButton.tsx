"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type State =
  | { type: "start"; needsDmRules: boolean }
  | { type: "outgoing_pending" }
  | { type: "incoming_pending"; requestId: string }
  | { type: "thread"; threadId: string };

/**
 * Profile "Message" button (item 2, 2026-09-20, see DECISIONS.md) —
 * state computed server-side (lib/dm/relationship.ts#getMessageButtonState)
 * and handed down as `initialState`; the caller (profile page) doesn't
 * render this at all for "hidden" (blocked, or the two-strike door
 * closed), so every state this component handles is one where SOME
 * button belongs on the page. Folds the old RequestConversationButton's
 * "start a request" form into the same component instead of a separate
 * one, since exactly one of these five shapes is ever live at a time.
 */
export default function MessageButton({
  initialState,
  recipientId,
  returnTo,
}: {
  initialState: State;
  recipientId: string;
  returnTo: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  async function sendRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    const res = await fetch("/api/dm/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, message: trimmed }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(body?.error ?? "Could not send.");
      return;
    }
    setSentNotice(
      typeof body.remaining === "number"
        ? `Request sent. ${body.remaining} request${body.remaining === 1 ? "" : "s"} left today.`
        : "Request sent.",
    );
    setState({ type: "outgoing_pending" });
  }

  async function respond(action: "accept" | "decline") {
    if (state.type !== "incoming_pending") return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/dm/requests/${state.requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(body?.error ?? "Could not respond.");
      return;
    }
    if (action === "accept" && body.threadId) {
      router.push(`/messages/${body.threadId}`);
    } else {
      router.refresh();
    }
  }

  if (state.type === "thread") {
    return (
      <a href={`/messages/${state.threadId}`} className="btn-primary inline-block">
        Message
      </a>
    );
  }

  if (state.type === "incoming_pending") {
    return (
      <div>
        <p className="text-caption mb-2" style={{ color: "var(--color-text-secondary)" }}>
          This member wants to talk.
        </p>
        {error ? (
          <p className="text-caption mb-2" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        ) : null}
        <div className="flex gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={() => respond("accept")}>
            Accept
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => respond("decline")}>
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (state.type === "outgoing_pending") {
    return (
      <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
        {sentNotice ?? "Request sent."}
      </p>
    );
  }

  // state.type === "start"
  if (state.needsDmRules) {
    return (
      <a href={`/messages/rules?next=${encodeURIComponent(returnTo)}`} className="btn-primary inline-block">
        Message
      </a>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        Message
      </button>
    );
  }

  return (
    <form onSubmit={sendRequest} className="w-full">
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
        <button type="submit" className="btn-primary" disabled={busy || !message.trim()}>
          {busy ? "…" : "Send"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
