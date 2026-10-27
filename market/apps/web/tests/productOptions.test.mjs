import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUCT_VARIETIES, toggleVariety } from "../../../components/admin/productOptions.ts";
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
