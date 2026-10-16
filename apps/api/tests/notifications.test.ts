import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Never contact real push services from tests.
const sendNotification = vi.hoisted(() => vi.fn());
vi.mock("web-push", () => {
  class WebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { default: { setVapidDetails: vi.fn(), sendNotification }, WebPushError };
});

import { WebPushError } from "web-push";
import { createApp } from "../src/app.js";
import { Category } from "../src/models/Category.js";
import { Notification } from "../src/models/Notification.js";
import { NotificationReadState } from "../src/models/NotificationReadState.js";
import { Order } from "../src/models/Order.js";
import { Product } from "../src/models/Product.js";
import { PushSubscription } from "../src/models/PushSubscription.js";
import { Settings } from "../src/models/Settings.js";
import { runPushDeliveriesNow } from "../src/services/pushService.js";
import { ORIGIN, createTestAdmin, guestVisitor, loginAdmin, resetDatabase, startDatabase, stopDatabase, type AdminAgent } from "./helpers.js";

const app = createApp();
type Guest = Awaited<ReturnType<typeof guestVisitor>>;

let admin: AdminAgent;
let productId: string;

const b64 = (bytes: number) => randomBytes(bytes).toString("base64url");
const fakeSubscription = (host = "fcm.googleapis.com") => ({
  endpoint: `https://${host}/fcm/send/${b64(24)}`,
  expirationTime: null,
  keys: { p256dh: b64(65), auth: b64(16) },
});

function publish(body: Record<string, unknown>) {
  return admin.post("/api/admin/notifications", { audience: "public", message: "", sendPush: false, publish: true, ...body });
}

async function checkout(guest: Guest, status: number) {
  const items = [{ productId, quantity: 1 }];
  await guest.put("/api/cart", { items }).expect(200);
  return guest.post("/api/orders/whatsapp", {
    idempotencyKey: randomUUID(),
    customer: { name: "Ama Mensah", phone: "0241234567", fulfillmentMethod: "pickup" },
    items,
  }).expect(status);
}

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  await resetDatabase();
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201, body: "", headers: {} });
  await Settings.create({ key: "store", storeName: "ABA Mart", whatsappNumber: "233278857814" });
  const category = await Category.create({ name: "Essentials", slug: "essentials" });
  productId = (await Product.create({ name: "Liquid soap", slug: "liquid-soap", category: category._id, price: 700, stock: 10 })).id;
  await createTestAdmin();
  admin = await loginAdmin(app);
});

describe("settings apply across the store", () => {
  it("serves updated store name, WhatsApp number, greeting and storefront switches to every reader", async () => {
    const current = (await admin.get("/api/admin/settings").expect(200)).body.data;
    expect(current.notifications).toMatchObject({ enabled: true, adminOrderAlerts: true });

    await admin.put("/api/admin/settings", {
      ...current,
      storeName: "Aba's Market",
      whatsappNumber: "0201112222",
      whatsappGreeting: "Good day Aba's Market,",
      storefront: { showFeaturedProducts: false, showNewArrivals: true },
    }).expect(200);

    const pub = (await request(app).get("/api/settings/public").expect(200)).body.data;
    expect(pub).toMatchObject({ storeName: "Aba's Market", whatsappNumber: "233201112222", storefront: { showFeaturedProducts: false } });

    const guest = await guestVisitor(app);
    const order = await checkout(guest, 201);
    expect(order.body.data.whatsappUrl).toMatch(/^https:\/\/wa\.me\/233201112222\?text=/);
    expect(order.body.data.message.split("\n")[0]).toBe("Good day Aba's Market,");
  });

  it("stops WhatsApp checkout when ordering is switched off", async () => {
    const current = (await admin.get("/api/admin/settings").expect(200)).body.data;
    await admin.put("/api/admin/settings", { ...current, whatsappOrderingEnabled: false }).expect(200);
    const res = await checkout(await guestVisitor(app), 503);
    expect(res.body.error.code).toBe("WHATSAPP_ORDERING_DISABLED");
  });

  it("does not change the settings version when settings are only read", async () => {
    const first = (await request(app).get("/api/notifications/public").expect(200)).body.data.settingsVersion;
    await request(app).get("/api/settings/public").expect(200);
    const second = (await request(app).get("/api/notifications/public").expect(200)).body.data.settingsVersion;
    expect(second).toBe(first);
  });
});

