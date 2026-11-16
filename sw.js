// PokéWiki service worker — offline support with fresh updates.
// Strategy: network-first for HTML + data (so new deploys show immediately),
// cache-first for sprites (immutable images). Full offline after first load.
const CACHE = "pokewiki-v4";
const SHELL = ["./", "index.html", "print.html", "manifest.webmanifest", "data/pokedex.json"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL).catch(() => {});
    try {
      const data = await (await fetch("data/pokedex.json", { cache: "reload" })).json();
      const sprites = Object.values(data.pokemon).map((p) => p.sprite);
      for (let i = 0; i < sprites.length; i += 50) {
        await Promise.all(sprites.slice(i, i + 50).map((s) => cache.add(s).catch(() => {})));
      }
    } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

const isFresh = (url) => url.pathname.endsWith(".html") || url.pathname.endsWith("/") ||
  url.pathname.endsWith("pokedex.json");

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (isFresh(url)) {
    // network-first: always try to get the latest, fall back to cache offline
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put(e.request, res.clone());
        return res;
      } catch (_) {
        return (await caches.match(e.request)) || (await caches.match("index.html"));
      }
    })());
    return;
  }

  // cache-first for images and everything else static
  e.respondWith((async () => {
    const hit = await caches.match(e.request);
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      const cache = await caches.open(CACHE);
      cache.put(e.request, res.clone());
      return res;
    } catch (_) { return hit; }
  })());
});
