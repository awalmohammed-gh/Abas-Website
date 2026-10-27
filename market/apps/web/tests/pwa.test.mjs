import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { isAdminPath, isIosDevice, isIosSafari, isStandalone } from "../src/lib/pwa.ts";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

afterEach(() => {
  for (const [key, descriptor] of [["window", originalWindow], ["navigator", originalNavigator]]) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

function browser({ userAgent = "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", platform = "iPhone", maxTouchPoints = 5, standalone = false, displayMode = false } = {}) {
  const navigator = { userAgent, platform, maxTouchPoints, standalone };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: navigator });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { navigator, matchMedia: () => ({ matches: displayMode }) } });
}

test("iPhone Safari gets installation guidance before installation", () => {
  browser();
  assert.equal(isIosDevice(), true);
  assert.equal(isIosSafari(), true);
  assert.equal(isStandalone(), false);
});

test("iPadOS desktop user agent is recognized without treating desktop Macs as iPads", () => {
  const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15";
  browser({ userAgent, platform: "MacIntel" });
  assert.equal(isIosSafari(), true);
  browser({ userAgent, platform: "MacIntel", maxTouchPoints: 0 });
  assert.equal(isIosDevice(), false);
  assert.equal(isIosSafari(), false);
});

test("both standalone signals suppress iOS installation invitations", () => {
  browser({ standalone: true });
  assert.equal(isStandalone(), true);
  assert.equal(isIosSafari(), false);
  browser({ displayMode: true });
  assert.equal(isStandalone(), true);
  assert.equal(isIosSafari(), false);
});

test("other iOS browsers are not incorrectly given automatic Safari instructions", () => {
  browser({ userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1" });
  assert.equal(isIosDevice(), true);
  assert.equal(isIosSafari(), false);
});

test("the admin boundary includes login and dashboard routes, but not similar names", () => {
  for (const path of ["/admin", "/admin/login", "/admin/orders"]) assert.equal(isAdminPath(path), true);
  for (const path of ["/", "/administrator", "/administer", "/order-preview/token"]) assert.equal(isAdminPath(path), false);
});

test("both Apple icons are real opaque 180px PNGs with distinct artwork", async () => {
  const store = await readFile(new URL("../public/icons/store-apple-icon-180.png", import.meta.url));
  const admin = await readFile(new URL("../public/icons/admin-apple-icon-180.png", import.meta.url));
  for (const buffer of [store, admin]) {
    const metadata = await sharp(buffer).metadata();
    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, 180);
    assert.equal(metadata.height, 180);
    assert.equal(metadata.hasAlpha, false);
  }
  assert.notDeepEqual(store, admin);
});

test("store and admin retain distinct standalone launch identities and correct scopes", async () => {
  const store = JSON.parse(await readFile(new URL("../public/manifest.json", import.meta.url)));
  const admin = JSON.parse(await readFile(new URL("../public/admin-manifest.json", import.meta.url)));
  assert.equal(store.start_url, "/");
  assert.equal(store.scope, "/");
  assert.equal(admin.start_url, "/admin");
  assert.equal(admin.scope, "/admin");
  assert.notEqual(store.id, admin.id);
  for (const manifest of [store, admin]) assert.equal(manifest.display, "standalone");
});
