import { PWA_APPS, type PwaApp } from "./pwa";

let documentApp: PwaApp | undefined;

/** Keep Safari's metadata consistent without removing nodes owned by React. */
export function syncPwaHead(app: PwaApp): void {
  const config = PWA_APPS[app];
  const sync = (tag: "link" | "meta", selector: string, attributes: Record<string, string>) => {
    const matches = document.head.querySelectorAll(selector);
    const elements = matches.length ? Array.from(matches) : [document.createElement(tag)];
    for (const element of elements) {
      for (const [key, value] of Object.entries(attributes)) {
        if (element.getAttribute(key) !== value) element.setAttribute(key, value);
      }
      if (!element.parentNode) document.head.appendChild(element);
    }
  };
  sync("link", 'link[rel="manifest"]', { rel: "manifest", href: config.manifest });
  sync("link", 'link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]', {
    rel: "apple-touch-icon", href: config.icon, sizes: "180x180", type: "image/png",
  });
  sync("meta", 'meta[name="apple-mobile-web-app-title"]', { name: "apple-mobile-web-app-title", content: config.title });
  sync("meta", 'meta[name="apple-mobile-web-app-capable"]', { name: "apple-mobile-web-app-capable", content: "yes" });
  sync("meta", 'meta[name="mobile-web-app-capable"]', { name: "mobile-web-app-capable", content: "yes" });
  sync("meta", 'meta[name="apple-mobile-web-app-status-bar-style"]', { name: "apple-mobile-web-app-status-bar-style", content: config.statusBar });
}

/** One document reload per app boundary; same-app navigation stays inside Next.js. */
export function ensurePwaApp(app: PwaApp): boolean {
  const crossedBoundary = documentApp !== undefined && documentApp !== app;
  documentApp = app;
  syncPwaHead(app);
  if (crossedBoundary) window.location.reload();
  return crossedBoundary;
}
