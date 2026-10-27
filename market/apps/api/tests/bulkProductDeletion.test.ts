import { Types } from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@aba-mart/shared";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/Product.js";
import { Counter } from "../src/models/Counter.js";
import { ORIGIN, createTestAdmin, loginAdmin, resetDatabase, startDatabase, stopDatabase, type AdminAgent } from "./helpers.js";

const app = createApp();
let admin: AdminAgent;

beforeAll(startDatabase);
afterAll(stopDatabase);
afterEach(() => vi.restoreAllMocks());
beforeEach(async () => {
  await resetDatabase();
  await createTestAdmin();
  admin = await loginAdmin(app);
});

async function createProducts() {
  const category = (await admin.post("/api/admin/categories", { name: "Liquid Soap" }).expect(201)).body.data;
  const products = await Product.insertMany(Array.from({ length: 3 }, (_, index) => ({
    name: `Soap ${index}`, slug: `soap-${index}`, category: category.id, price: 1500, stock: 10,
  })));
  return products.map((product) => product._id.toString());
}

describe("bulk permanent product deletion", () => {
  it("deletes selected active and archived products once and leaves unselected products alone", async () => {
    const ids = await createProducts();
    await admin.del(`/api/admin/products/${ids[1]}`).expect(200);
    const response = await admin.post("/api/admin/products/bulk-delete", { ids: [ids[0], ids[0]!.toUpperCase(), ids[1]] }).expect(200);
    expect(response.body.data).toEqual({ ids: ids.slice(0, 2), deletedCount: 2 });
    expect(await Product.countDocuments()).toBe(1);
    expect(await Product.findById(ids[2])).not.toBeNull();
    expect((await Counter.findById("catalog-deletions"))!.seq).toBe(1);
    expect((await request(app).get("/api/products").expect(200)).body.data.items.map((product: { id: string }) => product.id)).toEqual([ids[2]]);
  });

  it("rejects empty, malformed, oversized and ambiguous selections without deleting anything", async () => {
    const ids = await createProducts();
    for (const body of [
      {}, { ids: [] }, { ids: ["not-an-id"] }, { ids: [{ $ne: null }] },
      { all: true }, { ids: [ids[0]], all: true },
      { ids: Array(LIMITS.maxProductDeleteBatch + 1).fill(ids[0]) },
    ]) {
      await admin.post("/api/admin/products/bulk-delete", body).expect(400);
      expect(await Product.countDocuments()).toBe(3);
    }
    expect(await Counter.findById("catalog-deletions")).toBeNull();
  });

  it("rolls back the full selection when one selected product no longer exists", async () => {
    const ids = await createProducts();
    const response = await admin.post("/api/admin/products/bulk-delete", { ids: [ids[0], new Types.ObjectId().toString()] }).expect(409);
    expect(response.body.error.code).toBe("PRODUCT_SELECTION_CHANGED");
    expect(await Product.countDocuments()).toBe(3);
    expect(await Product.findById(ids[0])).not.toBeNull();
    expect(await Counter.findById("catalog-deletions")).toBeNull();
  });

  it("restores every selected record if a later database operation fails", async () => {
    const ids = await createProducts();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(Counter, "findOneAndUpdate").mockImplementationOnce(() => { throw new Error("Simulated revision write failure"); });
    await admin.post("/api/admin/products/bulk-delete", { ids }).expect(500);
    expect(await Product.countDocuments()).toBe(3);
    expect(await Counter.findById("catalog-deletions")).toBeNull();
  });

  it("requires admin authentication and a valid CSRF token", async () => {
    const ids = await createProducts();
    await request(app).post("/api/admin/products/bulk-delete").send({ ids }).expect(401);
    await request(app).post("/api/admin/products/bulk-delete").set("Cookie", admin.cookie).set("Origin", ORIGIN).send({ ids }).expect(403);
    expect(await Product.countDocuments()).toBe(3);
  });

  it("handles overlapping concurrent batches without a partial second deletion", async () => {
    const ids = await createProducts();
    const responses = await Promise.all([
      admin.post("/api/admin/products/bulk-delete", { ids: ids.slice(0, 2) }),
      admin.post("/api/admin/products/bulk-delete", { ids: ids.slice(1, 3) }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await Product.countDocuments()).toBe(1);
    expect((await Counter.findById("catalog-deletions"))!.seq).toBe(1);
  });
});
