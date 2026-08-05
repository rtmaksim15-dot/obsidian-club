"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { userId: string; initialFollowing: boolean };

export default function FollowButton({ userId, initialFollowing }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const optimistic = !following;
    setFollowing(optimistic);

    const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
    if (!res.ok) {
      setFollowing(!optimistic);
    } else {
      // Block 4 (August hardening pass, 2026-08-05): the follower/following
      // counts on this page are server-rendered props, computed once at
      // page load — this button never touched them, so a follow/unfollow
      // silently left a stale count on screen until a manual reload. Found
      // during the production regression walkthrough. Same
      // router.refresh() pattern CommentSection.tsx already uses after
      // posting a comment.
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={following ? "btn-ghost" : "btn-primary"}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
