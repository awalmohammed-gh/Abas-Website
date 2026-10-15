import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/Product.js";
import { ORIGIN, createTestAdmin, loginAdmin, resetDatabase, startDatabase, stopDatabase, type AdminAgent } from "./helpers.js";

const app = createApp();
let admin: AdminAgent;
let gel: { id: string };
let shirt: { id: string; variants: { id: string; attributes: { name: string; value: string }[] }[] };

const customer = {
  name: "Ama Mensah",
  phone: "024 123 4567",
  fulfillmentMethod: "delivery",
  deliveryLocation: "East Legon, Accra",
  notes: "Call on arrival",
};

function placeOrder(items: object[], extra: object = {}) {
  return request(app)
    .post("/api/orders/whatsapp")
    .set("Origin", ORIGIN)
    .send({ idempotencyKey: randomUUID(), customer, items, ...extra });
}

async function stockOf(productId: string, variantId?: string) {
  const product = await Product.findById(productId).lean();
  if (!variantId) return product!.stock;
  return product!.variants.find((v) => v._id.toString() === variantId)!.stock;
}

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  await resetDatabase();
  await createTestAdmin();
  admin = await loginAdmin(app);
  await admin.put("/api/admin/settings", { storeName: "ABA Mart", whatsappNumber: "233201234567" }).expect(200);
  const category = (await admin.post("/api/admin/categories", { name: "Everyday" }).expect(201)).body.data;
  gel = (await admin.post("/api/admin/products", { name: "Dettol Shower Gel 500ml", category: category.id, price: 4500, stock: 5 }).expect(201)).body.data;
  shirt = (
    await admin
      .post("/api/admin/products", {
        name: "Men's T-Shirt",
        category: category.id,
        price: 8000,
        options: [{ name: "Size", values: ["Large", "Medium"] }],
        variants: [
          { attributes: [{ name: "Size", value: "Large" }], stock: 2 },
          { attributes: [{ name: "Size", value: "Medium" }], stock: 0 },
        ],
      })
      .expect(201)
  ).body.data;
});

describe("cart quote", () => {
  it("prices the cart from the database and caps quantities at available stock", async () => {
    const res = await request(app)
      .post("/api/orders/quote")
      .set("Origin", ORIGIN)
      .send({ items: [{ productId: gel.id, quantity: 9, price: 1 }, { productId: shirt.id, quantity: 1 }] })
      .expect(200);
    const [gelLine, shirtLine] = res.body.data.lines;
    expect(gelLine).toMatchObject({ unitPrice: 4500, quantity: 5, status: "quantity_adjusted" });
    expect(shirtLine.status).toBe("variant_required");
    expect(res.body.data.hasIssues).toBe(true);
  });
});