describe("customer notification feed", () => {
  it("shows published announcements from MongoDB, and promotions only to visitors who opted in", async () => {
    await publish({ type: "new_product", title: "Just in: Liquid soap", targetUrl: "/products/liquid-soap" }).expect(201);
    await publish({ type: "promotion", title: "20% off soaps" }).expect(201);
    await admin.post("/api/admin/notifications", { type: "announcement", title: "Draft only", publish: false }).expect(201);

    const anonymous = (await request(app).get("/api/notifications/public").expect(200)).body.data;
    expect(anonymous.items.map((i: { title: string }) => i.title)).toEqual(["Just in: Liquid soap"]);
    expect(anonymous.preferences).toBeNull();

    const guest = await guestVisitor(app);
    await guest.put("/api/notifications/preferences", { newProducts: true, promotions: true }).expect(200);
    const optedIn = (await guest.get("/api/notifications/public").expect(200)).body.data;
    expect(optedIn.items.map((i: { title: string }) => i.title)).toEqual(["20% off soaps", "Just in: Liquid soap"]);
    expect(optedIn.unreadCount).toBe(2);
  });

  it("keeps read state per visitor and ignores ids outside the visitor's feed", async () => {
    const created = await publish({ type: "announcement", title: "Closed on Sunday" }).expect(201);
    const a = await guestVisitor(app);
    const b = await guestVisitor(app);

    await a.post("/api/notifications/read", { ids: [created.body.data.id] }).expect(200);
    expect((await a.get("/api/notifications/public")).body.data.unreadCount).toBe(0);
    expect((await b.get("/api/notifications/public")).body.data.unreadCount).toBe(1);

    // Marking requires the guest's CSRF token.
    await b.agent.post("/api/notifications/read").set("Origin", ORIGIN).send({ all: true }).expect(403);
  });

  it("never exposes admin order alerts to customers", async () => {
    const guest = await guestVisitor(app);
    await checkout(guest, 201);
    await vi.waitFor(async () => expect(await Notification.countDocuments({ type: "order_alert" })).toBe(1));
    const feed = (await guest.get("/api/notifications/public").expect(200)).body.data;
    expect(JSON.stringify(feed)).not.toMatch(/checkout|Ama|0241234567/);
    await request(app).get("/api/admin/notifications").expect(401);
    await request(app).get("/api/admin/notifications/summary").expect(401);
  });

  it("hides the feed when the store switches notifications off", async () => {
    await publish({ type: "announcement", title: "Hello" }).expect(201);
    const current = (await admin.get("/api/admin/settings").expect(200)).body.data;
    await admin.put("/api/admin/settings", { ...current, notifications: { ...current.notifications, enabled: false } }).expect(200);
    const feed = (await request(app).get("/api/notifications/public").expect(200)).body.data;
    expect(feed).toMatchObject({ enabled: false, items: [] });
    const blocked = await publish({ type: "announcement", title: "Blocked" }).expect(409);
    expect(blocked.body.error.code).toBe("NOTIFICATIONS_DISABLED");
  });

  it("rejects links to other websites and admin pages", async () => {
    for (const targetUrl of ["https://evil.example", "//evil.example", "/\\evil.example", "/admin/orders", "javascript:alert(1)"]) {
      await publish({ type: "announcement", title: "Bad link", targetUrl }).expect(400);
    }
  });
});

