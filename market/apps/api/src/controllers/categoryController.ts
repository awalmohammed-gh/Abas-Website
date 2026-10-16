import type { Request, Response } from "express";
import { categoryInputSchema, slugify, type CategoryDTO, type CategoryInput } from "@aba-mart/shared";
import { Category, type CategoryDoc } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { assertOwnedImages, cleanupRemovedImages } from "../services/imageService.js";
import { revalidateStorefront } from "../services/revalidationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, setPublicCache } from "../utils/respond.js";
import { toCategoryDTO } from "../utils/serialize.js";

async function productCounts(onlyVisible: boolean): Promise<Map<string, number>> {
  const match = onlyVisible ? { isActive: true, isArchived: false } : { isArchived: false };
  const groups = await Product.aggregate<{ _id: unknown; count: number }>([
    { $match: match },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(groups.map((g) => [String(g._id), g.count]));
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "category";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    if (!(await Category.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** GET /api/categories - active categories with their visible product counts. */
export async function listCategories(_req: Request, res: Response) {
  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean<CategoryDoc[]>(),
    productCounts(true),
  ]);
  setPublicCache(res, 60);
  sendSuccess<CategoryDTO[]>(res, categories.map((c) => toCategoryDTO(c, counts.get(c._id.toString()) ?? 0)));
}

export async function adminListCategories(_req: Request, res: Response) {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ displayOrder: 1, name: 1 }).lean<CategoryDoc[]>(),
    productCounts(false),
  ]);
  sendSuccess(res, categories.map((c) => toCategoryDTO(c, counts.get(c._id.toString()) ?? 0)));
}

export async function adminCreateCategory(req: Request, res: Response) {
  const input = req.body as CategoryInput;
  assertOwnedImages([input.image], "image");
  const category = await Category.create({ ...input, slug: await uniqueSlug(input.slug || slugify(input.name)) });
  revalidateStorefront("categories");
  sendSuccess(res, toCategoryDTO(category.toObject(), 0), 201);
}

export async function adminUpdateCategory(req: Request, res: Response) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("Category not found.");

  const merged = categoryInputSchema.parse({
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image ? { ...category.toObject().image } : null,
    isActive: category.isActive,
    displayOrder: category.displayOrder,
    ...(req.body as object),
  });
  assertOwnedImages([merged.image], "image");

  const previousImage = category.image ? { ...category.toObject().image! } : null;
  category.set({
    ...merged,
    slug: merged.slug && merged.slug !== category.slug ? await uniqueSlug(merged.slug, category.id) : category.slug,
  });
  await category.save();

  cleanupRemovedImages([previousImage], [merged.image]);
  revalidateStorefront("categories", "products");
  const count = await Product.countDocuments({ category: category._id, isArchived: false });
  sendSuccess(res, toCategoryDTO(category.toObject(), count));
}

/**
 * Deleting is only allowed when no product (including archived ones) uses the
 * category, so products and order history never point at a missing category.
 * Otherwise the admin is asked to move the products or deactivate the category.
 */
export async function adminDeleteCategory(req: Request, res: Response) {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("Category not found.");

  const linked = await Product.countDocuments({ category: category._id });
  if (linked > 0) {
    throw ApiError.conflict(
      `${linked} product${linked === 1 ? " uses" : "s use"} this category. Move ${linked === 1 ? "it" : "them"} to another category, or deactivate the category to hide it instead.`,
      "CATEGORY_IN_USE",
      { productCount: linked },
    );
  }

  const image = category.image ? { ...category.toObject().image! } : null;
  await category.deleteOne();
  cleanupRemovedImages([image], []);
  revalidateStorefront("categories");
  sendSuccess(res, { id: category.id as string, deleted: true });
}
