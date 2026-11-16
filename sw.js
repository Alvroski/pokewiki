// PokéWiki service worker — full offline support.
// On install: cache the shell + data + every sprite listed in the data bundle.
const CACHE = "pokewiki-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "data/pokedex.json"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    try {
      const data = await (await fetch("data/pokedex.json")).json();
      const sprites = Object.values(data.pokemon).map((p) => p.sprite);
      // add in chunks to avoid one failure aborting all
      for (let i = 0; i < sprites.length; i += 50) {
        await Promise.all(sprites.slice(i, i + 50).map((s) =>
          cache.add(s).catch(() => {})));
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

// cache-first: everything is local & static
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request);
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      const cache = await caches.open(CACHE);
      cache.put(e.request, res.clone());
      return res;
    } catch (_) {
      return caches.match("index.html");
    }
  })());
});
