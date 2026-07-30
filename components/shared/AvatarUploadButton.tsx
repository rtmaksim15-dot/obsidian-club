"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/utils/compressImage";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB safety net, post-compression — must match app/api/profile/avatar/route.ts

// Compressed client-side first (resize to max 2048px, re-encode as
// JPEG) before upload — same reasoning and same utility as
// ContentComposer's photo upload: real iPhone photos routinely land
// well over 8MB uncompressed, and this app's own Vercel deployment
// caps request bodies at 4.5MB regardless. See DECISIONS.md, 2026-07-29.
export default function AvatarUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setUploading(true);
    setError(null);

    let compressed;
    try {
      compressed = await compressImage(file);
    } catch {
      setError("Could not process image.");
      setUploading(false);
      return;
    }
    if (compressed.size > MAX_BYTES) {
      setError("Image must be 8MB or smaller.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", compressed);

    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Could not upload avatar.");
      setUploading(false);
      return;
    }

    setUploading(false);
    router.refresh();
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <button
        type="button"
        className="btn-secondary !bg-transparent !text-sm !min-w-0 !h-auto !py-2 !px-4"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Change avatar"}
      </button>
      {error ? (
        <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
