import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUCT_VARIETIES, syncVariants, toggleVariety, toggleVolume } from "../../../components/admin/productOptions.ts";
import { productInputSchema, variantLabel } from "@aba-mart/shared";

test("the ready-made list includes the requested soap varieties", () => {
  for (const value of ["Lemon", "Orange", "Sunflower", "Rose"]) assert.ok(PRODUCT_VARIETIES.includes(value));
});

test("choosing a first variety keeps the product stock", () => {
  const next = toggleVariety([{ key: "empty", name: "", valuesText: "" }], [], "Lemon", "12");
  assert.equal(next.hasVariants, true);
  assert.equal(next.variants[0].stock, "12");
  assert.deepEqual(next.variants[0].attributes, [{ name: "Variety", value: "Lemon" }]);
});

test("adding another variety keeps existing variant identity, price and stock", () => {
  const first = toggleVariety([], [], "Lemon", "12");
  first.variants[0] = { ...first.variants[0], id: "507f1f77bcf86cd799439011", price: "18.50", sku: "SOAP-LEMON" };
  const next = toggleVariety(first.options, first.variants, "Orange", first.stock);
  assert.equal(next.variants[0].id, "507f1f77bcf86cd799439011");
  assert.equal(next.variants[0].stock, "12");
  assert.equal(next.variants[0].price, "18.50");
  assert.equal(next.variants[0].sku, "SOAP-LEMON");
  assert.equal(next.variants[1].stock, "0");
});

test("removing the last variety returns to a plain product without discarding stock", () => {
  const first = toggleVariety([], [], "Lemon", "12");
  const next = toggleVariety(first.options, first.variants, "Lemon", "0");
  assert.equal(next.hasVariants, false);
  assert.equal(next.stock, "12");
  assert.equal(next.variants.length, 0);
});

test("variety choices combine with existing sizes and bottle volumes", () => {
  const next = toggleVariety([{ key: "volume", name: "Volume", valuesText: "500ml, 1L" }], [], "Rose", "0");
  assert.equal(next.variants.length, 2);
  assert.equal(variantLabel(next.variants[0].attributes), "500ml / Rose");
  assert.deepEqual(next.options.map((option) => option.name), ["Volume", "Variety"]);
});

test("existing fragrance spelling is recognized without duplicate choices", () => {
  const next = toggleVariety([{ key: "scent", name: "Scent", valuesText: "lemon, Rose" }], [], "Lemon", "0");
  assert.equal(next.options.length, 1);
  assert.equal(next.options[0].valuesText, "Rose");
});

test("a product without a description validates with variety stock and a discount", () => {
  const result = productInputSchema.safeParse({
    name: "Aba Liquid Soap",
    category: "507f1f77bcf86cd799439011",
    price: 1500,
    compareAtPrice: 2000,
    stock: 0,
    options: [{ name: "Variety", values: ["Lemon"] }],
    variants: [{ attributes: [{ name: "Variety", value: "Lemon" }], stock: 12, isActive: true }],
  });
  assert.equal(result.success, true);
  assert.equal(result.data.description, "");
  assert.equal(result.data.variants[0].stock, 12);
});

test("bottle volumes combine with scents and preserve saved prices and stock", () => {
  const first = toggleVolume([], [], "500ml", "12");
  first.variants[0] = { ...first.variants[0], id: "507f1f77bcf86cd799439011", price: "15.00" };
  const second = toggleVolume(first.options, first.variants, "1L", first.stock);
  assert.equal(second.variants[0].id, "507f1f77bcf86cd799439011");
  assert.equal(second.variants[0].price, "15.00");
  assert.equal(second.variants[0].stock, "12");
  assert.equal(second.variants[1].stock, "0");
  const scented = toggleVariety(second.options, second.variants, "Lemon", "0");
  assert.deepEqual(scented.variants.map((variant) => variantLabel(variant.attributes)), ["500ml / Lemon", "1L / Lemon"]);
});

test("removing the last bottle volume restores plain stock and custom volumes are supported", () => {
  const first = toggleVolume([], [], "750ml", "8");
  assert.deepEqual(first.options[0].valuesText, "750ml");
  const removed = toggleVolume(first.options, first.variants, "750ml", "0");
  assert.equal(removed.hasVariants, false);
  assert.equal(removed.stock, "8");
});

test("arbitrary sizes and colours form valid combinations and retain saved inventory when choices are added", () => {
  const options = [
    { key: "size", name: "Size", valuesText: "750ml, Family pack" },
    { key: "colour", name: "Colour", valuesText: "Ocean blue, Clear" },
  ];
  const first = syncVariants(options, []);
  first[0] = { ...first[0], id: "507f1f77bcf86cd799439012", stock: "9", price: "25.00" };
  const variants = syncVariants([options[0], { ...options[1], valuesText: "Ocean blue, Clear, Green" }], first);
  assert.equal(variants.length, 6);
  assert.equal(variants[0].id, first[0].id);
  assert.equal(variants[0].stock, "9");
  assert.equal(variants[0].price, "25.00");
  assert.equal(variantLabel(variants[5].attributes), "Family pack / Green");
  assert.equal(productInputSchema.safeParse({
    name: "Storage container", category: "507f1f77bcf86cd799439011", price: 2500,
    options: [{ name: "Size", values: ["750ml", "Family pack"] }, { name: "Colour", values: ["Ocean blue", "Clear", "Green"] }],
    variants: variants.map((variant) => ({ attributes: variant.attributes, stock: Number(variant.stock) })),
  }).success, true);
});

test("a general product can be saved without sizes, colours or a description", () => {
  const result = productInputSchema.safeParse({ name: "Wooden spoon", category: "507f1f77bcf86cd799439011", price: 1000, stock: 7 });
  assert.equal(result.success, true);
  assert.deepEqual(result.data.options, []);
  assert.deepEqual(result.data.variants, []);
  assert.equal(result.data.stock, 7);
  assert.equal(result.data.description, "");
});
