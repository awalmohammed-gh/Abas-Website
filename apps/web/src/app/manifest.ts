import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getMetadataSettings } from "@/lib/catalog";

/**
 * Web app manifest. Besides "Add to Home Screen", iPhone and iPad require an
 * installed web app before they offer Web Push notifications.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getMetadataSettings();
  const icon = settings.favicon
    ? { src: settings.favicon.url, sizes: "512x512", type: "image/png" }
    : { src: "/images/brand/aba-mart-logo-transparent.png", sizes: "1448x1086", type: "image/png" };
  return {
    name: settings.storeName,
    short_name: settings.storeName.slice(0, 12),
    description: settings.storeDescription || siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF8F3",
    theme_color: "#174C3C",
    icons: [icon],
  };
}
