import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/Product.js";
import { createTestAdmin, loginAdmin, ownedImage, resetDatabase, startDatabase, stopDatabase, type AdminAgent } from "./helpers.js";

const app = createApp();
let admin: AdminAgent;

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  await resetDatabase();
  await createTestAdmin();
  admin = await loginAdmin(app);
});

async function createCategory(name = "Bathing Soaps") {
  const res = await admin.post("/api/admin/categories", { name }).expect(201);
  return res.body.data as { id: string; slug: string };
}

describe("categories", () => {
  it("creates categories with unique slugs and lists active ones publicly", async () => {
    const first = await createCategory("Body Wash");
    const second = await createCategory("Body Wash");
    expect(first.slug).toBe("body-wash");
    expect(second.slug).toBe("body-wash-2");

    await admin.patch(`/api/admin/categories/${second.id}`, { isActive: false }).expect(200);
    const list = await request(app).get("/api/categories").expect(200);
    expect(list.body.data.map((c: { slug: string }) => c.slug)).toEqual(["body-wash"]);
  });

  it("refuses to delete a category that products still use", async () => {
    const category = await createCategory();
    await admin.post("/api/admin/products", { name: "Dettol Soap", category: category.id, price: 1200, stock: 5 }).expect(201);
    const res = await admin.del(`/api/admin/categories/${category.id}`).expect(409);
    expect(res.body.error.code).toBe("CATEGORY_IN_USE");

    const empty = await createCategory("Empty");
    await admin.del(`/api/admin/categories/${empty.id}`).expect(200);
  });
});

