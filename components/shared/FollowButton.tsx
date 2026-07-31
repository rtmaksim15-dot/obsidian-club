"use client";

import { useState } from "react";

type Props = { userId: string; initialFollowing: boolean };

export default function FollowButton({ userId, initialFollowing }: Props) {
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
