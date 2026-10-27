import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

function worker(windows = []) {
  const handlers = new Map();
  const shown = [];
  const opened = [];
  runInNewContext(source, {
    URL,
    self: {
      location: { origin: "https://store.example" },
      addEventListener: (name, handler) => handlers.set(name, handler),
      registration: { showNotification: async (title, options) => shown.push({ title, options }) },
      clients: { matchAll: async () => windows, openWindow: async (url) => opened.push(url) },
    },
  });
  const click = async (url) => {
    let completion;
    handlers.get("notificationclick")({ notification: { close() {}, data: { url } }, waitUntil: (promise) => { completion = promise; } });
    await completion;
  };
  return { handlers, shown, opened, click };
}

test("customer push clicks focus the storefront without navigating an open admin app", async () => {
  const navigated = [];
  const admin = { url: "https://store.example/admin/orders", focus: async () => assert.fail("Admin app must not be focused"), navigate: async () => assert.fail("Admin app must not be navigated") };
  const store = { url: "https://store.example/products", focus: async () => {}, navigate: async (url) => navigated.push(url) };
  const app = worker([admin, store]);
  await app.click("/my-orders?order=123");
  assert.deepEqual(navigated, ["https://store.example/my-orders?order=123"]);
  assert.equal(app.opened.length, 0);
});

test("customer notifications open a store window when only an admin app is running", async () => {
  const app = worker([{ url: "https://store.example/admin", focus: async () => assert.fail("Keep the admin app untouched") }]);
  await app.click("/my-orders");
  assert.deepEqual(app.opened, ["https://store.example/my-orders"]);
});

test("push destinations cannot escape the store origin or enter the admin portal", async () => {
  const app = worker();
  for (const url of ["https://evil.example", "//evil.example", "/admin/orders", "/\\evil.example"]) {
    await app.click(url);
  }
  assert.deepEqual(app.opened, Array(4).fill("https://store.example/"));
});