describe("products", () => {
  it("permanently deletes active and archived product records", async () => {
    const category = await createCategory();
    for (const archived of [false, true]) {
      const product = (await admin.post("/api/admin/products", { name: archived ? "Archived Soap" : "Unwanted Soap", category: category.id, price: 1200, stock: 5 }).expect(201)).body.data;
      if (archived) await admin.del(`/api/admin/products/${product.id}`).expect(200);
      const deleted = await admin.del(`/api/admin/products/${product.id}/permanent`).expect(200);
      expect(deleted.body.data).toEqual({ id: product.id, deleted: true });
      expect(await Product.findById(product.id)).toBeNull();
      await admin.get(`/api/admin/products/${product.id}`).expect(404);
      await admin.post(`/api/admin/products/${product.id}/restore`).expect(404);
      await request(app).get(`/api/products/${product.slug}`).expect(404);
    }
    const categories = await request(app).get("/api/categories").expect(200);
    expect(categories.body.data.find((item: { id: string }) => item.id === category.id).productCount).toBe(0);
  });

  it("requires an authenticated admin and CSRF token for permanent deletion", async () => {
    const category = await createCategory();
    const product = (await admin.post("/api/admin/products", { name: "Protected Soap", category: category.id, price: 1200 }).expect(201)).body.data;
    await request(app).delete(`/api/admin/products/${product.id}/permanent`).expect(401);
    await request(app).delete(`/api/admin/products/${product.id}/permanent`).set("Cookie", admin.cookie).expect(403);
    expect(await Product.findById(product.id)).not.toBeNull();
  });

  it("changes the storefront revision when an older product is permanently deleted", async () => {
    const category = await createCategory();
    const older = (await admin.post("/api/admin/products", { name: "Older Soap", category: category.id, price: 1200 }).expect(201)).body.data;
    await admin.post("/api/admin/products", { name: "Newer Soap", category: category.id, price: 1400 }).expect(201);
    const before = (await request(app).get("/api/notifications/public").expect(200)).body.data.catalogVersion;
    await admin.del(`/api/admin/products/${older.id}/permanent`).expect(200);
    const after = (await request(app).get("/api/notifications/public").expect(200)).body.data.catalogVersion;
    expect(after).not.toBe(before);
  });

  it("validates input on the server", async () => {
    const category = await createCategory();
    const res = await admin
      .post("/api/admin/products", { name: "X", category: category.id, price: -5, compareAtPrice: 10 })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.fields).toHaveProperty("name");
    expect(res.body.error.details.fields).toHaveProperty("price");
  });

  it("rejects images that were not uploaded through the store", async () => {
    const category = await createCategory();
    await admin
      .post("/api/admin/products", {
        name: "Dettol Soap",
        category: category.id,
        price: 1200,
        images: [{ url: "https://evil.example/x.jpg", publicId: "aba-mart/products/x" }],
      })
      .expect(400);
  });

  it("creates, edits, archives and restores products", async () => {
    const category = await createCategory();
    const created = await admin
      .post("/api/admin/products", {
        name: "Dettol Shower Gel 500ml",
        category: category.id,
        price: 4500,
        compareAtPrice: 5000,
        stock: 10,
        images: [ownedImage("gel")],
        isFeatured: true,
      })
      .expect(201);
    const product = created.body.data;
    expect(product.slug).toBe("dettol-shower-gel-500ml");

    const publicList = await request(app).get("/api/products?featured=true").expect(200);
    expect(publicList.body.data.items).toHaveLength(1);
    expect(publicList.body.data.items[0].compareAtPrice).toBe(5000);

    await admin.patch(`/api/admin/products/${product.id}`, { price: 4000 }).expect(200);
    const detail = await request(app).get(`/api/products/${product.slug}`).expect(200);
    expect(detail.body.data.product.price).toBe(4000);
    expect(detail.body.data.product.stock).toBe(10);

    await admin.del(`/api/admin/products/${product.id}`).expect(200);
    await request(app).get(`/api/products/${product.slug}`).expect(404);
    const afterArchive = await request(app).get("/api/products").expect(200);
    expect(afterArchive.body.data.total).toBe(0);
    expect(await Product.countDocuments()).toBe(1); // soft-deleted, history preserved

    const restored = await admin.post(`/api/admin/products/${product.id}/restore`).expect(200);
    expect(restored.body.data).toMatchObject({ isArchived: false, isActive: false });
  });

  it("hides inactive products and products in inactive categories", async () => {
    const category = await createCategory();
    const res = await admin.post("/api/admin/products", { name: "Shirt", category: category.id, price: 8000, stock: 2 }).expect(201);
    expect((await request(app).get("/api/products")).body.data.total).toBe(1);

    await admin.patch(`/api/admin/categories/${category.id}`, { isActive: false }).expect(200);
    expect((await request(app).get("/api/products")).body.data.total).toBe(0);

    await admin.patch(`/api/admin/categories/${category.id}`, { isActive: true }).expect(200);
    await admin.patch(`/api/admin/products/${res.body.data.id}`, { isActive: false }).expect(200);
    expect((await request(app).get("/api/products")).body.data.total).toBe(0);
  });

  it("filters, searches, sorts and paginates the shop", async () => {
    const soaps = await createCategory("Soaps");
    const clothing = await createCategory("Clothing");
    await admin.post("/api/admin/products", { name: "Dettol Soap", category: soaps.id, price: 1200, stock: 0 }).expect(201);
    await admin.post("/api/admin/products", { name: "Lux Soap", category: soaps.id, price: 900, stock: 4 }).expect(201);
    await admin.post("/api/admin/products", { name: "Polo Shirt", category: clothing.id, price: 9000, stock: 3 }).expect(201);

    const bySoap = await request(app).get("/api/products?category=soaps&sort=price-asc").expect(200);
    expect(bySoap.body.data.items.map((p: { name: string }) => p.name)).toEqual(["Lux Soap", "Dettol Soap"]);

    const inStock = await request(app).get("/api/products?availability=in-stock").expect(200);
    expect(inStock.body.data.total).toBe(2);

    const search = await request(app).get("/api/products?q=dettol").expect(200);
    expect(search.body.data.items[0].inStock).toBe(false);

    const paged = await request(app).get("/api/products?limit=2&page=2").expect(200);
    expect(paged.body.data).toMatchObject({ total: 3, page: 2, totalPages: 2 });
    expect(paged.body.data.items).toHaveLength(1);
  });

  it("stores an optional subcategory and includes it in search", async () => {
    const category = await createCategory("Clothing");
    const created = await admin
      .post("/api/admin/products", { name: "Baggy Gray Jeans", category: category.id, subCategory: " Jeans ", price: 13500, stock: 5 })
      .expect(201);
    expect(created.body.data.subCategory).toBe("Jeans");

    const plain = await admin.post("/api/admin/products", { name: "Plain Tee", category: category.id, price: 5000, stock: 5 }).expect(201);
    expect(plain.body.data.subCategory).toBe("");

    const search = await request(app).get("/api/products?q=jeans").expect(200);
    expect(search.body.data.items.map((p: { name: string }) => p.name)).toEqual(["Baggy Gray Jeans"]);

    const edited = await admin.patch(`/api/admin/products/${created.body.data.id}`, { subCategory: "Wide-leg Jeans" }).expect(200);
    expect(edited.body.data.subCategory).toBe("Wide-leg Jeans");
    expect(edited.body.data.price).toBe(13500); // partial update keeps other fields
  });

  it("tracks stock per variant", async () => {
    const category = await createCategory("Clothing");
    const res = await admin
      .post("/api/admin/products", {
        name: "Men's T-Shirt",
        category: category.id,
        price: 8000,
        options: [
          { name: "Size", values: ["M", "L"] },
          { name: "Color", values: ["Black"] },
        ],
        variants: [
          { attributes: [{ name: "Size", value: "M" }, { name: "Color", value: "Black" }], stock: 2 },
          { attributes: [{ name: "Size", value: "L" }, { name: "Color", value: "Black" }], stock: 3, price: 8500 },
        ],
      })
      .expect(201);
    const product = res.body.data;
    expect(product.stock).toBe(5);

    const variantId = product.variants[1].id as string;
    const updated = await admin.patch(`/api/admin/inventory/${product.id}`, { variantId, stock: 7 }).expect(200);
    expect(updated.body.data.stock).toBe(9);
    expect(updated.body.data.variants[1].id).toBe(variantId);

    await admin.patch(`/api/admin/inventory/${product.id}`, { variantId, stock: -1 }).expect(400);
    const inventory = await admin.get("/api/admin/inventory").expect(200);
    expect(inventory.body.data.items).toHaveLength(2);
  });
});