describe("admin order alerts", () => {
  it("creates one pending-checkout alert per order, without confirming it or touching stock", async () => {
    const guest = await guestVisitor(app);
    const items = [{ productId, quantity: 1 }];
    await guest.put("/api/cart", { items }).expect(200);
    const body = { idempotencyKey: randomUUID(), customer: { name: "Ama Mensah", phone: "0241234567", fulfillmentMethod: "pickup" }, items };
    const first = await guest.post("/api/orders/whatsapp", body).expect(201);
    await guest.post("/api/orders/whatsapp", body).expect(200); // replay

    await vi.waitFor(async () => expect(await Notification.countDocuments({ type: "order_alert" })).toBe(1));
    const summary = (await admin.get("/api/admin/notifications/summary").expect(200)).body.data;
    expect(summary.unreadCount).toBe(1);
    const alert = summary.latest[0];
    expect(alert.title).toContain(first.body.data.order.orderReference);
    expect(alert.title).toMatch(/pending checkout request/i);
    expect(alert.message).toMatch(/Not confirmed/);
    expect(alert.orderStatus).toBe("WhatsApp Pending");
    expect((await Product.findById(productId).lean())!.stock).toBe(10);

    await admin.post("/api/admin/notifications/read", { all: true }).expect(200);
    expect((await admin.get("/api/admin/notifications/summary")).body.data.unreadCount).toBe(0);
  });

  it("can be switched off in settings", async () => {
    const current = (await admin.get("/api/admin/settings").expect(200)).body.data;
    await admin.put("/api/admin/settings", { ...current, notifications: { ...current.notifications, adminOrderAlerts: false } }).expect(200);
    await checkout(await guestVisitor(app), 201);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await Notification.countDocuments({ type: "order_alert" })).toBe(0);
  });
});

describe("web push subscriptions and delivery", () => {
  it("returns only the public VAPID key", async () => {
    const config = (await request(app).get("/api/push/config").expect(200)).body.data;
    expect(config.enabled).toBe(true);
    expect(config.publicKey).toBe(process.env.VAPID_PUBLIC_KEY);
    expect(JSON.stringify(config)).not.toContain(process.env.VAPID_PRIVATE_KEY);
  });

  it("stores subscriptions without echoing credentials, and only for known push services", async () => {
    const guest = await guestVisitor(app);
    const subscription = fakeSubscription();
    const res = await guest.post("/api/push/subscribe", { subscription }).expect(201);
    expect(JSON.stringify(res.body)).not.toContain(subscription.keys.auth);
    expect(res.body.data.preferences).toEqual({ newProducts: true, promotions: false });

    await guest.post("/api/push/subscribe", { subscription: fakeSubscription("internal.example") }).expect(400);
    await guest.agent.post("/api/push/subscribe").set("Origin", ORIGIN).send({ subscription: fakeSubscription() }).expect(403);
    expect(await PushSubscription.countDocuments({ isActive: true })).toBe(1);

    const stats = (await admin.get("/api/admin/notifications/subscribers").expect(200)).body.data;
    expect(stats).toEqual({ configured: true, active: 1, inactive: 0, newProducts: 1, promotions: 0 });
    expect(JSON.stringify(stats)).not.toContain(subscription.endpoint);
  });

  it("does not let another visitor take over or remove a subscription", async () => {
    const owner = await guestVisitor(app);
    const other = await guestVisitor(app);
    const subscription = fakeSubscription();
    await owner.post("/api/push/subscribe", { subscription }).expect(201);

    const forged = { ...subscription, keys: { ...subscription.keys, auth: b64(16) } };
    await other.post("/api/push/subscribe", { subscription: forged }).expect(409);
    const removed = await other.agent.delete("/api/push/unsubscribe").set("Origin", ORIGIN).set("X-CSRF-Token", other.csrf).send({ endpoint: subscription.endpoint }).expect(200);
    expect(removed.body.data.unsubscribed).toBe(false);
    expect(await PushSubscription.countDocuments({ isActive: true })).toBe(1);

    const own = await owner.agent.delete("/api/push/unsubscribe").set("Origin", ORIGIN).set("X-CSRF-Token", owner.csrf).send({ endpoint: subscription.endpoint }).expect(200);
    expect(own.body.data.unsubscribed).toBe(true);
  });

  it("sends promotions only to opted-in subscribers and deactivates expired subscriptions", async () => {
    const optedIn = await guestVisitor(app);
    const notOptedIn = await guestVisitor(app);
    const expired = await guestVisitor(app);
    const optedInSub = fakeSubscription();
    await optedIn.post("/api/push/subscribe", { subscription: optedInSub, preferences: { newProducts: true, promotions: true } }).expect(201);
    await notOptedIn.post("/api/push/subscribe", { subscription: fakeSubscription() }).expect(201);
    const expiredSub = fakeSubscription("updates.push.services.mozilla.com");
    await expired.post("/api/push/subscribe", { subscription: expiredSub, preferences: { newProducts: true, promotions: true } }).expect(201);

    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint === expiredSub.endpoint) throw new WebPushError("Gone", 410, {}, "", sub.endpoint);
      return { statusCode: 201, body: "", headers: {} };
    });

    const created = await publish({ type: "promotion", title: "Weekend offer", sendPush: true }).expect(201);
    expect(created.body.data.push.status).toBe("queued");
    await runPushDeliveriesNow();

    expect(sendNotification).toHaveBeenCalledTimes(2);
    const endpoints = sendNotification.mock.calls.map((call) => (call[0] as { endpoint: string }).endpoint);
    expect(endpoints).toContain(optedInSub.endpoint);
    const payload = JSON.parse(sendNotification.mock.calls[0]![1] as string);
    expect(payload).toMatchObject({ title: "Weekend offer", url: "/" });

    const report = (await admin.get("/api/admin/notifications?scope=customer").expect(200)).body.data.items[0].push;
    expect(report).toMatchObject({ status: "completed", targeted: 2, accepted: 1, failed: 1, deactivated: 1 });
    expect(await PushSubscription.countDocuments({ isActive: false })).toBe(1);
  });

  it("publishes a draft only once", async () => {
    await guestVisitor(app).then((g) => g.post("/api/push/subscribe", { subscription: fakeSubscription() }).expect(201));
    const draft = await admin.post("/api/admin/notifications", { type: "new_product", title: "New stock", sendPush: true, publish: false }).expect(201);
    expect(draft.body.data.status).toBe("draft");
    await Promise.all([
      admin.post(`/api/admin/notifications/${draft.body.data.id}/publish`).expect(200),
      admin.post(`/api/admin/notifications/${draft.body.data.id}/publish`).expect(200),
    ]);
    await runPushDeliveriesNow();
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });
});

