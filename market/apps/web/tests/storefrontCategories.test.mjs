import assert from "node:assert/strict";
import { test } from "node:test";
import { storefrontCategories } from "../src/lib/storefrontCategories.ts";

const category = (id, name, slug, overrides = {}) => ({
  id, name, slug, isActive: true, displayOrder: 0, productCount: 0,
  createdAt: "2026-10-01T12:00:00.000Z", ...overrides,
});

test("the requested five collections retain their existing IDs and working route slugs", () => {
  const saved = [
    category("shirt", "T-Shirts & Tops", "t-shirts-and-tops"),
    category("extra", "Electronics", "electronics"),
    category("short", "Shorts", "shorts"),
    category("jeans", "Trousers & Jeans", "trousers-and-jeans"),
    category("dish", "Dishwashing Liquid", "dishwashing-liquid"),
    category("soap", "Liquid Soaps", "liquid-soaps"),
  ];
  const original = structuredClone(saved);
  const result = storefrontCategories(saved);
  assert.deepEqual(result.map(c => c.name), ["Liquid Soap", "Dishwashing Liquid", "Buggy Jeans", "Short", "T-shirt"]);
  assert.deepEqual(result.map(c => c.slug), ["liquid-soaps", "dishwashing-liquid", "trousers-and-jeans", "shorts", "t-shirts-and-tops"]);
  assert.deepEqual(result.map(c => c.id), ["soap", "dish", "jeans", "short", "shirt"]);
  assert.deepEqual(saved, original);
});

test("specific jeans and short categories take priority over broader legacy aliases", () => {
  const saved = [category("broad", "Trousers & Jeans", "trousers-and-jeans"), category("jeans", "Buggy Jeans", "buggy-jeans"), category("legacy", "Jeans Short", "jeans-short"), category("short", "Shorts", "shorts")];
  assert.deepEqual(storefrontCategories(saved).map(c => c.id), ["jeans", "short"]);
});

test("inactive and missing categories never create dead links; duplicate soaps prefer the stocked category", () => {
  assert.deepEqual(storefrontCategories(null), []);
  assert.deepEqual(storefrontCategories(undefined), []);
  const saved = [category("hidden", "T-shirt", "t-shirt", { isActive: false }), category("empty", "Liquid Soaps", "liquid-soaps-2"), category("stocked", "Liquid Soaps", "liquid-soaps", { productCount: 3 })];
  assert.deepEqual(storefrontCategories(saved).map(c => c.id), ["stocked"]);
});
