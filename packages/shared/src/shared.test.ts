import { describe, expect, it } from "vitest";
import {
  isSafeSitePath,
  buildOrderMessage,
  buildWhatsAppUrl,
  canTransitionOrder,
  checkoutCustomerSchema,
  discountPercent,
  formatGHS,
  linkSchema,
  normalizePhoneNumber,
  parseCedisToPesewas,
  pesewasToInput,
  productInputSchema,
  resolvePrice,
  slugify,
} from "./index.js";

describe("money", () => {
  it("formats pesewas as GHS", () => {
    expect(formatGHS(4500)).toBe("GHS 45.00");
    expect(formatGHS(17000)).toBe("GHS 170.00");
    expect(formatGHS(123456789)).toBe("GHS 1,234,567.89");
    expect(formatGHS(5)).toBe("GHS 0.05");
  });

  it("parses cedi input without floating point drift", () => {
    expect(parseCedisToPesewas("45")).toBe(4500);
    expect(parseCedisToPesewas("45.5")).toBe(4550);
    expect(parseCedisToPesewas("0.10")).toBe(10);
    expect(parseCedisToPesewas("1,250.99")).toBe(125099);
    expect(parseCedisToPesewas("19.99")).toBe(1999);
    expect(parseCedisToPesewas("1.234")).toBeNull();
    expect(parseCedisToPesewas("-4")).toBeNull();
    expect(parseCedisToPesewas("abc")).toBeNull();
  });

  it("round-trips form values", () => {
    expect(pesewasToInput(1999)).toBe("19.99");
    expect(pesewasToInput(null)).toBe("");
  });

  it("computes discount percentages", () => {
    expect(discountPercent(8000, 10000)).toBe(20);
    expect(discountPercent(10000, 10000)).toBeNull();
    expect(discountPercent(10000, null)).toBeNull();
  });
});

describe("phone numbers", () => {
  it("normalises Ghana numbers to international digits", () => {
    expect(normalizePhoneNumber("024 123 4567")).toBe("233241234567");
    expect(normalizePhoneNumber("+233 24 123 4567")).toBe("233241234567");
    expect(normalizePhoneNumber("+233 024 123 4567")).toBe("233241234567");
    expect(normalizePhoneNumber("00233241234567")).toBe("233241234567");
    expect(normalizePhoneNumber("233-55-123-4567")).toBe("233551234567");
  });

  it("rejects invalid numbers", () => {
    expect(normalizePhoneNumber("12345")).toBeNull();
    expect(normalizePhoneNumber("024 123 456")).toBeNull();
    expect(normalizePhoneNumber("+233 94 123 4567")).toBeNull();
    expect(normalizePhoneNumber("call me")).toBeNull();
  });

  it("accepts international numbers with a country code", () => {
    expect(normalizePhoneNumber("+44 7700 900123")).toBe("447700900123");
  });
});

