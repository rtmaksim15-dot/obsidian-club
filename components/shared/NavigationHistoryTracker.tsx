"use client";

import { useEffect } from "react";
import { recordPageLoad } from "@/lib/navigation/back-target";

// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — mounted
// once in the root layout, on every page. Records this page's load so
// BackButton.tsx (lib/navigation/back-target.ts) can tell a page
// reached via another page in this tab apart from a direct-opened one
// (deep link, bookmark, fresh standalone launch). Renders nothing;
// this is pure side effect, and runs exactly once per full page load
// (every navigation in this app is a full load — see
// back-target.ts's own comment for why that matters here).
export default function NavigationHistoryTracker() {
  useEffect(() => {
    recordPageLoad();
  }, []);

  return null;
}
