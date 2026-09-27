/* Leaves service worker: keeps the app shell offline and shows the daily reminder. */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const SHELL = `leaves-shell-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("leaves-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Pages: the network if it answers quickly, otherwise the cached app.
  if (req.mode === "navigate") {
    event.respondWith(
      Promise.race([fetch(req), timeout(3500)])
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/", { cacheName: SHELL }).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Built files never change once named, so the cache is always right.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/"))) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

self.addEventListener("push", (event) => {
  let body = "Your page is here whenever you want it.";
  try {
    body = event.data ? event.data.json().body || body : body;
  } catch (e) {
    /* plain text */
  }
  event.waitUntil(
    self.registration.showNotification("Leaves", {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "leaves-daily",
      silent: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("/");
    }),
  );
});
