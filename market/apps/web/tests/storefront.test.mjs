import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import imageLoader from "../src/lib/imageLoader.ts";
import { catalogCacheLife, fetchCatalogApi, getServerApiUrl } from "../src/lib/catalogTransport.ts";

const originalEnv = { ...process.env };
afterEach(() => {
  for (const key of ["API_SERVICE_URL", "API_INTERNAL_URL", "NEXT_PUBLIC_API_URL", "NEXT_PHASE", "VERCEL", "VERCEL_ENV"]) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test("uploaded images use responsive Cloudinary delivery without the broken optimizer route", () => {
  const src = "https://res.cloudinary.com/test-cloud/image/upload/v123/aba-mart/banners/hero.png";
  const url = imageLoader({ src, width: 640, quality: 90 });
  assert.equal(url, "https://res.cloudinary.com/test-cloud/image/upload/f_auto,c_limit,w_640,q_90/v123/aba-mart/banners/hero.png");
  assert.ok(!url.includes("/_next/image"));
  assert.equal(imageLoader({ src: "/images/brand/logo.png", width: 96 }), "/images/brand/logo.png?w=96");
  assert.throws(() => imageLoader({ src: "https://untrusted.example/hero.jpg", width: 640 }));
});

test("API bindings are resolved when a request runs, rather than frozen at build time", () => {
  delete process.env.API_SERVICE_URL;
  process.env.API_INTERNAL_URL = "http://localhost:5000/api";
  assert.equal(getServerApiUrl(), "http://localhost:5000/api");
  process.env.API_SERVICE_URL = "https://api.internal.example/";
  assert.equal(getServerApiUrl(), "https://api.internal.example/api");
});

test("a temporary API failure retries and returns the saved catalogue", async (t) => {
  delete process.env.NEXT_PHASE;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.cache, "no-store");
    calls += 1;
    return calls === 1
      ? Response.json({ success: false }, { status: 503 })
      : Response.json({ success: true, data: [{ id: "saved-banner" }] });
  });
  assert.deepEqual(await fetchCatalogApi("/banners"), { ok: true, data: [{ id: "saved-banner" }] });
  assert.equal(calls, 2);
});

test("an interrupted cold-start request can recover on the next attempt", async (t) => {
  delete process.env.NEXT_PHASE;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    if (++calls === 1) throw new DOMException("Timed out", "TimeoutError");
    return Response.json({ success: true, data: ["saved-category"] });
  });
  assert.deepEqual(await fetchCatalogApi("/categories"), { ok: true, data: ["saved-category"] });
  assert.equal(calls, 2);
});

test("missing data does not retry and unavailable data remains distinguishable", async (t) => {
  delete process.env.NEXT_PHASE;
  t.mock.method(console, "error", () => {});
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false }, { status: 404 }));
  assert.deepEqual(await fetchCatalogApi("/products/missing"), { ok: false, status: 404 });
  assert.equal(fetch.mock.callCount(), 1);
});

test("preview builds skip unreachable APIs and their empty result revalidates immediately", async (t) => {
  process.env.NEXT_PHASE = "phase-production-build";
  process.env.VERCEL = "1";
  process.env.VERCEL_ENV = "preview";
  const fetch = t.mock.method(globalThis, "fetch", () => assert.fail("A preview build must not call another deployment"));
  const result = await fetchCatalogApi("/categories");
  assert.deepEqual(result, { ok: false, status: 0 });
  assert.equal(fetch.mock.callCount(), 0);
  assert.deepEqual(catalogCacheLife(result, true), { stale: 30, revalidate: 1, expire: 300 });
  assert.equal(catalogCacheLife(result, false), "seconds");
  assert.equal(catalogCacheLife({ ok: true, data: [] }, false), "minutes");
});
