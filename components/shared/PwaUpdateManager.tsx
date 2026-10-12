"use client";

import { useEffect, useState } from "react";
import { nextUpdateBarState, type UpdateBarState } from "@/lib/pwa/update-bar";
import { isChunkLoadError, shouldAutoReloadForChunkError } from "@/lib/pwa/chunk-error";

const CHUNK_RELOAD_FLAG_KEY = "oc-chunk-reload-attempted";

function handlePossibleChunkError(error: unknown) {
  if (!isChunkLoadError(error)) return;
  let alreadyAttempted = false;
  try {
    alreadyAttempted = sessionStorage.getItem(CHUNK_RELOAD_FLAG_KEY) === "1";
  } catch {
    // sessionStorage unavailable (private mode etc.) — treat as not yet
    // attempted; worst case is one extra reload, never a silent loop,
    // since the reload below only ever fires once per real navigation.
  }
  if (!shouldAutoReloadForChunkError(alreadyAttempted)) return;
  try {
    sessionStorage.setItem(CHUNK_RELOAD_FLAG_KEY, "1");
  } catch {}
  window.location.reload();
}

// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — mounted
// once in the root layout (every page, platform and public alike).
// Registers public/sw.js (generated at build time, see
// scripts/generate-sw.js), surfaces an "A new version is ready." bar
// once a new worker is waiting, and separately catches ChunkLoadError
// globally (unrelated to the service worker itself — see
// lib/pwa/chunk-error.ts) for a tab that was already open across a
// deploy and tries a stale client-side navigation.
export default function PwaUpdateManager() {
  const [state, setState] = useState<UpdateBarState>("none");
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    function onError(event: ErrorEvent) {
      handlePossibleChunkError(event.error);
    }
    function onRejection(event: PromiseRejectionEvent) {
      handlePossibleChunkError(event.reason);
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    function presentWaiting(worker: ServiceWorker | null) {
      if (!worker) return;
      setWaitingWorker(worker);
      setState((s) => nextUpdateBarState(s, "waiting_detected"));
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;

        presentWaiting(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && reg.waiting) {
              presentWaiting(reg.waiting);
            }
          });
        });
      })
      .catch((err) => {
        console.error("[pwa] service worker registration failed:", err);
      });

    // Check-for-updates on focus/visibility-change (not just load) — an
    // installed app has no address bar to pull-to-refresh, so a visitor
    // reopening it is the moment that most needs a fresh check.
    function checkForUpdate() {
      registration?.update().catch(() => {});
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") checkForUpdate();
    }
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", onVisibilityChange);

    let reloadedOnce = false;
    function onControllerChange() {
      setState((s) => nextUpdateBarState(s, "controller_changed"));
      if (reloadedOnce) return;
      reloadedOnce = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("focus", checkForUpdate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  function handleRefresh() {
    setState((s) => nextUpdateBarState(s, "refresh_clicked"));
    waitingWorker?.postMessage("SKIP_WAITING");
  }

  if (state !== "waiting") return null;

  return (
    // Fixed at the very top, above TopBar's own z-20 (rather than the
    // bottom, where BottomTabBar already lives on most member pages) —
    // this only appears while an update is waiting, so briefly covering
    // the top edge until the visitor taps Refresh is the simplest way
    // to avoid colliding with either nav bar without needing to know,
    // from this globally-mounted component, whether the current page
    // even has one.
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 border-b px-4 py-3"
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        borderColor: "var(--color-gold)",
        color: "var(--color-text-primary)",
        paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
      }}
      role="status"
    >
      <span className="text-caption">A new version is ready.</span>
      <button type="button" onClick={handleRefresh} className="nav-control btn-primary px-4 py-1.5 text-caption">
        Refresh
      </button>
    </div>
  );
}
