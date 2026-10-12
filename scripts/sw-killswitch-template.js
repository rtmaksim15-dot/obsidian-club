// SW kill switch — emitted by scripts/generate-sw.js in place of the
// real service worker (scripts/sw-template.js) when
// NEXT_PUBLIC_SW_ENABLED is the literal string "false". See
// DECISIONS.md for the emergency procedure this exists for.
//
// Unlike the real service worker, this one skips waiting and claims
// control immediately — the whole point is urgent, unattended cleanup
// for every installed app still running an older, real service worker,
// not a visitor-confirmed update. On activate: wipe every cache this
// origin's service worker ever created, unregister itself so no
// service worker controls this origin going forward, then force every
// open window to reload so it actually leaves standalone-cached state
// behind instead of just silently losing its worker next time it would
// have fetched something.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});
