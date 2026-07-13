import { ProfileEditForm } from "obsidian-club";

// The profile editor: avatar + upload, display name, username, bio, city,
// role select, interests. Composes AvatarUploadButton internally.
export const Default = () => (
  <div style={{ maxWidth: 520, padding: "1.5rem" }}>
    <ProfileEditForm
      user={{
        displayName: "Adrian Kessler",
        username: "adrian-k",
        bio: "Berlin. Studying restraint. Six weeks into the morning ritual.",
        avatarUrl: null,
        locationCity: "Berlin",
        role: "submissive",
        interests: ["rope", "mentorship", "cold water"],
      }}
    />
  </div>
);
