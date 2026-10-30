import assert from "node:assert/strict";
import { test } from "node:test";
import { storefrontCategories } from "../src/lib/storefrontCategories.ts";

const category = (number, overrides = {}) => ({
  id: String(number), name: `Category ${number}`, slug: `category-${number}`,
  isActive: true, displayOrder: 0, productCount: 0,
  createdAt: `2026-10-${String(number).padStart(2, "0")}T12:00:00.000Z`,
  ...overrides,
});

test("a new admin category appears without products and replaces the oldest of six links", () => {
  const saved = Array.from({ length: 8 }, (_, i) => category(i + 1));
  const added = category(9, { name: "Handmade gifts", slug: "handmade-gifts" });
  const result = storefrontCategories([...saved, added]);
  assert.equal(result.length, 6);
  assert.equal(result[0], added);
  assert.equal(result[0].productCount, 0);
  assert.deepEqual(result.map((item) => item.id), ["9", "8", "7", "6", "5", "4"]);
});

test("hidden categories do not take a slot and the full catalogue remains untouched", () => {
  const saved = Array.from({ length: 8 }, (_, i) => category(i + 1));
  saved.push(category(9, { isActive: false }));
  const before = saved.map((item) => item.id);
  const result = storefrontCategories(saved);
  assert.deepEqual(result.map((item) => item.id), ["8", "7", "6", "5", "4", "3"]);
  assert.deepEqual(saved.map((item) => item.id), before);
  assert.equal(saved.length, 9);
});

test("missing and small category lists render without invented placeholder categories", () => {
  assert.deepEqual(storefrontCategories(null), []);
  assert.deepEqual(storefrontCategories(undefined), []);
  const saved = [category(1)];
  assert.deepEqual(storefrontCategories(saved), saved);
});
