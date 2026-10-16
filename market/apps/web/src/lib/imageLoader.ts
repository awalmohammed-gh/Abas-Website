"use client";

import type { ImageLoaderProps } from "next/image";

/** Cloudinary handles resizing directly; Vercel Services does not serve /_next/image here. */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith("/") && !src.startsWith("//")) {
    // Public assets are served as files. The width query keeps their responsive URLs distinct.
    return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
  }

  const url = new URL(src);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !/^\/[^/]+\/image\/upload\//.test(url.pathname)) {
    throw new Error("Images must use this store's Cloudinary image uploads or local public assets.");
  }
  url.pathname = url.pathname.replace("/image/upload/", `/image/upload/f_auto,c_limit,w_${width},q_${quality ?? 75}/`);
  return url.href;
}