describe("WhatsApp", () => {
  const message = buildOrderMessage({
    storeName: "ABA Mart",
    orderReference: "ABA-000125",
    items: [
      { name: "Dettol Shower Gel 500ml", quantity: 2, unitPrice: 4500, lineTotal: 9000 },
      {
        name: "Men's T-Shirt",
        attributes: [
          { name: "Size", value: "Large" },
          { name: "Color", value: "Black" },
        ],
        quantity: 1,
        unitPrice: 8000,
        lineTotal: 8000,
      },
    ],
    total: 17000,
    customer: { name: "Ama Mensah", phone: "233241234567" },
    fulfillmentMethod: "delivery",
    deliveryLocation: "East Legon, Accra",
    notes: "Call before delivery",
  });

  it("builds the order message from validated order data", () => {
    expect(message).toBe(
      [
        "Hello ABA Mart,",
        "",
        "I would like to place an order.",
        "",
        "Order Reference: ABA-000125",
        "",
        "Products:",
        "",
        "1. Dettol Shower Gel 500ml",
        "Quantity: 2",
        "Unit Price: GHS 45.00",
        "Subtotal: GHS 90.00",
        "",
        "2. Men's T-Shirt",
        "Size: Large",
        "Color: Black",
        "Quantity: 1",
        "Unit Price: GHS 80.00",
        "Subtotal: GHS 80.00",
        "",
        "Total: GHS 170.00",
        "",
        "Customer Name: Ama Mensah",
        "Phone: +233 24 123 4567",
        "Delivery Method: Delivery",
        "Location: East Legon, Accra",
        "Notes: Call before delivery",
        "",
        "Please confirm availability and delivery arrangements.",
        "",
        "Thank you.",
      ].join("\n"),
    );
  });

  it("leaves out the location for pickup orders", () => {
    const pickup = buildOrderMessage({
      storeName: "ABA Mart",
      orderReference: "ABA-000126",
      items: [{ name: "Antiseptic Soap", quantity: 1, unitPrice: 1200, lineTotal: 1200 }],
      total: 1200,
      customer: { name: "Kofi", phone: "233551234567" },
      fulfillmentMethod: "pickup",
      deliveryLocation: "Ignored for pickup",
    });
    expect(pickup).toContain("Delivery Method: Pickup\n\nPlease confirm availability and delivery arrangements.");
    expect(pickup).not.toContain("Location:");
  });

  it("links to the ABA Mart WhatsApp number", () => {
    expect(buildWhatsAppUrl("233278857814", "Hi")).toBe("https://wa.me/233278857814?text=Hi");
  });

  it("includes the correct image for every line and a shared product preview", () => {
    const image1 = "https://res.cloudinary.com/aba/image/upload/v1/soap.jpg";
    const image2 = "https://res.cloudinary.com/aba/image/upload/v1/tee.jpg";
    const previewUrl = `https://aba.example/order-preview/${"x".repeat(43)}`;
    const text = buildOrderMessage({
      storeName: "ABA Mart", orderReference: "ABA-000127",
      items: [
        { name: "Soap", quantity: 2, unitPrice: 700, lineTotal: 1400, image: image1 },
        { name: "T-shirt", attributes: [{ name: "Size", value: "Large" }], quantity: 1, unitPrice: 8000, lineTotal: 8000, image: image2 },
      ], total: 9400, customer: { name: "Ama", phone: "233278857814" }, fulfillmentMethod: "pickup", previewUrl,
    });
    expect(text).toContain(`1. Soap\nQuantity: 2\nUnit Price: GHS 7.00\nSubtotal: GHS 14.00\nImage: ${image1}`);
    expect(text).toContain(`2. T-shirt\nSize: Large\nQuantity: 1\nUnit Price: GHS 80.00\nSubtotal: GHS 80.00\nImage: ${image2}`);
    expect(text).toContain(`View all products with images:\n${previewUrl}`);
    expect(decodeURIComponent(buildWhatsAppUrl("233278857814", text).split("?text=")[1]!)).toBe(text);
  });

  it("does not put missing, unsafe or non-Cloudinary image URLs into messages", () => {
    for (const image of [null, "javascript:alert(1)", "https://evil.example/photo.jpg", "http://res.cloudinary.com/aba/image/upload/photo.jpg", "https://res.cloudinary.com/aba/image/upload/a.jpg\nPhone: fake"]) {
      const text = buildOrderMessage({ storeName: "ABA Mart", orderReference: "ABA-000128", items: [{ name: "Soap", quantity: 1, unitPrice: 700, lineTotal: 700, image }], total: 700, customer: { name: "Ama", phone: "233278857814" }, fulfillmentMethod: "pickup" });
      expect(text).not.toContain("Image:");
    }
  });

  it("encodes the click-to-chat URL", () => {
    const url = buildWhatsAppUrl("233241234567", message);
    expect(url.startsWith("https://wa.me/233241234567?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1] ?? "")).toBe(message);
    expect(url).not.toContain(" ");
    expect(buildWhatsAppUrl("+233 24 123 4567")).toBe("https://wa.me/233241234567");
  });
});

describe("schemas", () => {
  const base = {
    name: "Men's T-Shirt",
    category: "64b7f0c2a1b2c3d4e5f60718",
    price: 8000,
  };

  it("accepts a simple product", () => {
    const result = productInputSchema.safeParse({ ...base, stock: 4 });
    expect(result.success).toBe(true);
  });

  it("requires the regular price to exceed the discount price", () => {
    const result = productInputSchema.safeParse({ ...base, compareAtPrice: 8000 });
    expect(result.success).toBe(false);
  });

  it("validates variants against options", () => {
    const options = [{ name: "Size", values: ["M", "L"] }];
    const ok = productInputSchema.safeParse({
      ...base,
      options,
      variants: [{ attributes: [{ name: "Size", value: "M" }], stock: 3 }],
    });
    expect(ok.success).toBe(true);

    const wrongValue = productInputSchema.safeParse({
      ...base,
      options,
      variants: [{ attributes: [{ name: "Size", value: "XL" }], stock: 3 }],
    });
    expect(wrongValue.success).toBe(false);

    const duplicate = productInputSchema.safeParse({
      ...base,
      options,
      variants: [
        { attributes: [{ name: "Size", value: "M" }], stock: 3 },
        { attributes: [{ name: "Size", value: "M" }], stock: 1 },
      ],
    });
    expect(duplicate.success).toBe(false);
  });

  it("requires a delivery location for delivery orders", () => {
    const missing = checkoutCustomerSchema.safeParse({ name: "Ama", phone: "0241234567", fulfillmentMethod: "delivery" });
    expect(missing.success).toBe(false);
    const pickup = checkoutCustomerSchema.safeParse({ name: "Ama", phone: "0241234567", fulfillmentMethod: "pickup" });
    expect(pickup.success).toBe(true);
    if (pickup.success) expect(pickup.data.phone).toBe("233241234567");
  });

  it("blocks unsafe banner links", () => {
    expect(linkSchema.safeParse("/shop").success).toBe(true);
    expect(linkSchema.safeParse("https://example.com/sale").success).toBe(true);
    expect(linkSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(linkSchema.safeParse("//evil.example").success).toBe(false);
  });
});

describe("helpers", () => {
  it("slugifies names", () => {
    expect(slugify("Men's T-Shirt (Large)")).toBe("mens-t-shirt-large");
    expect(slugify("Soaps & Body Wash")).toBe("soaps-and-body-wash");
  });

  it("resolves variant pricing", () => {
    expect(resolvePrice({ price: 1000, compareAtPrice: 1500 })).toEqual({ price: 1000, compareAtPrice: 1500 });
    expect(resolvePrice({ price: 1000, compareAtPrice: 1500 }, { price: 1200 })).toEqual({ price: 1200, compareAtPrice: null });
    expect(resolvePrice({ price: 1000 }, { price: null })).toEqual({ price: 1000, compareAtPrice: null });
  });

  it("enforces the order status workflow", () => {
    expect(canTransitionOrder("WhatsApp Pending", "Confirmed")).toBe(true);
    expect(canTransitionOrder("WhatsApp Pending", "Completed")).toBe(false);
    expect(canTransitionOrder("Completed", "Cancelled")).toBe(false);
  });
});

describe("notification links", () => {
  it("allows store paths only", () => {
    expect(isSafeSitePath("/shop")).toBe(true);
    expect(isSafeSitePath("/products/liquid-soap?ref=push")).toBe(true);
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/admin", "/admin/orders", "javascript:alert(1)", "/shop page"]) {
      expect(isSafeSitePath(bad)).toBe(false);
    }
  });
});

describe("order message greeting", () => {
  const base = {
    storeName: "ABA Mart",
    orderReference: "ABA-000001",
    items: [{ name: "Soap", quantity: 1, unitPrice: 700, lineTotal: 700 }],
    total: 700,
    customer: { name: "Ama", phone: "233241234567" },
    fulfillmentMethod: "pickup" as const,
  };
  it("uses the store greeting when set, and the default otherwise", () => {
    expect(buildOrderMessage(base).split("\n")[0]).toBe("Hello ABA Mart,");
    expect(buildOrderMessage({ ...base, greeting: "Good day ABA Mart team," }).split("\n")[0]).toBe("Good day ABA Mart team,");
  });
});