describe("private customer order updates", () => {
  it("notifies only the order owner for each committed change, without exposing staff notes", async () => {
    const owner = await guestVisitor(app);
    const other = await guestVisitor(app);
    const placed = await checkout(owner, 201);
    const id = placed.body.data.order.id;
    for (const status of ["Confirmed", "Processing", "Ready for Pickup", "Completed"]) {
      await admin.patch(`/api/admin/orders/${id}/status`, { status, note: "Private staff note" }).expect(200);
    }
    const repeated = await admin.patch(`/api/admin/orders/${id}/status`, { status: "Completed" }).expect(200);
    expect(repeated.body.data.changed).toBe(false);
    const feed = (await owner.get("/api/notifications/public").expect(200)).body.data;
    expect(feed.items).toHaveLength(4);
    expect(feed.items[0]).toMatchObject({ type: "order_update", targetUrl: `/my-orders?open=${id}`, read: false });
    expect(feed.items[0].title).toContain("Completed");
    expect(JSON.stringify(feed)).not.toMatch(/Private staff note|Ama Mensah|0241234567/);
    expect((await other.get("/api/notifications/public").expect(200)).body.data.items).toEqual([]);
    expect((await request(app).get("/api/notifications/public").expect(200)).body.data.items).toEqual([]);
    expect(await Notification.countDocuments({ type: "order_update", order: id })).toBe(4);
  });

  it("creates one update when concurrent requests confirm the same order", async () => {
    const placed = await checkout(await guestVisitor(app), 201);
    const id = placed.body.data.order.id;
    await Promise.all([1, 2].map(() => admin.patch(`/api/admin/orders/${id}/status`, { status: "Confirmed" }).expect(200)));
    expect(await Notification.countDocuments({ type: "order_update", order: id })).toBe(1);
  });

  it("rolls back the order and stock if saving its notification fails", async () => {
    const placed = await checkout(await guestVisitor(app), 201);
    const id = placed.body.data.order.id;
    const create = vi.spyOn(Notification, "create").mockRejectedValueOnce(new Error("Simulated notification write failure"));
    try {
      await admin.patch(`/api/admin/orders/${id}/status`, { status: "Confirmed" }).expect(500);
      expect((await Order.findById(id).lean())!.status).toBe("WhatsApp Pending");
      expect((await Product.findById(productId).lean())!.stock).toBe(10);
      expect(await Notification.countDocuments({ type: "order_update" })).toBe(0);
    } finally {
      create.mockRestore();
    }
  });

  it("does not notify for failed updates or legacy orders without a verified owner", async () => {
    const placed = await checkout(await guestVisitor(app), 201);
    const id = placed.body.data.order.id;
    await admin.patch(`/api/admin/orders/${id}/status`, { status: "Completed" }).expect(409);
    await Product.updateOne({ _id: productId }, { stock: 0 });
    await admin.patch(`/api/admin/orders/${id}/status`, { status: "Confirmed" }).expect(409);
    expect(await Notification.countDocuments({ type: "order_update" })).toBe(0);
    expect((await Order.findById(id).lean())!.status).toBe("WhatsApp Pending");
    await Order.updateOne({ _id: id }, { guestSession: null });
    await admin.patch(`/api/admin/orders/${id}/status`, { status: "Cancelled" }).expect(200);
    expect(await Notification.countDocuments({ type: "order_update" })).toBe(0);
  });

  it("sends a generic private push only to the owning visitor's subscription", async () => {
    const owner = await guestVisitor(app);
    const other = await guestVisitor(app);
    const ownSub = fakeSubscription();
    await owner.post("/api/push/subscribe", { subscription: ownSub, preferences: { newProducts: false, promotions: false } }).expect(201);
    await other.post("/api/push/subscribe", { subscription: fakeSubscription() }).expect(201);
    const placed = await checkout(owner, 201);
    const id = placed.body.data.order.id;
    await admin.patch(`/api/admin/orders/${id}/status`, { status: "Confirmed" }).expect(200);
    await runPushDeliveriesNow();
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification.mock.calls[0]![0].endpoint).toBe(ownSub.endpoint);
    const payload = JSON.parse(sendNotification.mock.calls[0]![1] as string);
    expect(payload).toMatchObject({ title: "Your order has an update", url: `/my-orders?open=${id}` });
    expect(JSON.stringify(payload)).not.toMatch(/Ama|0241234567|Confirmed|ABA-\d+/);
  });

  it("does not send private pushes to a revoked guest session", async () => {
    const owner = await guestVisitor(app);
    await owner.post("/api/push/subscribe", { subscription: fakeSubscription() }).expect(201);
    const placed = await checkout(owner, 201);
    await admin.patch(`/api/admin/orders/${placed.body.data.order.id}/status`, { status: "Confirmed" }).expect(200);
    await owner.post("/api/customer/session/reset").expect(200);
    await runPushDeliveriesNow();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("cannot publish a private system update as a public announcement", async () => {
    await publish({ type: "order_update", title: "Fake update" }).expect(400);
    await publish({ type: "announcement", title: "Fake owner", audience: "customer" }).expect(400);
  });
});

describe("notification selection and deletion", () => {
  it("dismisses selected customer notifications only for that visitor", async () => {
    const first = await publish({ type: "announcement", title: "First update" }).expect(201);
    const second = await publish({ type: "announcement", title: "Second update" }).expect(201);
    const a = await guestVisitor(app);
    const b = await guestVisitor(app);
    await a.post("/api/notifications/delete", { ids: [first.body.data.id] }).expect(200);
    const ownFeed = (await a.get("/api/notifications/public").expect(200)).body.data;
    expect(ownFeed.items.map((item: { id: string }) => item.id)).toEqual([second.body.data.id]);
    expect(ownFeed.unreadCount).toBe(1);
    expect((await b.get("/api/notifications/public").expect(200)).body.data.items).toHaveLength(2);
    expect(await Notification.countDocuments({ audience: "public" })).toBe(2);
    expect((await a.post("/api/notifications/delete", { ids: [first.body.data.id] }).expect(200)).body.data.deleted).toBe(0);
  });

  it("select-all clears the full customer inbox beyond the first twenty items", async () => {
    await Notification.insertMany(Array.from({ length: 25 }, (_, i) => ({ title: `Announcement ${i}`, type: "announcement", audience: "public", status: "published", publishedAt: new Date() })));
    const guest = await guestVisitor(app);
    expect((await guest.get("/api/notifications/public")).body.data.items).toHaveLength(20);
    expect((await guest.post("/api/notifications/delete", { all: true }).expect(200)).body.data.deleted).toBe(25);
    expect((await guest.get("/api/notifications/public")).body.data).toMatchObject({ items: [], unreadCount: 0 });
    expect((await request(app).get("/api/notifications/public")).body.data.items).toHaveLength(20);
  });

  it("ignores private ids owned by another visitor and rejects unprotected deletion", async () => {
    const owner = await guestVisitor(app);
    const other = await guestVisitor(app);
    const placed = await checkout(owner, 201);
    await admin.patch(`/api/admin/orders/${placed.body.data.order.id}/status`, { status: "Confirmed" }).expect(200);
    const update = await Notification.findOne({ type: "order_update" }).lean();
    expect((await other.post("/api/notifications/delete", { ids: [update!._id.toString()] }).expect(200)).body.data.deleted).toBe(0);
    expect((await owner.get("/api/notifications/public")).body.data.items).toHaveLength(1);
    await owner.agent.post("/api/notifications/delete").set("Origin", ORIGIN).send({ all: true }).expect(403);
    await request(app).post("/api/admin/notifications/delete").send({ all: true }).expect(401);
    await request(app).post("/api/admin/notifications/delete").set("Origin", ORIGIN).set("Cookie", admin.cookie).send({ all: true }).expect(403);
    for (const body of [{}, { ids: [] }, { all: true, ids: [update!._id.toString()] }, { ids: ["invalid"] }]) {
      await owner.post("/api/notifications/delete", body).expect(400);
      await admin.post("/api/admin/notifications/delete", body).expect(400);
    }
  });

  it("deletes selected admin history and receipts, but keeps queued sends", async () => {
    const first = await publish({ type: "announcement", title: "Remove this" }).expect(201);
    const second = await publish({ type: "announcement", title: "Keep this" }).expect(201);
    const queued = await publish({ type: "announcement", title: "Still sending", sendPush: true }).expect(201);
    const guest = await guestVisitor(app);
    await guest.post("/api/notifications/read", { ids: [first.body.data.id] }).expect(200);
    const result = await admin.post("/api/admin/notifications/delete", { ids: [first.body.data.id, queued.body.data.id] }).expect(200);
    expect(result.body.data).toEqual({ deleted: 1, skipped: 1 });
    expect(await Notification.findById(first.body.data.id)).toBeNull();
    expect(await NotificationReadState.countDocuments({ notification: first.body.data.id })).toBe(0);
    expect(await Notification.findById(second.body.data.id)).not.toBeNull();
    expect(await Notification.findById(queued.body.data.id)).not.toBeNull();
  });

  it("deletes all matching admin notifications across pages without touching other scopes", async () => {
    await Notification.insertMany(Array.from({ length: 25 }, (_, i) => ({ title: `Announcement ${i}`, type: "announcement", audience: "public", status: "published", publishedAt: new Date() })));
    await Notification.create({ title: "Staff alert", type: "order_alert", audience: "admin", status: "published", publishedAt: new Date() });
    const result = await admin.post("/api/admin/notifications/delete", { all: true, scope: "customer" }).expect(200);
    expect(result.body.data).toEqual({ deleted: 25, skipped: 0 });
    expect(await Notification.countDocuments()).toBe(1);
    expect((await admin.get("/api/admin/notifications/summary")).body.data.unreadCount).toBe(1);
  });
});
