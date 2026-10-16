import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ApiClientError, api, setCsrfToken, setGuestCsrfToken } from "../src/lib/api.ts";

afterEach(() => {
  setCsrfToken(null);
  setGuestCsrfToken(null);
  delete globalThis.window;
});

function pendingResponse(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

test("session reads include cookies and never use the response cache", async (t) => {
  const session = { admin: { name: "Staff" }, csrfToken: "admin-csrf" };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/admin/auth/me"));
    assert.equal(options.credentials, "include");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ success: true, data: session });
  });
  assert.deepEqual(await api.get("/admin/auth/me"), session);
});

test("admin and guest mutations send their own CSRF tokens", async (t) => {
  setCsrfToken("admin-token");
  setGuestCsrfToken("guest-token");
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.headers["X-CSRF-Token"], url.includes("/admin/") ? "admin-token" : "guest-token");
    return Response.json({ success: true, data: {} });
  });
  await api.post("/admin/auth/logout");
  await api.post("/cart/items", { productId: "sample", quantity: 1 });
});

test("unauthenticated responses remain 401 errors for the sign-in redirect", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: false, error: { code: "UNAUTHENTICATED", message: "Please sign in to continue." },
  }, { status: 401 }));
  await assert.rejects(api.get("/admin/auth/me"), (error) =>
    error instanceof ApiClientError && error.status === 401 && error.code === "UNAUTHENTICATED");
});

test("server failures preserve their message instead of reporting an expired session", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: false, error: { code: "SERVER_ERROR", message: "The store is temporarily unavailable." },
  }, { status: 503 }));
  await assert.rejects(api.get("/admin/auth/me"), { status: 503, code: "SERVER_ERROR", message: "The store is temporarily unavailable." });
});

test("offline connections report a retryable network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  await assert.rejects(api.get("/admin/auth/me"), { code: "NETWORK_ERROR", status: 0 });
});

test("a stalled connection ends after twenty seconds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", (_, options) => pendingResponse(options.signal));
  const request = api.get("/admin/auth/me");
  const rejection = assert.rejects(request, { code: "REQUEST_TIMEOUT", status: 0 });
  t.mock.timers.tick(20_000);
  await rejection;
});

test("the timeout also covers a stalled response body", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let bodyStarted;
  const started = new Promise((resolve) => { bodyStarted = resolve; });
  t.mock.method(globalThis, "fetch", async (_, options) => ({
    json: () => { bodyStarted(); return pendingResponse(options.signal); },
  }));
  const rejection = assert.rejects(api.get("/admin/auth/me"), { code: "REQUEST_TIMEOUT" });
  await started;
  t.mock.timers.tick(20_000);
  await rejection;
});

test("unmount cancellation stays an AbortError instead of showing a timeout", async (t) => {
  t.mock.method(globalThis, "fetch", (_, options) => pendingResponse(options.signal));
  const controller = new AbortController();
  const rejection = assert.rejects(api.get("/admin/auth/me", controller.signal), { name: "AbortError" });
  controller.abort();
  await rejection;
});

test("completed requests clear their timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  t.mock.method(globalThis, "fetch", async (_, options) => {
    signal = options.signal;
    return Response.json({ success: true, data: {} });
  });
  await api.get("/admin/auth/me");
  t.mock.timers.tick(20_000);
  assert.equal(signal.aborted, false);
});

for (const host of ["127.0.0.1", "192.168.1.20"]) {
  test(`local API calls use the page host when opened on ${host}`, async (t) => {
    globalThis.window = { location: { hostname: host } };
    t.mock.method(globalThis, "fetch", async (url) => {
      assert.equal(new URL(url).hostname, host);
      return Response.json({ success: true, data: {} });
    });
    await api.get("/admin/auth/me");
  });
}
