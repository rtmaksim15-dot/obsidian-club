"use client";

import { useState } from "react";

type Member = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  age: number | null;
  ageVerified: boolean;
};

export default function MembersAgeVerification({ initial }: { initial: Member[] }) {
  const [members, setMembers] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function toggle(id: string, next: boolean) {
    setPendingId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageVerified: next }),
      });
      if (!res.ok) throw new Error();
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ageVerified: next } : m)));
    } catch {
      setErrorId(id);
    } finally {
      setPendingId(null);
    }
  }

  if (members.length === 0) {
    return <p className="text-body">No members yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {members.map((m) => (
        <li key={m.id} className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-h2 !text-base">{m.displayName}</p>
            <p className="text-data mt-1">
              @{m.username} · {m.email}
              {m.age ? ` · ${m.age} yrs` : ""}
            </p>
            {errorId === m.id ? (
              <p className="text-caption mt-1" style={{ color: "var(--color-error)" }}>
                Something went wrong. Try again.
              </p>
            ) : null}
          </div>
          <label className="text-caption flex shrink-0 items-center gap-2">
            <input
              type="checkbox"
              checked={m.ageVerified}
              disabled={pendingId === m.id}
              onChange={(e) => toggle(m.id, e.target.checked)}
            />
            Age verified
          </label>
        </li>
      ))}
    </ul>
  );
}