describe("banners and settings", () => {
  it("manages banners shown on the storefront", async () => {
    const created = await admin
      .post("/api/admin/banners", { title: "Fresh deals", desktopImage: ownedImage("banner"), buttonText: "Shop now", buttonLink: "/shop" })
      .expect(201);
    expect((await request(app).get("/api/banners")).body.data).toHaveLength(1);

    await admin.patch(`/api/admin/banners/${created.body.data.id}`, { isActive: false }).expect(200);
    expect((await request(app).get("/api/banners")).body.data).toHaveLength(0);

    await admin.post("/api/admin/banners", { title: "Bad link", desktopImage: ownedImage("b2"), buttonText: "Go", buttonLink: "javascript:alert(1)" }).expect(400);
  });

  it("stores a normalised WhatsApp number in settings", async () => {
    const res = await admin.put("/api/admin/settings", { storeName: "ABA Mart", whatsappNumber: "+233 24 123 4567" }).expect(200);
    expect(res.body.data.whatsappNumber).toBe("233241234567");
    const pub = await request(app).get("/api/settings/public").expect(200);
    expect(pub.body.data.storeName).toBe("ABA Mart");
    await admin.put("/api/admin/settings", { storeName: "ABA Mart", whatsappNumber: "12" }).expect(400);
  });
});

describe("uploads", () => {
  it("rejects files that are not real images", async () => {
    await request(app)
      .post("/api/admin/uploads?folder=products")
      .set("Cookie", admin.cookie)
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", admin.csrf)
      .attach("image", Buffer.from("<html>not an image</html>"), { filename: "fake.png", contentType: "image/png" })
      .expect(415);

    await request(app)
      .post("/api/admin/uploads?folder=products")
      .set("Cookie", admin.cookie)
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", admin.csrf)
      .attach("image", Buffer.from("plain"), { filename: "notes.txt", contentType: "text/plain" })
      .expect(415);
  });
});
