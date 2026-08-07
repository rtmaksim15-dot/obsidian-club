"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "submitting" | "error";

export default function InviteBatchGenerator() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const count = Number(formData.get("count"));
    const channel = String(formData.get("channel") || "print");
    const campaign = String(formData.get("campaign") || "").trim();

    try {
      const res = await fetch("/api/admin/invite-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, channel, campaign: campaign || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(body?.error ?? "Could not generate batch.");
        return;
      }
      router.push(`/admin/invite-batches/${body.batchId}`);
    } catch {
      // Block 3 (August hardening pass, 2026-08-04): a raw fetch()
      // failure (offline, DNS, CORS) never carries a human-authored
      // message — show the fixed fallback instead of err.message.
      setStatus("error");
      setError("Could not generate batch.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-wrap items-end gap-4" noValidate>
      <div>
        <label htmlFor="count" className="input-label">
          Number of tokens
        </label>
        <input
          id="count"
          name="count"
          type="number"
          min={1}
          max={500}
          required
          className="input"
          placeholder="e.g. 50"
        />
      </div>
      <div>
        <label htmlFor="channel" className="input-label">
          Channel
        </label>
        <select id="channel" name="channel" className="input" defaultValue="print">
          <option value="print">Print</option>
          <option value="email">Email</option>
          <option value="letter">Letter</option>
        </select>
      </div>
      <div>
        <label htmlFor="campaign" className="input-label">
          Campaign (optional)
        </label>
        <input
          id="campaign"
          name="campaign"
          type="text"
          className="input"
          placeholder="e.g. Founders List"
        />
      </div>
      <button type="submit" className="btn-primary" disabled={status === "submitting"}>
        {status === "submitting" ? "Generating…" : "Generate Batch"}
      </button>
      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
