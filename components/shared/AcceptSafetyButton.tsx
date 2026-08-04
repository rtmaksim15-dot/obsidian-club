"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AcceptSafetyButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  async function handleAccept() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/ritual/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "safetyRules" }),
      });
      if (!res.ok) throw new Error("Failed to record acceptance.");
      router.push("/ritual");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAccept}
        disabled={status === "submitting"}
        className="btn-primary w-full"
      >
        {status === "submitting" ? "Recording…" : "I Understand and Accept"}
      </button>
      {status === "error" ? (
        <p className="text-caption mt-3 text-center" style={{ color: "var(--color-error)" }}>
          Something went wrong. Try again.
        </p>
      ) : null}
    </div>
  );
}
