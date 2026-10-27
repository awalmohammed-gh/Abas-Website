export type PwaApp = "store" | "admin";

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    || window.matchMedia("(display-mode: standalone)").matches;
}

/** Safari, including iPadOS's desktop user agent, before Home Screen installation. */
export function isIosSafari(): boolean {
  return typeof window !== "undefined" && isIosDevice() && !isStandalone()
    && /Safari/i.test(navigator.userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA/i.test(navigator.userAgent);
}

export const PWA_APPS = {
  store: { title: "ABA Mart", manifest: "/manifest.json", icon: "/icons/store-apple-icon-180.png", statusBar: "default" },
  admin: { title: "ABA Admin", manifest: "/admin-manifest.json", icon: "/icons/admin-apple-icon-180.png", statusBar: "black-translucent" },
} as const;
