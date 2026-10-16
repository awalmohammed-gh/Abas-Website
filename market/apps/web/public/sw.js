/* ABA Mart service worker: Web Push only.
 *
 * It deliberately has no "fetch" handler, so it never caches pages or API
 * responses (including admin data). It shows push notifications and opens
 * store pages when they are clicked.
 */

const FALLBACK_ICON = "/images/brand/aba-mart-logo-transparent.png";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
  const icon = typeof data.icon === "string" && /^(https:\/\/res\.cloudinary\.com\/|\/)/.test(data.icon) ? data.icon : FALLBACK_ICON;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: text(data.body, 300),
      icon,
      badge: FALLBACK_ICON,
      tag: text(data.tag, 64) || undefined,
      data: { url: safeUrl(data.url) },
    }),
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
    })(),
  );
});