describe("WhatsApp checkout", () => {
  it("records a pending order with server prices and builds the click-to-chat link", async () => {
    const large = shirt.variants[0]!.id;
    const res = await placeOrder([
      { productId: gel.id, quantity: 2 },
      { productId: shirt.id, variantId: large, quantity: 1 },
    ]).expect(201);

    const { order, message, whatsappUrl } = res.body.data;
    expect(order.orderReference).toMatch(/^ABA-\d{6}$/);
    expect(order.status).toBe("WhatsApp Pending");
    expect(order.total).toBe(4500 * 2 + 8000);
    expect(whatsappUrl.startsWith("https://wa.me/233201234567?text=")).toBe(true);
    expect(decodeURIComponent(whatsappUrl.split("?text=")[1])).toBe(message);
    expect(message).toContain(`Order Reference: ${order.orderReference}`);
    expect(message).toContain("Size: Large");
    expect(message).toContain("Total: GHS 170.00");
    expect(message).toContain("Phone: +233 24 123 4567");

    // Opening WhatsApp is not a sale: stock is untouched.
    expect(await stockOf(gel.id)).toBe(5);
  });

  it("issues sequential order references", async () => {
    const a = await placeOrder([{ productId: gel.id, quantity: 1 }]).expect(201);
    const b = await placeOrder([{ productId: gel.id, quantity: 1 }]).expect(201);
    const n = (ref: string) => Number(ref.slice(4));
    expect(n(b.body.data.order.orderReference)).toBe(n(a.body.data.order.orderReference) + 1);
  });

  it("returns the same order for a repeated submission (idempotency)", async () => {
    const body = { idempotencyKey: randomUUID(), customer, items: [{ productId: gel.id, quantity: 1 }] };
    const first = await request(app).post("/api/orders/whatsapp").set("Origin", ORIGIN).send(body).expect(201);
    const again = await request(app).post("/api/orders/whatsapp").set("Origin", ORIGIN).send(body).expect(200);
    expect(again.body.data.order.orderReference).toBe(first.body.data.order.orderReference);
    expect(again.body.data.replayed).toBe(true);

    const orders = await admin.get("/api/admin/orders").expect(200);
    expect(orders.body.data.total).toBe(1);

    const conflicting = await request(app)
      .post("/api/orders/whatsapp")
      .set("Origin", ORIGIN)
      .send({ ...body, items: [{ productId: gel.id, quantity: 2 }] })
      .expect(409);
    expect(conflicting.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("handles concurrent duplicate submissions without creating two orders", async () => {
    const body = { idempotencyKey: randomUUID(), customer, items: [{ productId: gel.id, quantity: 1 }] };
    const results = await Promise.all(
      [1, 2, 3].map(() => request(app).post("/api/orders/whatsapp").set("Origin", ORIGIN).send(body)),
    );
    const refs = new Set(results.map((r) => r.body.data.order.orderReference));
    expect(refs.size).toBe(1);
    expect((await admin.get("/api/admin/orders").expect(200)).body.data.total).toBe(1);
  });

  it("refuses carts that exceed stock, miss variants or include unavailable items", async () => {
    expect((await placeOrder([{ productId: gel.id, quantity: 6 }]).expect(409)).body.error.code).toBe("CART_CHANGED");
    await placeOrder([{ productId: shirt.id, quantity: 1 }]).expect(409);
    await placeOrder([{ productId: shirt.id, variantId: shirt.variants[1]!.id, quantity: 1 }]).expect(409);
    await admin.patch(`/api/admin/products/${gel.id}`, { isActive: false }).expect(200);
    await placeOrder([{ productId: gel.id, quantity: 1 }]).expect(409);
  });

  it("asks the customer to review when prices changed", async () => {
    const res = await placeOrder([{ productId: gel.id, quantity: 1 }], { expectedTotal: 4000 }).expect(409);
    expect(res.body.error.code).toBe("PRICE_CHANGED");
    expect(res.body.error.details.quote.total).toBe(4500);
  });

  it("validates customer details", async () => {
    const res = await request(app)
      .post("/api/orders/whatsapp")
      .set("Origin", ORIGIN)
      .send({ idempotencyKey: randomUUID(), customer: { ...customer, phone: "123", deliveryLocation: "" }, items: [{ productId: gel.id, quantity: 1 }] })
      .expect(400);
    expect(res.body.error.details.fields).toHaveProperty("customer.phone");
    expect(res.body.error.details.fields).toHaveProperty("customer.deliveryLocation");
  });

  it("is unavailable until a WhatsApp number is configured", async () => {
    await admin.put("/api/admin/settings", { storeName: "ABA Mart", whatsappNumber: "" }).expect(200);
    const res = await placeOrder([{ productId: gel.id, quantity: 1 }]).expect(503);
    expect(res.body.error.code).toBe("WHATSAPP_NOT_CONFIGURED");
  });
});

describe("order status and inventory", () => {
  async function pendingOrder(items: object[]) {
    const res = await placeOrder(items).expect(201);
    const list = await admin.get(`/api/admin/orders?q=${res.body.data.order.orderReference}`).expect(200);
    return list.body.data.items[0] as { id: string };
  }

  it("deducts stock once on confirmation and restores it on cancellation", async () => {
    const large = shirt.variants[0]!.id;
    const order = await pendingOrder([
      { productId: gel.id, quantity: 2 },
      { productId: shirt.id, variantId: large, quantity: 2 },
    ]);

    const confirmed = await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Confirmed" }).expect(200);
    expect(confirmed.body.data.order.inventoryAdjusted).toBe(true);
    expect(await stockOf(gel.id)).toBe(3);
    expect(await stockOf(shirt.id, large)).toBe(0);
    expect(await stockOf(shirt.id)).toBe(0);

    // Repeating the same update is a no-op: no double deduction.
    const repeat = await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Confirmed" }).expect(200);
    expect(repeat.body.data.changed).toBe(false);
    expect(await stockOf(gel.id)).toBe(3);

    await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Processing" }).expect(200);
    expect(await stockOf(gel.id)).toBe(3);

    const cancelled = await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Cancelled", note: "Customer changed mind" }).expect(200);
    expect(cancelled.body.data.order.inventoryAdjusted).toBe(false);
    expect(await stockOf(gel.id)).toBe(5);
    expect(await stockOf(shirt.id, large)).toBe(2);
    expect(cancelled.body.data.order.statusHistory.map((h: { status: string }) => h.status)).toEqual([
      "WhatsApp Pending",
      "Confirmed",
      "Processing",
      "Cancelled",
    ]);
  });

  it("rejects invalid status transitions", async () => {
    const order = await pendingOrder([{ productId: gel.id, quantity: 1 }]);
    const res = await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Completed" }).expect(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Paid" }).expect(400);
  });

  it("cancelling a pending order never touches stock", async () => {
    const order = await pendingOrder([{ productId: gel.id, quantity: 4 }]);
    await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Cancelled" }).expect(200);
    expect(await stockOf(gel.id)).toBe(5);
  });

  it("refuses to confirm without enough stock and leaves stock unchanged", async () => {
    const order = await pendingOrder([{ productId: gel.id, quantity: 4 }, { productId: shirt.id, variantId: shirt.variants[0]!.id, quantity: 1 }]);
    await admin.patch(`/api/admin/inventory/${gel.id}`, { stock: 3 }).expect(200);

    const res = await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Confirmed" }).expect(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(await stockOf(gel.id)).toBe(3);
    expect(await stockOf(shirt.id, shirt.variants[0]!.id)).toBe(2); // no partial deduction
  });

  it("never oversells when two orders are confirmed at the same time", async () => {
    const a = await pendingOrder([{ productId: gel.id, quantity: 3 }]);
    const b = await pendingOrder([{ productId: gel.id, quantity: 3 }]);

    const results = await Promise.all([
      admin.patch(`/api/admin/orders/${a.id}/status`, { status: "Confirmed" }),
      admin.patch(`/api/admin/orders/${b.id}/status`, { status: "Confirmed" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await stockOf(gel.id)).toBe(2);
  });

  it("reports database-backed dashboard metrics", async () => {
    const order = await pendingOrder([{ productId: gel.id, quantity: 1 }]);
    await pendingOrder([{ productId: gel.id, quantity: 1 }]);
    await admin.patch(`/api/admin/orders/${order.id}/status`, { status: "Confirmed" }).expect(200);

    const res = await admin.get("/api/admin/dashboard").expect(200);
    expect(res.body.data.orders).toMatchObject({ total: 2, pending: 1, confirmed: 1, completed: 0, completedValue: 0 });
    expect(res.body.data.products).toMatchObject({ total: 2, active: 2 });
    expect(res.body.data.recentOrders).toHaveLength(2);
  });
});
