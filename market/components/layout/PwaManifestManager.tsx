"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isAdminPath } from "@/lib/pwa";
import { ensurePwaApp, syncPwaHead } from "@/lib/pwaHead";

export function PwaManifestManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/order-preview/")) return;
    const app = isAdminPath(pathname) ? "admin" : "store";
    if (ensurePwaApp(app)) return;
    // Streamed metadata must not leave the other app's icon or title behind.
    const observer = new MutationObserver(() => syncPwaHead(app));
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "content", "rel"] });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    }
  }, []);

  return null;
}
