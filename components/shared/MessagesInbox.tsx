"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = { id: string; username: string; displayName: string; avatarUrl: string | null };

type ConversationRequestItem = {
  id: string;
  openingMessage: string;
  createdAt: string;
  sender: Person;
};

type ThreadItem = {
  id: string;
  otherParticipant: Person;
  lastMessage: { content: string; isDeleted: boolean; createdAt: string; fromMe: boolean } | null;
};

function Avatar({ person }: { person: Person }) {
  return (
    <div className="avatar h-10 w-10 shrink-0">
      {person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt={person.displayName} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
          {person.displayName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// Item 2 (the recipient's side) + the accepted-threads list, one page.
// A request's profile link opens in a new tab — "returns to the
// request without dismissing it" is then trivial: this tab never
// navigates away, there's nothing to return to.
export default function MessagesInbox({
  initialRequests,
  initialThreads,
}: {
  initialRequests: ConversationRequestItem[];
  initialThreads: ThreadItem[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(id: string, action: "accept" | "decline") {
    setPending(id);
    setError(null);
    try {
      const res = await fetch(`/api/dm/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong.");
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (action === "accept" && body.threadId) {
        router.push(`/messages/${body.threadId}`);
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Direct Messages</p>
        <h1 className="text-h1 mb-10">Messages</h1>

        {error ? (
          <p className="text-caption mb-6" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        ) : null}

        {requests.length === 0 && initialThreads.length === 0 ? (
          <div className="mb-10">
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              Conversations start from a member&apos;s profile — find someone and send a message.
            </p>
            <a href="/members" className="btn-primary mt-4 inline-block">
              Find members
            </a>
          </div>
        ) : null}

        {requests.length > 0 ? (
          <section className="mb-10">
            <p className="text-label mb-3">Requests</p>
            <ul className="space-y-4">
              {requests.map((r) => (
                <li key={r.id} className="card">
                  <div className="flex items-start gap-3">
                    <Avatar person={r.sender} />
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/profile/${r.sender.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-data"
                      >
                        {r.sender.displayName}
                      </a>
                      <p className="text-body mt-1 !text-base">{r.openingMessage}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={pending === r.id}
                      onClick={() => respond(r.id, "accept")}
                    >
                      {pending === r.id ? "…" : "Accept"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={pending === r.id}
                      onClick={() => respond(r.id, "decline")}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {requests.length > 0 || initialThreads.length > 0 ? (
        <section>
          <p className="text-label mb-3">Conversations</p>
          {initialThreads.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              Nothing here yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {initialThreads.map((t) => (
                <li key={t.id}>
                  <a href={`/messages/${t.id}`} className="card flex items-center gap-3">
                    <Avatar person={t.otherParticipant} />
                    <div className="min-w-0 flex-1">
                      <p className="text-data">{t.otherParticipant.displayName}</p>
                      {t.lastMessage ? (
                        <p className="text-caption mt-0.5 truncate" style={{ color: "var(--color-text-secondary)" }}>
                          {t.lastMessage.fromMe ? "You: " : ""}
                          {t.lastMessage.isDeleted ? "Message removed by moderator." : t.lastMessage.content}
                        </p>
                      ) : null}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
        ) : null}
      </div>
    </main>
  );
}
