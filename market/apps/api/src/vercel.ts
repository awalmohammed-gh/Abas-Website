/**
 * Entry for the `api` service on Vercel (see market/vercel.json). Vercel routes public
 * /api/* requests here with the original path, so the routes in app.ts match unchanged.
 * A warm instance reuses the app and the MongoDB connection; server.ts remains the entry
 * for a long-running server.
 */
import express, { type Express } from "express";

/** Defaults for a Vercel deployment; explicitly set variables win. */
function applyVercelDefaults(): void {
  // Production answers on the project's domain; a preview on its own deployment URL.
  const { VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL, VERCEL_BRANCH_URL } = process.env;
  const primary = VERCEL_ENV === "production" ? VERCEL_PROJECT_PRODUCTION_URL : VERCEL_URL;
  const hosts = [...new Set([primary, VERCEL_URL, VERCEL_BRANCH_URL].filter(Boolean))];
  const site = primary ? `https://${primary}` : undefined;
  const defaults: Record<string, string | undefined> = {
    CLIENT_ORIGIN: hosts.map((host) => `https://${host}`).join(",") || undefined,
    STOREFRONT_URL: site,
    // Public: vercel.json routes /api/revalidate to the web service. (Vercel rejects a binding
    // back to `web` because `web` already binds to `api`.) Protected previews answer 401, and
    // their pages refresh on the normal cache schedule instead.
    WEB_REVALIDATE_URL: site && `${site}/api/revalidate`,
    // One proxy (Vercel) sits in front of the function; requests are first-party HTTPS.
    TRUST_PROXY: "1",
    COOKIE_SECURE: "true",
    COOKIE_SAME_SITE: "lax",
    // Vercel rejects request bodies over 4.5 MB.
    MAX_UPLOAD_MB: "4",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (value && !process.env[key]?.trim()) process.env[key] = value;
  }
}

let ready: Promise<Express> | null = null;

async function prepare(): Promise<Express> {
  applyVercelDefaults();
  // Modules stay cached, but a database connection can drop while a function is idle.
  // Check it on every request, including requests to an already-prepared app.
  const [{ env }, { connectMongoDB }, { createApp }, { resumePushDeliveries }, { synchronizeEnvironmentAdmin }] = await Promise.all([
    import("./config/env.js"),
    import("../../../config/mongodb.js"),
    import("./app.js"),
    import("./services/pushService.js"),
    import("./services/adminProvisioningService.js"),
  ]);
  await connectMongoDB(env.mongo);

  ready ??= (async () => {
    await synchronizeEnvironmentAdmin(env.admin);
    // Finish any push deliveries a previous instance left unfinished.
    resumePushDeliveries();
    return createApp();
  })().catch((error: unknown) => {
    ready = null; // retry on the next request
    throw error;
  });
  return ready;
}

const app = express();

app.use((req, res, next) => {
  prepare().then(
    (api) => api(req, res, next),
    (error: unknown) => {
      console.error("[api] failed to start:", error instanceof Error ? error.message : error);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Retry-After", "5");
      res.status(503).json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "The store is temporarily unavailable. Please try again shortly." } });
    },
  );
});

export default app;
