import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import ProfileEditForm from "@/components/shared/ProfileEditForm";

// Self-edit only — always redirect to /profile/[id]/edit for the CALLER's
// own id, never someone else's (the API route also re-derives the user
// from the session, so this is UX, not the actual security boundary).
export default async function ProfileEditPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/profile/${params.id}/edit`);
  if (user.id !== params.id) redirect(`/profile/${user.id}`);

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
          }}
        />
      </div>
    </main>
  );
}
