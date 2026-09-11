/* Sanyuj PWA service worker — cache app shell for offline revisit */
const CACHE = "sanyuj-shell-v3-offerly-notifications";
const PRECACHE = ["/", "/app/offerly", "/app/notifications", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations & API; cache fallback for shell
  if (request.mode === "navigate" || url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          if (request.mode === "navigate" && res.ok) {
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/app/offerly"))),
    );
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
  }
});
