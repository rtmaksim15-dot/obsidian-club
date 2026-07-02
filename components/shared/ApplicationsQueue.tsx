"use client";

import { useState } from "react";

type Application = {
  id: string;
  name: string | null;
  email: string;
  age: number | null;
  city: string | null;
  source: string | null;
  referralCode: string | null;
  createdAt: string;
};

export default function ApplicationsQueue({ initial }: { initial: Application[] }) {
  const [applications, setApplications] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function review(id: string, action: "approve" | "decline") {
    setPendingId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setErrorId(id);
    } finally {
      setPendingId(null);
    }
  }

  if (applications.length === 0) {
    return <p className="text-body">No pending applications.</p>;
  }

  return (
    <ul className="space-y-4">
      {applications.map((a) => (
        <li key={a.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-h2 !text-base">{a.name || "(no name given)"}</p>
              <p className="text-data mt-1">{a.email}</p>
              <p className="text-caption mt-2">
                {[a.age ? `${a.age} yrs` : null, a.city, a.source, a.referralCode ? `code: ${a.referralCode}` : null]
                  .filter(Boolean)
                  .join(" · ") || "No additional details."}
              </p>
              <p className="text-caption mt-1">
                Applied {new Date(a.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="btn-secondary"
                disabled={pendingId === a.id}
                onClick={() => review(a.id, "decline")}
              >
                Decline
              </button>
              <button
                className="btn-primary"
                disabled={pendingId === a.id}
                onClick={() => review(a.id, "approve")}
              >
                {pendingId === a.id ? "…" : "Approve"}
              </button>
            </div>
          </div>
          {errorId === a.id ? (
            <p className="text-caption mt-3" style={{ color: "var(--color-error)" }}>
              Something went wrong. Try again.
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
