"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * PwaManifestManager ensures the correct web app manifest is active in `<head>`
 * depending on whether the user is browsing the customer storefront or the admin portal.
 *
 * It also registers the service worker upon mount and ensures that any navigation
 * between the storefront and the admin portal executes as a full page reload so
 * mobile and desktop browsers (Chrome, Edge, Samsung Internet) cleanly re-evaluate
 * the active manifest and fire the dedicated `beforeinstallprompt` event.
 */
export function PwaManifestManager() {
  const pathname = usePathname();
  const prevIsAdmin = useRef<boolean | null>(null);

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    const targetManifest = isAdmin ? "/admin-manifest.json" : "/manifest.json";

    // 1. Ensure the manifest link in <head> points to the target manifest
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = targetManifest;
      document.head.appendChild(manifestLink);
    } else if (manifestLink.getAttribute("href") !== targetManifest) {
      manifestLink.setAttribute("href", targetManifest);
    }

    // 2. If client-side navigation crossed the store <-> admin boundary, force a clean full-page reload
    if (prevIsAdmin.current !== null && prevIsAdmin.current !== isAdmin) {
      window.location.reload();
      return;
    }
    prevIsAdmin.current = isAdmin;

    // 3. Register the service worker early so installability criteria are satisfied
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // SW registration failures (e.g. offline or private browsing) fail silently
        });
    }
  }, [pathname]);

  // 4. Intercept clicks on links that cross the /admin boundary to enforce full page load
  useEffect(() => {
    function handleBoundaryClicks(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest("a");
      if (!target || !target.href) return;

      const url = new URL(target.href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      const currentIsAdmin = window.location.pathname.startsWith("/admin");
      const targetIsAdmin = url.pathname.startsWith("/admin");

      if (currentIsAdmin !== targetIsAdmin) {
        event.preventDefault();
        window.location.assign(url.href);
      }
    }

    document.addEventListener("click", handleBoundaryClicks, { capture: true });
    return () => document.removeEventListener("click", handleBoundaryClicks, { capture: true });
  }, []);

  return null;
}
