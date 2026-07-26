"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarUploadButton from "./AvatarUploadButton";

type Props = {
  user: {
    displayName: string;
    username: string;
    bio: string;
    avatarUrl: string | null;
    locationCity: string;
    role: string | null;
    interests: string[];
  };
};

const ROLES = [
  { value: "", label: "Prefer not to say" },
  { value: "dominant", label: "Dominant" },
  { value: "submissive", label: "Submissive" },
  { value: "switch", label: "Switch" },
  { value: "observer", label: "Observer" },
  { value: "newcomer", label: "Newcomer" },
];

export default function ProfileEditForm({ user }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [locationCity, setLocationCity] = useState(user.locationCity);
  const [role, setRole] = useState(user.role ?? "");
  const [interestsText, setInterestsText] = useState(user.interests.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const interests = interestsText
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, username, bio, locationCity, role: role || undefined, interests }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setSaved(true);
    setSubmitting(false);
    // Same pattern as AcceptCodeButton (Code of Conduct step) — /ritual
    // re-checks status and either shows the next step or, once every
    // step is done, redirects straight to /hall. Without this the user
    // was stranded on the edit page after saving.
    router.push("/ritual");
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
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A few words about you"
          />
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            {bio.length}/300
          </p>
        </div>

        <div>
          <label htmlFor="locationCity" className="input-label">
            City
          </label>
          <input
            id="locationCity"
            className="input"
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
            placeholder="Where you're based"
          />
        </div>

        <div>
          <label htmlFor="role" className="input-label">
            Role
          </label>
          <select id="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="interests" className="input-label">
            Interests
          </label>
          <input
            id="interests"
            className="input"
            value={interestsText}
            onChange={(e) => setInterestsText(e.target.value)}
            placeholder="Comma-separated — rope, mentorship, travel…"
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
