import { z } from "zod";
import {
  PRODUCT_SORTS,
  SLUG_PATTERN,
  objectIdSchema,
  productInputSchema,
  stockUpdateSchema,
} from "@aba-mart/shared";

export { productInputSchema, stockUpdateSchema };

const flag = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const page = z.coerce.number().int().min(1).max(10_000).default(1);

export const publicProductQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  category: z.string().trim().max(140).regex(SLUG_PATTERN).optional(),
  sort: z.enum(PRODUCT_SORTS).default("newest"),
  availability: z.enum(["all", "in-stock"]).default("all"),
  featured: flag,
  onSale: flag,
  exclude: objectIdSchema.optional(),
  page,
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export type PublicProductQuery = z.output<typeof publicProductQuerySchema>;

export const adminProductQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  category: objectIdSchema.optional(),
  status: z.enum(["all", "active", "inactive", "archived"]).default("all"),
  stock: z.enum(["all", "in", "low", "out"]).default("all"),
  featured: flag,
  page,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminProductQuery = z.output<typeof adminProductQuerySchema>;

export const inventoryQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  category: objectIdSchema.optional(),
  state: z.enum(["all", "low_stock", "out_of_stock", "in_stock"]).default("all"),
  page,
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type InventoryQuery = z.output<typeof inventoryQuerySchema>;
