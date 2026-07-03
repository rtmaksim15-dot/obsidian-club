"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarUploadButton from "./AvatarUploadButton";

type Props = {
  user: { displayName: string; username: string; bio: string; avatarUrl: string | null };
};

export default function ProfileEditForm({ user }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, username, bio }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setSaved(true);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="input-label">Avatar</p>
        <div
          className="avatar h-20 w-20"
          style={{ borderColor: "var(--color-border)" }}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ob-surface text-2xl">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="mt-3">
          <AvatarUploadButton />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="displayName" className="input-label">
            Display name
          </label>
          <input
            id="displayName"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="username" className="input-label">
            Username
          </label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            pattern="[a-z0-9-]{3,30}"
            placeholder="lowercase, numbers, hyphens"
            required
          />
        </div>

        <div>
          <label htmlFor="bio" className="input-label">
            Bio
          </label>
          <textarea
            id="bio"
            className="input"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A few words about you"
          />
        </div>

        {error ? (
          <p className="text-caption" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-caption" style={{ color: "var(--color-success)" }}>
            Saved.
          </p>
        ) : null}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
