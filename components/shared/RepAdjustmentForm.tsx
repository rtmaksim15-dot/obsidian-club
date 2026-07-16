"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function RepAdjustmentForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/admin/rep-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong.");
      setStatus("success");
      setMessage(`Done — ${data.email} is now at ${body.rep} REP.`);
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
      <div>
        <label htmlFor="rep-email" className="input-label">
          Member email
        </label>
        <input id="rep-email" name="email" type="email" required className="input" placeholder="you@example.com" />
      </div>

      <div>
        <label htmlFor="rep-delta" className="input-label">
          Amount (+ or -)
        </label>
        <input id="rep-delta" name="delta" type="number" required className="input" placeholder="e.g. 25 or -50" />
      </div>

      <div>
        <label htmlFor="rep-reason" className="input-label">
          Reason
        </label>
        <input id="rep-reason" name="reason" required className="input" placeholder="Why this adjustment" />
      </div>

      {message ? (
        <p
          className="text-caption"
          style={{ color: status === "error" ? "var(--color-error)" : "var(--color-success)" }}
        >
          {message}
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={status === "submitting"}>
        {status === "submitting" ? "Applying…" : "Apply Adjustment"}
      </button>
    </form>
  );
}
