"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateMemberInviteButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/invites/member", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error ?? "Could not create invitation.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div>
      <button type="button" className="btn-primary" onClick={handleClick} disabled={submitting}>
        {submitting ? "Creating…" : "Create invitation"}
      </button>
      {error ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
