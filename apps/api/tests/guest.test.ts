import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Category } from "../src/models/Category.js";
import { CustomerSession } from "../src/models/CustomerSession.js";
import { Order } from "../src/models/Order.js";
import { Product } from "../src/models/Product.js";
import { Settings } from "../src/models/Settings.js";
import { CUSTOMER_COOKIE } from "../src/services/customerSessionService.js";
import { ORIGIN, guestVisitor, ownedImage, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";

const app = createApp();
const customer = { name: "Ama Mensah", phone: "0278857814", fulfillmentMethod: "pickup" };
let a: Awaited<ReturnType<typeof guestVisitor>>;
let b: Awaited<ReturnType<typeof guestVisitor>>;
let productId: string;
const items = () => [{ productId, quantity: 2 }];
const body = (extra = {}) => ({ idempotencyKey: randomUUID(), customer, items: items(), ...extra });
async function prepare(extra = {}) {
  await a.put("/api/cart", { items: items() }).expect(200);
  return a.post("/api/orders/whatsapp", body(extra)).expect(201);
}

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  await resetDatabase();
  await Settings.create({ key: "store", storeName: "ABA Mart", whatsappNumber: "233278857814" });
  const category = await Category.create({ name: "Essentials", slug: "essentials" });
  const product = await Product.create({ name: "Liquid soap", slug: "liquid-soap", category: category._id, price: 700, stock: 10 });
  productId = product.id;
  [a, b] = await Promise.all([guestVisitor(app), guestVisitor(app)]);
});

describe("private guest sessions and carts", () => {
  it("uses an unpredictable HTTP-only cookie and stores its hash only", async () => {
    const response = await request(app).get("/api/customer/session").set("Origin", ORIGIN).expect(200);
    const cookie = (response.headers["set-cookie"] as unknown as string[]).find((value) => value.startsWith(`${CUSTOMER_COOKIE}=`))!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/api");
    const raw = cookie.split(";")[0]!.split("=")[1]!;
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(await CustomerSession.find().lean())).not.toContain(raw);
    expect(response.body.data).not.toHaveProperty("sessionId");
    expect(response.headers["cache-control"]).toContain("no-store");
  });

  it("isolates two browser profiles and ignores client prices and ownership fields", async () => {
    await a.post("/api/cart/items", { productId, quantity: 2, price: 1, customerId: "someone-else", sessionId: b.csrf }).expect(200);
    const own = await a.get("/api/cart").expect(200);
    expect(own.body.data).toMatchObject({ total: 1400, itemCount: 2 });
    expect((await b.get("/api/cart").expect(200)).body.data.lines).toEqual([]);
    const resumed = await a.get("/api/cart").expect(200);
    expect(resumed.body.data.lines[0].quantity).toBe(2);
  });

  it("rejects missing CSRF, foreign origins, forged cookies and forged CSRF", async () => {
    await a.agent.post("/api/cart/items").set("Origin", ORIGIN).send({ productId, quantity: 1 }).expect(403);
    await a.agent.post("/api/cart/items").set("Origin", "https://evil.example").set("X-CSRF-Token", a.csrf).send({ productId, quantity: 1 }).expect(403);
    await request(app).get("/api/cart").set("Cookie", `${CUSTOMER_COOKIE}=${"a".repeat(43)}`).expect(401);
    await a.agent.delete("/api/cart").set("Origin", ORIGIN).set("X-CSRF-Token", b.csrf).expect(403);
    await a.get("/api/admin/orders").expect(401);
  });

  it("validates variants, stock and quantities before saving a change", async () => {
    await a.post("/api/cart/items", { productId, quantity: 11 }).expect(409);
    await a.post("/api/cart/items", { productId, quantity: 0 }).expect(400);
    await a.post("/api/cart/items", { productId, quantity: 1, variantId: "a".repeat(24) }).expect(409);
    expect((await a.get("/api/cart")).body.data.lines).toEqual([]);
    await a.post("/api/cart/items", { productId, quantity: 2 }).expect(200);
    await Product.updateOne({ _id: productId }, { $set: { stock: 1 } });
    expect((await a.get("/api/cart")).body.data.lines[0].status).toBe("quantity_adjusted");
    await a.patch(`/api/cart/items/${productId}:base`, { quantity: 1 }).expect(200);
    expect((await a.get("/api/cart")).body.data.hasIssues).toBe(false);
  });

  it("preserves simultaneous additions from two tabs", async () => {
    const results = await Promise.all([1, 2, 3].map(() => a.post("/api/cart/items", { productId, quantity: 1 })));
    expect(results.map((result) => result.status)).toEqual([200, 200, 200]);
    expect((await a.get("/api/cart")).body.data.itemCount).toBe(3);
  });
});

