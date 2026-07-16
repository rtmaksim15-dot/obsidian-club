"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinHouseButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  async function handleJoin() {
    setStatus("submitting");
    try {
      const res = await fetch(`/api/houses/${slug}/join`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <button type="button" onClick={handleJoin} disabled={status === "submitting"} className="btn-primary">
        {status === "submitting" ? "Joining…" : "Join House"}
      </button>
      {status === "error" ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          Something went wrong. Try again.
        </p>
      ) : null}
    </div>
  );
}
