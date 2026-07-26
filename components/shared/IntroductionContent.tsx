"use client";

import { useEffect, useRef, useState } from "react";

export default function IntroductionContent({ alreadyCompleted }: { alreadyCompleted: boolean }) {
  const [reachedEnd, setReachedEnd] = useState(alreadyCompleted);
  const [recording, setRecording] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const firedRef = useRef(alreadyCompleted);

  useEffect(() => {
    if (alreadyCompleted) return;
    const el = sentinelRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      // No observer support: don't silently block completion — treat as read.
      setReachedEnd(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !firedRef.current) {
          firedRef.current = true;
          setReachedEnd(true);
          setRecording(true);
          fetch("/api/ritual/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "introMaterial" }),
          })
            .catch(() => {
              // Best-effort: the member has read it either way; a failed
              // write just means the Ritual page will ask again.
            })
            .finally(() => setRecording(false));
          observer.disconnect();
        }
      },
      { threshold: 1.0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [alreadyCompleted]);

  return (
    <div>
      <div className="text-body space-y-6 !text-lg italic">
        <p>You were not invited by chance. Every application is read. Yours held weight.</p>
        <p>
          Obsidian Club exists for those who value trust, discipline, and
          connections that mean something. There is nothing to perform here.
          No followers to count. No algorithm to feed. Your standing in the
          Circle is built the old way — by how you treat people, what you
          contribute, and the word you keep.
        </p>
        <p>
          The rite before you is short. Complete it with care — it is the
          first thing the Circle will know of you.
        </p>
        <p>Enter well.</p>
      </div>

      <div ref={sentinelRef} className="mt-10 flex items-center justify-end gap-4">
        <span className="h-px w-12 bg-ob-gold" />
        <span className="font-cinzel text-sm tracking-[0.28em] text-ob-gold">— LORD OBSIDIAN</span>
      </div>

      <div className="mt-10">
        {reachedEnd ? (
          <a href="/ritual" className="btn-primary block w-full text-center">
            {recording ? "Recording…" : "Continue"}
          </a>
        ) : (
          <p className="text-caption text-center" style={{ color: "var(--color-text-muted)" }}>
            Keep reading to the end.
          </p>
        )}
      </div>
    </div>
  );
}