describe("private WhatsApp requests and handoff", () => {
  it("prepares a guest order, preserves the cart until handoff, and stays WhatsApp Pending", async () => {
    const prepared = await prepare();
    const order = prepared.body.data.order;
    expect(prepared.body.data.whatsappUrl).toMatch(/^https:\/\/wa.me\/233278857814\?/);
    expect((await a.get("/api/cart")).body.data.itemCount).toBe(2);
    expect(order.status).toBe("WhatsApp Pending");
    expect((await Product.findById(productId))!.stock).toBe(10);
    const history = await a.get("/api/my-orders").expect(200);
    expect(history.body.data.items[0]).toMatchObject({ id: order.id, checkoutHandoffStatus: "prepared", customer: { phone: "233278857814" } });
    expect(history.body.data.items[0]).not.toHaveProperty("statusHistory");
    expect(history.body.data.items[0]).not.toHaveProperty("guestSession");
    expect(history.headers["cache-control"]).toContain("no-store");
    await b.post("/api/cart/items", { productId, quantity: 1 }).expect(200);
    await a.post(`/api/my-orders/${order.id}/handoff`).expect(200);
    expect((await a.get("/api/cart")).body.data.itemCount).toBe(0);
    expect((await b.get("/api/cart")).body.data.itemCount).toBe(1);
    expect((await a.get(`/api/my-orders/${order.id}`)).body.data.status).toBe("WhatsApp Pending");
    expect((await Product.findById(productId))!.stock).toBe(10);
  });

  it("rejects another customer's list, detail, handoff and idempotency-key access", async () => {
    const key = randomUUID();
    const order = (await prepare({ idempotencyKey: key })).body.data.order;
    expect((await b.get("/api/my-orders")).body.data.items).toEqual([]);
    await b.get(`/api/my-orders/${order.id}`).expect(404);
    await b.post(`/api/my-orders/${order.id}/handoff`).expect(404);
    await b.post("/api/orders/whatsapp", body({ idempotencyKey: key })).expect(409);
    await request(app).get(`/api/my-orders/${order.id}`).expect(401);
    await b.get(`/api/my-orders/${order.id}?phone=0278857814&sessionId=${a.csrf}`).expect(404);
  });

  it("preserves cart contents after failed validation, price changes or stale cart input", async () => {
    await a.put("/api/cart", { items: items() }).expect(200);
    await a.post("/api/orders/whatsapp", body({ customer: { ...customer, phone: "123" } })).expect(400);
    await a.post("/api/orders/whatsapp", body({ expectedTotal: 1 })).expect(409);
    await a.post("/api/orders/whatsapp", body({ items: [{ productId, quantity: 1 }] })).expect(409);
    expect((await a.get("/api/cart")).body.data.itemCount).toBe(2);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("retries the same handoff without duplicate orders or clearing newly added items twice", async () => {
    const key = randomUUID();
    const order = (await prepare({ idempotencyKey: key })).body.data.order;
    await a.post("/api/cart/items", { productId, quantity: 1 }).expect(200);
    await a.post(`/api/my-orders/${order.id}/handoff`).expect(200);
    expect((await a.get("/api/cart")).body.data.itemCount).toBe(1);
    await a.post(`/api/my-orders/${order.id}/handoff`).expect(200);
    expect((await a.get("/api/cart")).body.data.itemCount).toBe(1);
    const replay = await a.post("/api/orders/whatsapp", body({ idempotencyKey: key })).expect(200);
    expect(replay.body.data.replayed).toBe(true);
    expect(await Order.countDocuments()).toBe(1);
  });

  it("keeps product snapshots and shows only actual backend statuses", async () => {
    const order = (await prepare()).body.data.order;
    await Product.updateOne({ _id: productId }, { $set: { name: "Renamed soap", price: 2000 } });
    const saved = (await a.get(`/api/my-orders/${order.id}`)).body.data;
    expect(saved.items[0]).toMatchObject({ name: "Liquid soap", unitPrice: 700 });
    await Order.updateOne({ _id: order.id }, { $set: { status: "Cancelled" } });
    expect((await a.get(`/api/my-orders/${order.id}`)).body.data).toMatchObject({ status: "Cancelled", whatsappUrl: null });
    await a.post(`/api/my-orders/${order.id}/handoff`).expect(409);
  });
});

describe("cookie loss, expiration, reset and private recovery", () => {
  it("does not recover private history by phone or order reference after cookie removal", async () => {
    const order = (await prepare()).body.data.order;
    const fresh = await guestVisitor(app);
    expect((await fresh.get(`/api/my-orders?phone=${customer.phone}&orderReference=${order.orderReference}`)).body.data.items).toEqual([]);
    expect((await fresh.get("/api/cart")).body.data.lines).toEqual([]);
    await fresh.get(`/api/my-orders/${order.id}`).expect(404);
  });

  it("enforces session expiry even before MongoDB's TTL cleanup runs", async () => {
    const order = (await prepare()).body.data.order;
    await CustomerSession.updateMany({}, { $set: { expiresAt: new Date(0) } });
    await a.get("/api/cart").expect(401);
    await a.get(`/api/my-orders/${order.id}`).expect(401);
    const next = await a.agent.get("/api/customer/session").expect(200);
    a.setCsrf(next.body.data.csrfToken);
    expect((await a.get("/api/my-orders")).body.data.items).toEqual([]);
  });

  it("resets only this visit and revokes the previous cookie", async () => {
    const order = (await prepare()).body.data.order;
    const previous = await a.agent.get("/api/customer/session").expect(200);
    const oldCsrf = previous.body.data.csrfToken;
    const reset = await a.post("/api/customer/session/reset").expect(200);
    a.setCsrf(reset.body.data.csrfToken);
    expect(reset.body.data.csrfToken).not.toBe(oldCsrf);
    expect((await a.get("/api/cart")).body.data.lines).toEqual([]);
    await a.get(`/api/my-orders/${order.id}`).expect(404);
    await b.get("/api/cart").expect(200);
    await a.agent.delete("/api/cart").set("Origin", ORIGIN).set("X-CSRF-Token", oldCsrf).expect(403);
  });

  it("recovers only with a strong one-use code and rotates the session without merging orders", async () => {
    const order = (await prepare()).body.data.order;
    const recovery = (await a.post("/api/customer/recovery-token").expect(200)).body.data;
    expect(JSON.stringify(await CustomerSession.find().lean())).not.toContain(recovery.token);
    await b.post("/api/customer/recover", { token: "x".repeat(43) }).expect(400);
    const restored = await b.post("/api/customer/recover", { token: recovery.token }).expect(200);
    b.setCsrf(restored.body.data.csrfToken);
    expect((await b.get("/api/my-orders")).body.data.items[0].id).toBe(order.id);
    expect((await b.get("/api/cart")).body.data.itemCount).toBe(2);
    await a.get(`/api/my-orders/${order.id}`).expect(401);
    await b.post("/api/customer/recover", { token: recovery.token }).expect(400);
  });
});

describe("image-rich shared order previews", () => {
  const tokenFrom = (url: string) => new URL(url).pathname.split("/").pop()!;

  it("uses MongoDB image snapshots, ignores client image URLs, and shares only product details", async () => {
    const image = ownedImage("liquid-soap");
    await Product.updateOne({ _id: productId }, { $set: { images: [image] } });
    const prepared = await prepare({ items: [{ productId, quantity: 2, image: "https://evil.example/fake.jpg", unitPrice: 1 }] });
    const { message, previewUrl, whatsappUrl, order } = prepared.body.data;
    expect(message).toContain(`Image: ${image.url}`);
    expect(message).not.toContain("evil.example");
    expect(message).toContain(`View all products with images:\n${previewUrl}`);
    expect(decodeURIComponent(whatsappUrl.split("?text=")[1])).toBe(message);
    const token = tokenFrom(previewUrl);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(await Order.findById(order.id).lean())).not.toContain(token);
    const response = await request(app).get(`/api/orders/preview/${token}`).expect(200);
    const preview = response.body.data;
    expect(preview).toMatchObject({ orderReference: order.orderReference, total: 1400, items: [{ name: "Liquid soap", image: image.url, quantity: 2, unitPrice: 700, lineTotal: 1400 }] });
    expect(Object.keys(preview).sort()).toEqual(["storeName", "orderReference", "items", "total", "createdAt", "expiresAt"].sort());
    expect(Object.keys(preview.items[0]).sort()).toEqual(["name", "image", "attributes", "quantity", "unitPrice", "lineTotal"].sort());
    expect(JSON.stringify(preview)).not.toContain(customer.name);
    expect(JSON.stringify(preview)).not.toContain("233278857814");
    expect(JSON.stringify(preview)).not.toContain(order.id);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-robots-tag"]).toContain("noindex");
    await b.get(`/api/my-orders/${order.id}`).expect(404);
    await a.post(`/api/my-orders/${order.id}/handoff`).expect(200);
    expect((await a.get("/api/cart")).body.data.itemCount).toBe(0);
    expect((await a.get(`/api/my-orders/${order.id}`)).body.data.status).toBe("WhatsApp Pending");
  });

  it("keeps distinct images, variants and prices after product edits", async () => {
    const soap = ownedImage("soap");
    const teeImage = ownedImage("tee");
    const original = await Product.findById(productId);
    await Product.updateOne({ _id: productId }, { $set: { images: [soap] } });
    const tee = await Product.create({ name: "Graphic T-shirt", slug: "graphic-tee", category: original!.category, price: 8000, images: [teeImage], options: [{ name: "Size", values: ["Large"] }], variants: [{ attributes: [{ name: "Size", value: "Large" }], stock: 4 }] });
    const twoItems = [{ productId, quantity: 2 }, { productId: tee.id, variantId: tee.variants[0]!._id.toString(), quantity: 1 }];
    await a.put("/api/cart", { items: twoItems }).expect(200);
    const result = (await a.post("/api/orders/whatsapp", body({ items: twoItems })).expect(201)).body.data;
    expect(result.message).toContain(`Image: ${soap.url}`);
    expect(result.message).toContain(`Image: ${teeImage.url}`);
    await Product.updateMany({}, { $set: { name: "Changed product", price: 99999, images: [ownedImage("replacement")] } });
    const preview = (await request(app).get(`/api/orders/preview/${tokenFrom(result.previewUrl)}`).expect(200)).body.data;
    expect(preview.items).toEqual([
      { name: "Liquid soap", image: soap.url, attributes: [], quantity: 2, unitPrice: 700, lineTotal: 1400 },
      { name: "Graphic T-shirt", image: teeImage.url, attributes: [{ name: "Size", value: "Large" }], quantity: 1, unitPrice: 8000, lineTotal: 8000 },
    ]);
    expect(preview.total).toBe(9400);
  });

  it("rejects invalid, changed and expired tokens; owners can renew an expired preview", async () => {
    const result = (await prepare()).body.data;
    const token = tokenFrom(result.previewUrl);
    await request(app).get("/api/orders/preview/not-a-token").expect(404);
    await request(app).get(`/api/orders/preview/${"x".repeat(43)}`).expect(404);
    const changed = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    await request(app).get(`/api/orders/preview/${changed}`).expect(404);
    await request(app).get(`/api/orders/preview/${result.order.id}`).expect(404);
    await Order.updateOne({ _id: result.order.id }, { $set: { previewExpiresAt: new Date(0) } });
    const expired = await request(app).get(`/api/orders/preview/${token}`).expect(410);
    expect(expired.body.error.code).toBe("PREVIEW_EXPIRED");
    const renewed = (await a.get(`/api/my-orders/${result.order.id}`).expect(200)).body.data.previewUrl;
    expect(renewed).not.toBe(result.previewUrl);
    await request(app).get(`/api/orders/preview/${token}`).expect(404);
    await request(app).get(`/api/orders/preview/${tokenFrom(renewed)}`).expect(200);
    const retry = (await a.get(`/api/my-orders/${result.order.id}`).expect(200)).body.data.previewUrl;
    expect(retry).toBe(renewed);
  });

  it("preserves ordinary orders without product photos and omits unsafe stored image links", async () => {
    const result = (await prepare()).body.data;
    expect(result.message).not.toContain("Image:");
    const preview = (await request(app).get(`/api/orders/preview/${tokenFrom(result.previewUrl)}`).expect(200)).body.data;
    expect(preview.items[0].image).toBeNull();
    await Order.updateOne({ _id: result.order.id }, { $set: { "items.0.image": "https://evil.example/photo.jpg" } });
    const sanitized = (await request(app).get(`/api/orders/preview/${tokenFrom(result.previewUrl)}`).expect(200)).body.data;
    expect(sanitized.items[0].image).toBeNull();
  });
});
