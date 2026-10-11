"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MockVerificationPanel({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"passed" | "failed" | null>(null);

  async function simulate(outcome: "passed" | "failed") {
    setSubmitting(outcome);
    await fetch(`/api/age-verification/mock/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    }).catch(() => undefined);
    router.push("/verify/return");
  }

  return (
    <div className="mt-10 w-full max-w-sm space-y-3">
      <button
        type="button"
        className="btn-primary w-full"
        disabled={submitting !== null}
        onClick={() => simulate("passed")}
      >
        {submitting === "passed" ? "Simulating…" : "Simulate pass"}
      </button>
      <button
        type="button"
        className="btn-secondary w-full"
        disabled={submitting !== null}
        onClick={() => simulate("failed")}
      >
        {submitting === "failed" ? "Simulating…" : "Simulate fail"}
      </button>
    </div>
  );
}
