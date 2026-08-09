import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import ProfileEditForm from "@/components/shared/ProfileEditForm";
import CloseAccountButton from "@/components/shared/CloseAccountButton";

// Self-edit only — no [id]/[username] param at all, since this can only
// ever be the caller's own profile. The API route re-derives the user
// from the session, which is the actual security boundary.
export default async function ProfileEditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/edit");

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-lg">
        <p className="text-label mb-2">Profile</p>
        <h1 className="text-h1 mb-10">Edit</h1>
        <ProfileEditForm
          user={{
            displayName: user.displayName,
            username: user.username,
            bio: user.bio ?? "",
            avatarUrl: user.avatarUrl,
            locationCity: user.locationCity ?? "",
            role: user.role,
            interests: user.interests,
            usernameChangeUsed: Boolean(user.usernameChangedAt),
          }}
        />

        <div className="mt-10">
          <CloseAccountButton />
        </div>
      </div>
    </main>
  );
}
