/* פצצות אהבה · הקופסה — עבודה בלי חיבור. קבצי המשחק: רשת קודם, מטמון כגיבוי. פונטים: מטמון קודם. */
const CACHE = "lovebooms-box-v1";
const SHELL = ["./", "index.html", "premium.css", "premium.js", "decks.js", "config.js", "codes.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !font) return;
  if (url.origin === location.origin && !url.pathname.startsWith(new URL("./", location).pathname)) return;
  const put = (res) => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };
  if (font) { e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put))); return; }
  e.respondWith(fetch(req).then(put).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html"))));
});
