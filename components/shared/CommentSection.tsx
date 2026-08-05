"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null; level: number };
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

export default function CommentSection({ postId, initial }: { postId: string; initial: Comment[] }) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not post your comment.");
        return;
      }
      setComments((prev) => [...prev, body.comment]);
      setDraft("");
      // Instant local update above for the list; refresh so the
      // server-rendered comment count on the card above (and on /feed,
      // if the caller navigates back) catches up too.
      router.refresh();
    } catch {
      // Block 3 (August hardening pass, 2026-08-04): a raw fetch()
      // failure never carries a human-authored message — fixed
      // fallback, not err.message.
      setError("Could not post your comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="text-label mb-3">
        {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
      </p>

      {comments.length > 0 ? (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <div className={`avatar avatar-level-${c.author.level} h-8 w-8 shrink-0`}>
                {c.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.author.avatarUrl} alt={c.author.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-ob-surface text-xs">
                    {c.author.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-data !text-sm">{c.author.displayName}</p>
                <p className="text-body !text-base">{c.content}</p>
                <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {formatTimestamp(c.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
          No comments yet. Be the first.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment"
          maxLength={2000}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={submitting || !draft.trim()}>
          {submitting ? "…" : "Post"}
        </button>
      </form>
      {error ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
