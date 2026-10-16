/**
 * Serverless entry for Vercel. The web app's /api/[...path] route forwards each request
 * here, so the storefront and API share one origin and the session cookies stay
 * first-party. The request is injected into Express in-process (no network hop). A warm
 * instance reuses the app and the MongoDB connection; server.ts remains the entry for a
 * long-running server.
 */
import type { Express } from "express";
import { inject } from "light-my-request";

/** Defaults derived from the deployment's production URL; explicit variables win. */
function applyVercelDefaults(): void {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!host) return;
  const site = `https://${host}`;
  const defaults: Record<string, string> = {
    CLIENT_ORIGIN: site,
    STOREFRONT_URL: site,
    WEB_REVALIDATE_URL: `${site}/api/revalidate`,
    // One proxy (Vercel) sits in front of the function; requests are first-party HTTPS.
    TRUST_PROXY: "1",
    COOKIE_SECURE: "true",
    COOKIE_SAME_SITE: "lax",
    // Vercel rejects request bodies over 4.5 MB.
    MAX_UPLOAD_MB: "4",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]?.trim()) process.env[key] = value;
  }
}

let ready: Promise<Express> | null = null;

function prepare(): Promise<Express> {
  ready ??= (async () => {
    applyVercelDefaults();
    // Imported only now, so the defaults above are in place before env.ts validates.
    const [{ env }, { connectMongoDB }, { createApp }, { resumePushDeliveries }, { synchronizeEnvironmentAdmin }] = await Promise.all([
      import("./config/env.js"),
      import("../../../config/mongodb.js"),
      import("./app.js"),
      import("./services/pushService.js"),
      import("./services/adminProvisioningService.js"),
    ]);
    await connectMongoDB(env.mongo);
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

// Connection-level headers that must not be copied onto the outgoing Response.
const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding"]);

export async function handleWebRequest(request: Request): Promise<Response> {
  let app: Express;
  try {
    app = await prepare();
  } catch (error) {
    console.error("[api] failed to start:", error instanceof Error ? error.message : error);
    return Response.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "The store is temporarily unavailable. Please try again shortly." } },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const result = await inject(app, {
    method: request.method as "GET",
    url: url.pathname + url.search,
    headers: Object.fromEntries(request.headers),
    // Express trusts one proxy hop (TRUST_PROXY=1) and reads the client IP from X-Forwarded-For.
    remoteAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    payload: hasBody ? Buffer.from(await request.arrayBuffer()) : undefined,
  });

  const headers = new Headers();
  for (const [name, value] of Object.entries(result.headers)) {
    if (value === undefined || HOP_BY_HOP.has(name)) continue;
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, String(item));
  }
  const noBody = request.method === "HEAD" || result.statusCode === 204 || result.statusCode === 304;
  return new Response(noBody ? null : new Uint8Array(result.rawPayload), { status: result.statusCode, headers });
}
