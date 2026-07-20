"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

    const formData = new FormData();
    formData.append("file", file);

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
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
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
