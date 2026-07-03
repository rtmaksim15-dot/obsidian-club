import { getCurrentUser } from "@/lib/auth/session";
import BottomNav from "@/components/shared/BottomNav";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <>
      <div className="pb-16 sm:pb-0">{children}</div>
      {user ? <BottomNav profileHref={`/profile/${user.id}`} /> : null}
    </>
  );
}
