const CACHE_NAME = "ridesafe-v1";
const API_CACHE = "ridesafe-api-v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isFresh(cachedResponse) {
  const cachedAt = cachedResponse.headers.get("sw-cached-at");
  if (!cachedAt) return false;
  return Date.now() - parseInt(cachedAt, 10) < CACHE_TTL_MS;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests: network-first with 10-min cache fallback
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(API_CACHE);
            // Clone and tag with timestamp
            const body = await response.clone().arrayBuffer();
            const headers = new Headers(response.headers);
            headers.set("sw-cached-at", Date.now().toString());
            const tagged = new Response(body, {
              status: response.status,
              statusText: response.statusText,
              headers,
            });
            cache.put(event.request, tagged);
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(API_CACHE);
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: "Offline — no cached data available" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        })
    );
    return;
  }

  // Navigation requests: network-first, fallback to cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((r) => r || fetch(event.request))
      )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
