"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/auth/supabase-browser";
import ContentMenu from "./ContentMenu";

type Message = {
  id: string;
  content: string;
  isDeleted?: boolean;
  createdAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
};

type Props = {
  threadId: string;
  currentUserId: string;
  initialMessages: Message[];
};

/**
 * Direct-message thread — message history + composer + live updates via
 * Supabase Realtime, same shape as RoomChat.tsx (2026-09-14). On a
 * postgres_changes ping, re-fetches via GET /api/dm/threads/:id/messages
 * rather than trusting the raw payload (no joined sender info in it) —
 * same reasoning as Room chat.
 *
 * The direct_messages RLS policy this subscription relies on is
 * `auth.uid() = participant_a_id or auth.uid() = participant_b_id` (see
 * DECISIONS.md, 2026-09-14) — narrower than Room chat's `auth.uid() is
 * not null` on purpose, since this table is 1:1-private, not shared
 * community content. It does not check whether this participant later
 * left the thread; the real, current check (participant, not left)
 * happens server-side in the GET route this component calls on every
 * ping, same division of labor as Room chat's canAccessRoom().
 */
export default function DmThreadChat({ threadId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Desktop thread layout (2026-09-22, see DECISIONS.md): starts true so
  // opening the thread always lands on the latest message. Updated on
  // every scroll of the message list (not state — this only needs to be
  // read inside the messages-length effect below, so a ref avoids an
  // extra render per scroll event) and checked there instead of always
  // auto-scrolling on a new message, so a member reading back through
  // history doesn't get yanked back to the bottom by an incoming message.
  const pinnedToBottomRef = useRef(true);

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distanceFromBottom < 80;
  }

  useEffect(() => {
    if (pinnedToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function refetchMessages() {
      const res = await fetch(`/api/dm/threads/${threadId}/messages`);
      if (res.ok) {
        const body = await res.json();
        setMessages(body.messages);
      }
    }

    supabase.auth.getSession().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`dm-thread:${threadId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages", filter: `thread_id=eq.${threadId}` },
          refetchMessages,
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "direct_messages", filter: `thread_id=eq.${threadId}` },
          refetchMessages,
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [threadId]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    setError(null);

    const res = await fetch(`/api/dm/threads/${threadId}/messages`, {
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ob-black text-ob-text">
      <div ref={listRef} onScroll={handleListScroll} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
            No messages yet.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <a href={`/profile/${m.sender.username}`} className="avatar h-9 w-9 shrink-0">
                {m.sender.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.sender.avatarUrl}
                    alt={m.sender.displayName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
                    {m.sender.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </a>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <a href={`/profile/${m.sender.username}`} className="text-data">
                    {m.sender.displayName}
                    {m.sender.id === currentUserId ? (
                      <span className="text-caption ml-2" style={{ color: "var(--color-text-muted)" }}>
                        you
                      </span>
                    ) : null}
                  </a>
                  {!m.isDeleted && m.sender.id !== currentUserId ? (
                    <ContentMenu targetType="direct_message" targetId={m.id} preview={m.content} canReport />
                  ) : null}
                </div>
                {m.isDeleted ? (
                  <p className="text-body mt-0.5 !text-base italic" style={{ color: "var(--color-text-muted)" }}>
                    Message removed by moderator.
                  </p>
                ) : (
                  <p className="text-body mt-0.5 !text-base">{m.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* shrink-0 + safe-area padding (item 1, 2026-09-22, see
          DECISIONS.md): this form is a normal flex-bottom child of a
          h-dvh-constrained ancestor (see messages/[threadId]/page.tsx),
          which is what actually keeps it above the keyboard rather than
          behind it — no fixed positioning or visualViewport JS needed
          once the ancestor's height itself already tracks the shrunk
          viewport. The safe-area padding is separate: the iPhone home-
          indicator inset, same as BottomNav.tsx already accounts for. */}
      <form
        onSubmit={handleSend}
        className="shrink-0 border-t border-ob-border px-6 pt-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
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
            placeholder="Write something"
            maxLength={2000}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            name="dm-message-draft"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
          />
          <button type="submit" className="btn-primary shrink-0" disabled={sending || !draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
