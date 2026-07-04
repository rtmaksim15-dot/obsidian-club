"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

type Props = { postId: string; initialCount: number; initialLiked: boolean };

export default function LikeButton({ postId, initialCount, initialLiked }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setCount((c) => c + (optimisticLiked ? 1 : -1));

    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) {
      setLiked(!optimisticLiked);
      setCount((c) => c + (optimisticLiked ? -1 : 1));
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1.5 text-caption"
      style={{ color: liked ? "var(--color-accent)" : "var(--color-text-muted)" }}
    >
      <Heart size={16} strokeWidth={1.5} fill={liked ? "currentColor" : "none"} />
      {count}
    </button>
  );
}
