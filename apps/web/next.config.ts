import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

// market/.env is the project's only env file; the API reads it too. Variables set by
// the host win, and PORT/NODE_ENV belong to the API (Next.js sets its own).
const sharedEnvFile = join(__dirname, "../../.env");
if (existsSync(sharedEnvFile)) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync(sharedEnvFile, "utf8")))) {
    if (value && process.env[key] === undefined && key !== "PORT" && key !== "NODE_ENV") process.env[key] = value;
  }
}

// Only images from this store's Cloudinary account may be optimised.
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The dev server only serves its scripts to localhost; any other host gets a page
  // that never hydrates (stuck spinners). Add LAN addresses for phone testing with
  // ALLOWED_DEV_ORIGINS, and add the same origins to the API's CLIENT_ORIGIN.
  allowedDevOrigins: [
    "127.0.0.1",
    ...(process.env.ALLOWED_DEV_ORIGINS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
  ],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: cloudName ? `/${cloudName}/image/upload/**` : "/**",
      },
    ],
    qualities: [75, 90],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Always revalidate the service worker so fixes reach browsers promptly.
      { source: "/sw.js", headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      ] },
      { source: "/order-preview/:path*", headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        { key: "Cache-Control", value: "private, no-store" },
      ] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
