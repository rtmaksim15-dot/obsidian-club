"use client";

import { useEffect, useRef, useState } from "react";
import { EyeOff } from "lucide-react";
import { createClient } from "@/lib/auth/supabase-browser";
import { useStickToBottom } from "@/lib/hooks/useStickToBottom";
import { groupConsecutiveMessages, dayLabel, isSameDay, formatMessageTime } from "@/lib/rooms/chat-grouping";
import { levelName } from "@/lib/rating/levels";
import ContentMenu from "./ContentMenu";

type Message = {
  id: string;
  content: string;
  // Moderation gap 1/2 (2026-09-08, see DECISIONS.md): same tombstone
  // treatment as Comment — see CommentSection.tsx's identical comment.
  isDeleted?: boolean;
  replyToId: string | null;
  createdAt: string;
  user: { id: string; username: string | null; displayName: string; avatarUrl: string | null; level: number; isTest?: boolean };
};

type Props = {
  room: { id: string; slug: string };
  currentUserId: string;
  currentUserIsAdmin: boolean;
  initialMessages: Message[];
};

const HIDDEN_MESSAGES_STORAGE_KEY = "oc-hidden-messages";

function loadHiddenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_MESSAGES_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveHiddenIds(ids: Set<string>) {
  try {
    localStorage.setItem(HIDDEN_MESSAGES_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Private mode / storage disabled — "Hide for me" just won't persist
    // across reloads; never a crash.
  }
}

/**
 * Room chat — message history (bottom-up) + composer + live updates via
 * Supabase Realtime. On a new INSERT, re-fetches the message list rather
 * than merging the raw Realtime payload (which doesn't include joined
 * sender info) — simplest correct approach at this scale; see
 * TECH_DEBT.md for the optimization opportunity.
 *
 * Clean Hall, B1-B3 (Package 5, Phase B, 2026-10-14, see DECISIONS.md)
 * — consecutive same-author messages within 5 minutes render as one
 * block (avatar/name/Title once); a small time per block and day
 * separators; the always-visible "···" is gone, replaced by a per-row
 * action trigger that's invisible until the row is hovered (desktop)
 * or long-pressed (touch) — see the row-level handlers below. "Hide
 * for me" is a pure client-side localStorage filter (no server write,
 * no new moderation logic — the task's own instruction); "Delete" for
 * someone else's message goes through the admin-only soft-delete
 * route (ContentMenu's `deleteMessageId`), and for a member's OWN
 * message goes through the separate member-facing route (ContentMenu's
 * `deleteOwnMessageId`, Package 5 follow-up, 2026-10-14, see
 * DECISIONS.md) — with its own preserve/open-report eligibility rules.
 *
 * The room header (name/description/room-nav link, the pinned note)
 * lives in the page (app/(platform)/rooms/[slug]/page.tsx), passed
 * into the shared ChatShell alongside this component — same split as
 * DmThreadChat, so the two share one full-height layout (2026-09-24,
 * see DECISIONS.md; ChatShell.tsx has the full reasoning).
 */
export default function RoomChat({ room, currentUserId, currentUserIsAdmin, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { listRef, bottomRef, handleListScroll } = useStickToBottom(messages.length);

  useEffect(() => {
    setHiddenIds(loadHiddenIds());
  }, []);

  function hideForMe(messageId: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(messageId);
      saveHiddenIds(next);
      return next;
    });
    setActiveRowId(null);
  }

  function startLongPress(messageId: string) {
    longPressTimer.current = setTimeout(() => setActiveRowId(messageId), 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Block 2 (August hardening pass, 2026-08-04): `messages` now has a
    // real RLS SELECT policy (previously RLS was off entirely — see
    // TECH_DEBT.md's URGENT entry). Two things had to be fixed together
    // for Realtime to keep working once that policy existed:
    //
    // 1. This fresh client instance has no session until it's hydrated
    //    from storage/cookies — without this `getSession()` await,
    //    `.subscribe()` raced ahead and opened the websocket
    //    unauthenticated, so `auth.uid()` was null and the policy
    //    (correctly) delivered nothing.
    // 2. The policy itself can't join out to `rooms`/`users` — confirmed
    //    live that a policy mirroring canAccessRoom() exactly (level +
    //    newcomers'-window via a join) never fires for Realtime even
    //    though the identical predicate evaluates true via a direct SQL
    //    query; a `using (true)` policy fired immediately, isolating
    //    this to Realtime's postgres_changes authorization specifically,
    //    not this component's wiring. The policy is `auth.uid() is not
    //    null` instead — self-contained, no cross-table reference. This
    //    only gates *whether the live "something changed" ping fires*;
    //    the actual message content this component displays always
    //    comes from `GET /api/rooms/:slug/messages`, which already
    //    enforces the real per-room canAccessRoom() check server-side
    //    (see that route). See DECISIONS.md, 2026-08-04.
    //
    // UPDATE added (moderation gap 1 follow-up, 2026-09-08, see
    // DECISIONS.md): a soft-delete is an UPDATE (isDeleted flips), not
    // an INSERT — without this, a removed message stayed fully visible
    // to everyone with the room open until their next fetch, which is
    // exactly wrong for the content this exists to remove (doxxing, a
    // contact solicitation). Same handler, same refetch-and-replace
    // approach as INSERT already used; no new RLS policy needed, since
    // Realtime's authorization check is "can this role SELECT this row,"
    // not operation-specific — the existing SELECT policy already covers
    // it.
    async function refetchMessages() {
      const res = await fetch(`/api/rooms/${room.slug}/messages`);
      if (res.ok) {
        const body = await res.json();
        setMessages(body.messages);
      }
    }

    supabase.auth.getSession().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`room:${room.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
          refetchMessages
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
          refetchMessages
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
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

  const visibleMessages = messages.filter((m) => !hiddenIds.has(m.id));
  const groups = groupConsecutiveMessages(visibleMessages.map((m) => ({ ...m, userId: m.user.id })));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ob-black text-ob-text">
      <div ref={listRef} onScroll={handleListScroll} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {groups.length === 0 ? (
          <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
            No messages yet. Be the first.
          </p>
        ) : (
          groups.map((group, groupIndex) => {
            const firstInGroup = group.messages[0];
            const prevGroup = groups[groupIndex - 1];
            const showDaySeparator =
              !prevGroup || !isSameDay(new Date(firstInGroup.createdAt), new Date(prevGroup.messages[prevGroup.messages.length - 1].createdAt));

            return (
              <div key={firstInGroup.id}>
                {showDaySeparator ? (
                  <p className="text-caption my-4 text-center" style={{ color: "var(--color-text-muted)" }}>
                    {dayLabel(new Date(firstInGroup.createdAt))}
                  </p>
                ) : null}

                <div className="flex items-start gap-3">
                  {(() => {
                    const avatarClassName = `avatar avatar-level-${firstInGroup.user.level} h-9 w-9 shrink-0`;
                    const avatarInner = firstInGroup.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstInGroup.user.avatarUrl} alt={firstInGroup.user.displayName} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
                        {firstInGroup.user.displayName.charAt(0).toUpperCase()}
                      </div>
                    );
                    // Nullable username (2026-09-25, see DECISIONS.md) — a
                    // non-admin poster must already have one to have posted
                    // at all; only an admin without a username could hit
                    // this. No profile to link to, so plain unlinked
                    // content instead of a link to a broken/empty URL.
                    return firstInGroup.user.username ? (
                      <a href={`/profile/${firstInGroup.user.username}`} className={avatarClassName}>
                        {avatarInner}
                      </a>
                    ) : (
                      <div className={avatarClassName}>{avatarInner}</div>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {firstInGroup.user.username ? (
                        <a href={`/profile/${firstInGroup.user.username}`} className="text-data">
                          {firstInGroup.user.displayName}
                        </a>
                      ) : (
                        <span className="text-data">{firstInGroup.user.displayName}</span>
                      )}
                      {/* Clean Hall, B1 — "Toma · Initiate": the same
                          level-name system LEVELS_UI_ENABLED already
                          surfaces elsewhere (profile/hall), not the
                          separate, not-yet-displayed REP title system. */}
                      <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                        · {levelName(firstInGroup.user.level)}
                      </span>
                      {firstInGroup.user.id === currentUserId ? (
                        <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                          you
                        </span>
                      ) : null}
                      {/* Clean Hall, B6 — admin-only; a non-admin never
                          sees a test account's messages at all. */}
                      {currentUserIsAdmin && firstInGroup.user.isTest ? (
                        <span
                          className="text-caption rounded-ob border px-1.5 py-0.5 uppercase tracking-brand"
                          style={{ borderColor: "var(--color-warning)", color: "var(--color-warning)" }}
                        >
                          Test
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-0.5">
                      {group.messages.map((m) => {
                        const isActive = activeRowId === m.id;
                        const isOwnMessage = m.user.id === currentUserId;
                        // Clean Hall, B3 follow-up (Package 5, Phase B, 2026-10-14,
                        // see DECISIONS.md) — a member deleting their OWN message
                        // always goes through the stricter member-facing route
                        // (preserve/open-report checks), even when that member is
                        // an admin; the unrestricted admin route is only for an
                        // admin removing someone ELSE's message.
                        const canDeleteOwn = !m.isDeleted && isOwnMessage;
                        const canDeleteAsAdmin = !m.isDeleted && currentUserIsAdmin && !isOwnMessage;
                        const canDeleteThis = canDeleteOwn || canDeleteAsAdmin;
                        const canReportThis = !m.isDeleted && !isOwnMessage;
                        const hasAnyAction = canDeleteThis || canReportThis;

                        return (
                          <div
                            key={m.id}
                            className="group relative flex items-center gap-2"
                            onMouseEnter={() => hasAnyAction && setActiveRowId(m.id)}
                            onMouseLeave={() => setActiveRowId((cur) => (cur === m.id ? null : cur))}
                            onTouchStart={() => hasAnyAction && startLongPress(m.id)}
                            onTouchEnd={cancelLongPress}
                            onTouchMove={cancelLongPress}
                          >
                            {m.isDeleted ? (
                              <p className="text-body !text-base italic" style={{ color: "var(--color-text-muted)" }}>
                                Message removed by moderator.
                              </p>
                            ) : (
                              <p className="text-body !text-base">{m.content}</p>
                            )}
                            <span className="text-caption shrink-0" style={{ color: "var(--color-text-muted)" }}>
                              {formatMessageTime(new Date(m.createdAt))}
                            </span>

                            {hasAnyAction ? (
                              <div
                                className={`flex shrink-0 items-center gap-1 transition-opacity ${isActive ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"}`}
                              >
                                <button
                                  type="button"
                                  aria-label="Hide for me"
                                  onClick={() => hideForMe(m.id)}
                                  className="flex h-6 w-6 items-center justify-center"
                                  style={{ color: "var(--color-text-muted)" }}
                                >
                                  <EyeOff size={14} strokeWidth={1.5} />
                                </button>
                                <ContentMenu
                                  targetType="message"
                                  targetId={m.id}
                                  preview={m.content}
                                  canReport={canReportThis}
                                  deleteMessageId={canDeleteAsAdmin ? m.id : undefined}
                                  deleteOwnMessageId={canDeleteOwn ? m.id : undefined}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* shrink-0 + safe-area padding, matching DmThreadChat's composer
          exactly (2026-09-24, see DECISIONS.md) — this is what keeps the
          composer full-size and above the iPhone home-indicator inset
          rather than an unrelated divergence now that both share the
          same h-dvh-constrained ancestor. */}
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
            placeholder="Say something"
            maxLength={2000}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={sending || !draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
