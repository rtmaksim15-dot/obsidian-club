// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — there was
// no service worker at all before this (next-pwa is in package.json
// but was never wired into next.config.mjs). An installed/standalone
// app has no address bar to pull-to-refresh, so without this, a
// visitor who leaves the app open across a deploy keeps running the
// old build's JS indefinitely, and a later client-side navigation can
// try to fetch a chunk from a build Vercel no longer serves
// (ChunkLoadError) — see global-error handling in
// components/shared/PwaUpdateManager.tsx for that second half.
//
// This file is GENERATED at build time (scripts/generate-sw.js, run as
// package.json's "postbuild") from this template, with BUILD_ID
// substituted for the real `next build` output id — public/sw.js
// itself is gitignored. The substitution is what makes the service
// worker's own bytes change on every deploy, which is the only thing
// that makes a browser notice there's a new worker to install in the
// first place; a byte-for-byte-identical sw.js across deploys would
// never trigger the update flow below at all.
const BUILD_ID = "__BUILD_ID__";
const STATIC_CACHE = `oc-static-${BUILD_ID}`;
const PAGES_CACHE = `oc-pages-${BUILD_ID}`;
const CURRENT_CACHES = [STATIC_CACHE, PAGES_CACHE];

// Never call self.skipWaiting() here — an already-open tab must keep
// running its current build until the visitor actually chooses to
// refresh via the update bar (components/shared/PwaUpdateManager.tsx),
// not the moment a new version happens to finish installing in the
// background.
self.addEventListener("install", () => {});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith("oc-") && !CURRENT_CACHES.includes(name)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// Web Push, Package N1 (2026-10-25, see DECISIONS.md) — deliberately
// NOT present in scripts/sw-killswitch-template.js: the kill switch's
// whole job is to unregister itself and wipe every cache, so it has no
// business ever showing a notification, discreet or not. The push
// payload is always exactly { title, body, url } (lib/push/payload.ts
// builds it server-side; this is the one place that shape is trusted
// without re-validating it — only this app's own server ever sends a
// push here, authenticated by the VAPID key pair). `self.location.origin`
// resolves `url` so the payload only ever needs a path, matching how
// every other same-origin link in this app works.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const title = payload.title || "Obsidian Club";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      data: { url: payload.url || "/" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations/HTML: network-first. Whenever the visitor is online,
  // this guarantees the HTML (and therefore the hashed chunk URLs it
  // references) is always this deploy's actual current build — the
  // cached copy only ever serves as a last-resort offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGES_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(PAGES_CACHE);
          const cached = await cache.match(request);
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Hashed static assets (/_next/static/...): cache-first is safe here
  // specifically because the filename changes whenever the content
  // does — a stale cache entry under a build's old hash is simply
  // never requested again once the HTML above points at the new one.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
