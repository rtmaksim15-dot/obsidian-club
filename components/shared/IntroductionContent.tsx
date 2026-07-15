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
        <p>You were not chosen by accident.</p>
        <p>Every name in this Hall was weighed. Yours held.</p>
        <p>
          I built this place for those who carry power the way it should be
          carried — quietly, deliberately, without apology and without noise.
          Out there, strength is performed. Here, it is practiced.
        </p>
        <p>
          Three things I ask of you. Read the Code — it is short, because
          real laws are. Complete your profile — the Circle deserves to know
          who stands beside them. And listen more than you speak, at first.
          The ones worth knowing always do.
        </p>
        <p>
          This is not a network. You will not be sold to, recruited, or
          collected. What you build here — reputation, trust, standing —
          cannot be bought and cannot be transferred. That is precisely what
          makes it worth having.
        </p>
        <p>The doors are closed behind you.</p>
        <p>Welcome to the Circle.</p>
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
