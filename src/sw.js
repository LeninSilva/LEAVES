/* Leaves service worker: keeps the app working offline and shows the daily reminder. */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const SHELL = `leaves-shell-${VERSION}`;
// Built files are named by their contents, so they are kept across releases:
// a page opened before an update can still load the screens it asks for.
const ASSETS = "leaves-assets";
const META = "leaves-meta";
const SHELL_FILES = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];
// Grass, drifting leaves and the Quiet pictures: small, and needed on most screens. Named by their
// contents, so a release that doesn't change a picture doesn't download it again.
const ART = `leaves-art-${"__ART_VERSION__"}`;
const ART_FILES = __ART__;
const isAsset = (path) => path.startsWith("/assets/");

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await shell.addAll(SHELL_FILES.map((u) => new Request(u, { cache: "reload" })));
      const assets = await caches.open(ASSETS);
      const missing = [];
      for (const url of PRECACHE.filter(isAsset)) if (!(await assets.match(url))) missing.push(url);
      await assets.addAll(missing);
      const art = await caches.open(ART);
      const needed = [];
      for (const url of ART_FILES) if (!(await art.match(url))) needed.push(url);
      // The art is a nicety: if it can't be fetched now, the app still installs and caches each picture on first use.
      await art.addAll(needed.map((u) => new Request(u, { cache: "reload" }))).catch(() => undefined);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => (k.startsWith("leaves-shell-") && k !== SHELL) || (k.startsWith("leaves-art-") && k !== ART)).map((k) => caches.delete(k)),
      );
      // Keep this release's files and the one before; drop anything older.
      const meta = await caches.open(META);
      const prevRes = await meta.match("/previous-assets.json");
      const previous = prevRes ? await prevRes.json() : [];
      const keep = new Set([...PRECACHE.filter(isAsset), ...previous].map((p) => new URL(p, self.location.origin).href));
      const assets = await caches.open(ASSETS);
      for (const req of await assets.keys()) if (!keep.has(req.url) && !req.url.includes("heic2any")) await assets.delete(req);
      await meta.put("/previous-assets.json", new Response(JSON.stringify(PRECACHE.filter(isAsset))));
      await self.clients.claim();
    })(),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function cachedShell() {
  return (await caches.match("/", { cacheName: SHELL })) || (await caches.match("/"));
}

async function page(req) {
  try {
    const res = await Promise.race([fetch(req), timeout(4000)]);
    const html = (res.headers.get("content-type") || "").includes("text/html");
    if (res.ok && html) {
      const copy = res.clone();
      caches.open(SHELL).then((c) => c.put("/", copy));
      return res;
    }
    // Every address in Leaves is the same app; if the host doesn't know one, open the app anyway.
    return (await cachedShell()) || res;
  } catch {
    return (await cachedShell()) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/licenses/")) return;
  if (req.mode === "navigate") {
    event.respondWith(page(req));
    return;
  }
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          // Only keep what really is the file: a host that answers a missing picture with a page of the app is not a picture.
          const isPage = (res.headers.get("content-type") || "").includes("text/html");
          if (res.ok && !isPage && (isAsset(url.pathname) || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/art/"))) {
            const copy = res.clone();
            const bucket = isAsset(url.pathname) ? ASSETS : url.pathname.startsWith("/art/") ? ART : SHELL;
            caches.open(bucket).then((c) => c.put(req, copy));
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
