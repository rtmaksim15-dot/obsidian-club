"use client";

import { useRouter } from "next/navigation";
import { UploadButton } from "@/lib/utils/uploadthing";

/** Inert until UPLOADTHING_SECRET/UPLOADTHING_APP_ID are set — see TECH_DEBT.md. */
export default function AvatarUploadButton() {
  const router = useRouter();

  return (
    <UploadButton
      endpoint="avatarUploader"
      appearance={{
        button:
          "btn-secondary !bg-transparent !text-sm !min-w-0 !h-auto !py-2 !px-4 after:!bg-ob-accent",
        allowedContent: "hidden",
      }}
      content={{ button: "Change avatar" }}
      onClientUploadComplete={() => router.refresh()}
      onUploadError={(err) => console.error("[avatar upload]", err.message)}
    />
  );
}
