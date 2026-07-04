"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/auth/supabase-browser";

type Message = {
  id: string;
  content: string;
  replyToId: string | null;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl: string | null; level: number };
};

type Props = {
  room: { id: string; slug: string; name: string; description: string | null };
  currentUserId: string;
  initialMessages: Message[];
};

/**
 * Room chat — message history (bottom-up) + composer + live updates via
 * Supabase Realtime. On a new INSERT, re-fetches the message list rather
 * than merging the raw Realtime payload (which doesn't include joined
 * sender info) — simplest correct approach at this scale; see
 * TECH_DEBT.md for the optimization opportunity.
 */
export default function RoomChat({ room, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
        async () => {
          const res = await fetch(`/api/rooms/${room.slug}/messages`);
          if (res.ok) {
            const body = await res.json();
            setMessages(body.messages);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, room.slug]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    setError(null);

    const res = await fetch(`/api/rooms/${room.slug}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Could not send.");
      setSending(false);
      return;
    }

    const { message } = await res.json();
    setMessages((prev) => [...prev, message]);
    setDraft("");
    setSending(false);
  }

  return (
    <main className="flex min-h-screen flex-col bg-ob-black text-ob-text">
      <header className="border-b border-ob-border px-6 py-6">
        <p className="text-h1 !text-xl">{room.name}</p>
        {room.description ? <p className="text-caption mt-1">{room.description}</p> : null}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
            No messages yet. Be the first.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <div className={`avatar avatar-level-${m.user.level} h-9 w-9 shrink-0`}>
                {m.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.user.avatarUrl} alt={m.user.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
                    {m.user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-data">
                  {m.user.displayName}
                  {m.user.id === currentUserId ? (
                    <span className="text-caption ml-2" style={{ color: "var(--color-text-muted)" }}>
                      you
                    </span>
                  ) : null}
                </p>
                <p className="text-body mt-0.5 !text-base">{m.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-ob-border px-6 py-4">
        {error ? (
          <p className="text-caption mb-2" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        ) : null}
        <div className="flex gap-3">
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Say something"
            maxLength={2000}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={sending || !draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
