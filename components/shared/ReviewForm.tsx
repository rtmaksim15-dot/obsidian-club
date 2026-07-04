"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm({ reviewedId }: { reviewedId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/users/${reviewedId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Could not submit.");
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
    router.refresh();
  }

  if (done) {
    return (
      <p className="text-caption" style={{ color: "var(--color-success)" }}>
        Review submitted.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label htmlFor="rating" className="input-label">
          Rating
        </label>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-pressed={rating === n}
              className={n <= rating ? "star-filled" : "star-empty"}
              style={{ fontSize: "1.5rem", lineHeight: 1 }}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="input-label">
          Comment <span className="normal-case">(optional)</span>
        </label>
        <textarea
          id="comment"
          className="input"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Submitting…" : "Leave a review"}
      </button>
    </form>
  );
}
