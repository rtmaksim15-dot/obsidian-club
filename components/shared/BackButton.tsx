"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { canGoBack, resolveBackTarget } from "@/lib/navigation/back-target";

// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — rendered
// by TopBar.tsx in place of the OC monogram on any page that isn't a
// bottom-tab-bar root (lib/config/nav.ts#isBottomTabRoot). Standalone
// mode has no browser chrome, so this is the only way to get back
// from a legal page, a post, a profile, etc. without being trapped.
export default function BackButton() {
  const router = useRouter();

  function handleClick() {
    const target = resolveBackTarget(canGoBack());
    if (target.type === "back") {
      router.back();
    } else {
      router.push(target.path);
    }
  }

  return (
    <button type="button" aria-label="Back" onClick={handleClick} className="nav-control flex items-center">
      <ArrowLeft size={22} strokeWidth={1.5} style={{ color: "var(--color-text-secondary)" }} />
    </button>
  );
}
