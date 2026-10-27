/* ABA Mart service worker: Dual PWA Installability & Web Push.
 *
 * Designed to satisfy browser installability criteria (Chrome/Android WebAPK,
 * Edge, Safari) while preserving existing Web Push notification listeners.
 *
 * Dynamic data (API requests, cart prices, inventory, Next.js RSC flights,
 * guest sessions, and CSRF tokens) are NEVER cached so store data is always
 * 100% fresh. Only immutable static assets (icons/images) are cached.
 */

const STATIC_CACHE = "aba-mart-static-v2";
const FALLBACK_ICON = "/images/brand/aba-mart-logo-transparent.png";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Safe minimal fetch listener for PWA installability
self.addEventListener("fetch", (event) => {
  // 1. Immediately ignore non-GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 2. Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // 3. Immediately ignore /api/*, RSC flights, and manifests so dynamic data is never stale
  if (
    url.pathname.startsWith("/api/") ||
    url.searchParams.has("_rsc") ||
    event.request.headers.get("RSC") === "1" ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/admin-manifest.json"
  ) {
    return;
  }

  // 4. Cache-first strategy ONLY for immutable static assets
  const isStaticAsset =
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/favicon.ico";

  if (isStaticAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response && response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return cached || new Response("", { status: 404 });
        }
      })
    );
    return;
  }

  // 5. Navigation (HTML) requests: Network-first with a clean offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        return new Response(
          `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline — ABA Mart</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #FAF8F3;
      color: #174C3C;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: white;
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      max-width: 26rem;
      box-shadow: 0 10px 25px -5px rgba(23, 76, 60, 0.08);
      border: 1px solid #E5E1D8;
    }
    h1 {
      font-size: 1.5rem;
      margin: 1rem 0 0.5rem;
      color: #174C3C;
    }
    p {
      color: #556B64;
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0 0 1.5rem;
    }
    button {
      background: #174C3C;
      color: white;
      border: none;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 0.75rem 1.75rem;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#174C3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto;">
      <line x1="1" y1="1" x2="23" y2="23"></line>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
      <line x1="12" y1="20" x2="12.01" y2="20"></line>
    </svg>
    <h1>You are currently offline</h1>
    <p>Please check your internet connection to continue browsing ABA Mart.</p>
    <button onclick="window.location.reload()">Retry Connection</button>
  </div>
</body>
</html>`,
          {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }
        );
      })
    );
    return;
  }
});

/** Only same-origin store pages may be opened. Anything else falls back to the home page. */
function safeUrl(value) {
  try {
    if (typeof value !== "string" || !/^\/(?![/\\])/.test(value)) return "/";
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin || /^\/admin(\/|$)/i.test(url.pathname)) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

function text(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "" };
  }
  const title = text(data.title, 80) || "ABA Mart";
  const icon =
    typeof data.icon === "string" && /^(https:\/\/res\.cloudinary\.com\/|\/)/.test(data.icon)
      ? data.icon
      : FALLBACK_ICON;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: text(data.body, 300),
      icon,
      badge: FALLBACK_ICON,
      tag: text(data.tag, 64) || undefined,
      data: { url: safeUrl(data.url) },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(safeUrl(event.notification.data && event.notification.data.url), self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) return client.navigate(target);
          return undefined;
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
