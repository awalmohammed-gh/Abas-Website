import { Types, type QueryFilter } from "mongoose";
import {
  escapeRegExp,
  productInputSchema,
  slugify,
  variantLabel,
  type AdminProductDTO,
  type InventoryRow,
  type Paginated,
  type ProductDTO,
  type ProductInput,
} from "@aba-mart/shared";
import { Category, type CategoryDoc } from "../models/Category.js";
import { Product, type ProductDoc, type ProductVariantDoc } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { toAdminProductDTO, toProductDTO, type ProductLean } from "../utils/serialize.js";
import type { AdminProductQuery, InventoryQuery, PublicProductQuery } from "../validators/productSchema.js";
import { assertOwnedImages, cleanupRemovedImages } from "./imageService.js";
import { revalidateStorefront } from "./revalidationService.js";

const CATEGORY_FIELDS = "name slug";

const SORTS: Record<PublicProductQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: -1 },
  "name-asc": { name: 1, _id: 1 },
};

function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

async function activeCategoryIds(): Promise<Types.ObjectId[]> {
  const categories = await Category.find({ isActive: true }).select("_id").lean<Pick<CategoryDoc, "_id">[]>();
  return categories.map((c) => c._id);
}

function searchFilter(q: string): QueryFilter<ProductDoc> {
  if (!q) return {};
  const pattern = new RegExp(escapeRegExp(q), "i");
  return { $or: [{ name: pattern }, { description: pattern }, { "variants.sku": pattern }] };
}

/* ------------------------------------------------------------------ Public */

/** Products customers may see: active, not archived, in an active category. */
export async function publicVisibilityFilter(): Promise<QueryFilter<ProductDoc>> {
  return { isActive: true, isArchived: false, category: { $in: await activeCategoryIds() } };
}

export async function listPublicProducts(query: PublicProductQuery): Promise<Paginated<ProductDTO>> {
  const filter: QueryFilter<ProductDoc> = { ...(await publicVisibilityFilter()), ...searchFilter(query.q) };
  const and: QueryFilter<ProductDoc>[] = [];

  if (query.category) {
    const category = await Category.findOne({ slug: query.category, isActive: true }).select("_id").lean<Pick<CategoryDoc, "_id">>();
    if (!category) return paginate([], 0, query.page, query.limit);
    filter.category = category._id;
  }
  if (query.availability === "in-stock") filter.stock = { $gt: 0 };
  if (query.featured) filter.isFeatured = true;
  if (query.onSale) {
    and.push({ $or: [{ compareAtPrice: { $gt: 0 } }, { variants: { $elemMatch: { isActive: true, compareAtPrice: { $gt: 0 } } } }] });
  }
  if (query.exclude) filter._id = { $ne: new Types.ObjectId(query.exclude) };
  if (and.length) filter.$and = and;

  const [docs, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[query.sort])
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate("category", CATEGORY_FIELDS)
      .lean<ProductLean[]>(),
    Product.countDocuments(filter),
  ]);

  return paginate(docs.map(toProductDTO), total, query.page, query.limit);
}

export async function getPublicProduct(slug: string): Promise<{ product: ProductDTO; related: ProductDTO[] }> {
  const visibility = await publicVisibilityFilter();
  const doc = await Product.findOne({ ...visibility, slug: slug.toLowerCase() })
    .populate("category", CATEGORY_FIELDS)
    .lean<ProductLean>();
  if (!doc) throw ApiError.notFound("This product is not available.");

  const categoryId = doc.category && "name" in doc.category ? doc.category._id : doc.category;
  const related = await Product.find({ ...visibility, category: categoryId, _id: { $ne: doc._id } })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(4)
    .populate("category", CATEGORY_FIELDS)
    .lean<ProductLean[]>();

  return { product: toProductDTO(doc), related: related.map(toProductDTO) };
}

/* ------------------------------------------------------------------- Admin */

export async function listAdminProducts(query: AdminProductQuery): Promise<Paginated<AdminProductDTO>> {
  const filter: QueryFilter<ProductDoc> = searchFilter(query.q);
  if (query.category) filter.category = new Types.ObjectId(query.category);
  if (query.status === "archived") filter.isArchived = true;
  else {
    filter.isArchived = false;
    if (query.status === "active") filter.isActive = true;
    if (query.status === "inactive") filter.isActive = false;
  }
  if (query.featured) filter.isFeatured = true;
  if (query.stock === "out") filter.stock = 0;
  if (query.stock === "in") filter.stock = { $gt: 0 };
  if (query.stock === "low") {
    filter.stock = { $gt: 0 };
    filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };
  }

  const [docs, total] = await Promise.all([
    Product.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate("category", CATEGORY_FIELDS)
      .lean<ProductLean[]>(),
    Product.countDocuments(filter),
  ]);
  return paginate(docs.map(toAdminProductDTO), total, query.page, query.limit);
}

export async function getAdminProduct(id: string): Promise<AdminProductDTO> {
  const doc = await Product.findById(id).populate("category", CATEGORY_FIELDS).lean<ProductLean>();
  if (!doc) throw ApiError.notFound("Product not found.");
  return toAdminProductDTO(doc);
}

async function uniqueSlug(base: string, excludeId?: Types.ObjectId): Promise<string> {
  const root = base || "product";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const exists = await Product.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!exists) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  if (!(await Category.exists({ _id: categoryId }))) {
    throw ApiError.badRequest("Choose an existing category.", { fields: { category: "Category not found" } });
  }
}

/** Applies validated input to a product document, keeping existing variant ids stable for order history. */
function applyInput(doc: InstanceType<typeof Product>, input: ProductInput): void {
  doc.name = input.name;
  doc.description = input.description;
  doc.category = new Types.ObjectId(input.category);
  doc.price = input.price;
  doc.compareAtPrice = input.compareAtPrice;
  doc.images = input.images;
  doc.options = input.options;
  doc.lowStockThreshold = input.lowStockThreshold;
  doc.isFeatured = input.isFeatured;
  doc.isActive = input.isActive;

  const existing = new Map((doc.variants as ProductVariantDoc[]).map((v) => [v._id.toString(), v]));
  doc.variants = input.variants.map((variant) => ({
    _id: variant.id && existing.has(variant.id) ? new Types.ObjectId(variant.id) : new Types.ObjectId(),
    attributes: variant.attributes,
    sku: variant.sku || null,
    price: variant.price ?? null,
    compareAtPrice: variant.compareAtPrice ?? null,
    stock: variant.stock,
    isActive: variant.isActive,
  })) as ProductDoc["variants"];

  if (!input.variants.length) doc.stock = input.stock;
}

export async function createProduct(input: ProductInput): Promise<AdminProductDTO> {
  await assertCategoryExists(input.category);
  assertOwnedImages(input.images);

  const doc = new Product({ slug: await uniqueSlug(input.slug || slugify(input.name)) });
  applyInput(doc, input);
  await doc.save();

  revalidateStorefront("products", "categories");
  return getAdminProduct(doc._id.toString());
}

/** Partial updates are merged with the stored product and the result is validated as a whole. */
export async function updateProduct(id: string, patch: Record<string, unknown>): Promise<AdminProductDTO> {
  const doc = await Product.findById(id);
  if (!doc) throw ApiError.notFound("Product not found.");

  const current = toAdminProductDTO(doc.toObject() as unknown as ProductLean);
  const merged = productInputSchema.parse({
    name: current.name,
    slug: current.slug,
    description: current.description,
    category: doc.category.toString(),
    price: current.price,
    compareAtPrice: current.compareAtPrice,
    images: current.images,
    options: current.options,
    variants: current.variants.map((v) => ({ ...v, id: v.id })),
    stock: current.stock,
    lowStockThreshold: current.lowStockThreshold,
    isFeatured: current.isFeatured,
    isActive: current.isActive,
    ...patch,
  });

  if (merged.category !== doc.category.toString()) await assertCategoryExists(merged.category);
  assertOwnedImages(merged.images);

  const previousImages = [...doc.images];
  if (merged.slug && merged.slug !== doc.slug) doc.slug = await uniqueSlug(merged.slug, doc._id);
  applyInput(doc, merged);
  if (typeof patch.isArchived === "boolean" && !patch.isArchived && doc.isArchived) {
    doc.isArchived = false;
    doc.archivedAt = null;
  }
  await doc.save();

  cleanupRemovedImages(previousImages, merged.images);
  revalidateStorefront("products", "categories");
  return getAdminProduct(id);
}

/**
 * "Delete" archives the product: it disappears from the store and admin lists
 * but stays in the database so past orders still resolve.
 */
export async function archiveProduct(id: string): Promise<AdminProductDTO> {
  const doc = await Product.findById(id);
  if (!doc) throw ApiError.notFound("Product not found.");
  if (!doc.isArchived) {
    doc.isArchived = true;
    doc.isActive = false;
    doc.isFeatured = false;
    doc.archivedAt = new Date();
    await doc.save();
    revalidateStorefront("products", "categories");
  }
  return getAdminProduct(id);
}

export async function restoreProduct(id: string): Promise<AdminProductDTO> {
  const doc = await Product.findById(id);
  if (!doc) throw ApiError.notFound("Product not found.");
  if (doc.isArchived) {
    doc.isArchived = false;
    doc.archivedAt = null;
    // Restored products come back hidden so the admin can review them first.
    doc.isActive = false;
    await doc.save();
    revalidateStorefront("products", "categories");
  }
  return getAdminProduct(id);
}

/* --------------------------------------------------------------- Inventory */

function stockState(stock: number, threshold: number): InventoryRow["state"] {
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}

/** One row per sellable unit: the product itself, or each of its variants. */
export function inventoryRows(product: ProductLean): InventoryRow[] {
  const base = {
    productId: product._id.toString(),
    productName: product.name,
    productSlug: product.slug,
    image: product.images[0]?.url ?? null,
    categoryName: product.category && "name" in product.category ? product.category.name : null,
    lowStockThreshold: product.lowStockThreshold,
  };
  if (!product.variants.length) {
    return [
      {
        ...base,
        variantId: null,
        variantLabel: null,
        sku: null,
        stock: product.stock,
        isActive: product.isActive,
        state: stockState(product.stock, product.lowStockThreshold),
      },
    ];
  }
  return product.variants.map((variant) => ({
    ...base,
    variantId: variant._id.toString(),
    variantLabel: variantLabel(variant.attributes),
    sku: variant.sku ?? null,
    stock: variant.stock,
    isActive: product.isActive && variant.isActive,
    state: stockState(variant.stock, product.lowStockThreshold),
  }));
}

export async function listInventory(query: InventoryQuery): Promise<Paginated<InventoryRow>> {
  const filter: QueryFilter<ProductDoc> = { isArchived: false, ...searchFilter(query.q) };
  if (query.category) filter.category = new Types.ObjectId(query.category);

  const products = await Product.find(filter)
    .select("name slug images category variants stock lowStockThreshold isActive")
    .sort({ name: 1 })
    .populate("category", CATEGORY_FIELDS)
    .lean<ProductLean[]>();

  const rank: Record<InventoryRow["state"], number> = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
  const rows = products
    .flatMap(inventoryRows)
    .filter((row) => query.state === "all" || row.state === query.state)
    .sort((a, b) => rank[a.state] - rank[b.state] || a.stock - b.stock || a.productName.localeCompare(b.productName));

  const start = (query.page - 1) * query.limit;
  return paginate(rows.slice(start, start + query.limit), rows.length, query.page, query.limit);
}

/** Sets the absolute stock of a product or one of its variants. Retries on concurrent edits. */
export async function setStock(productId: string, variantId: string | null | undefined, stock: number): Promise<AdminProductDTO> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await Product.findById(productId);
    if (!doc) throw ApiError.notFound("Product not found.");
    const variants = doc.variants as Types.DocumentArray<ProductVariantDoc>;

    if (variants.length) {
      if (!variantId) throw ApiError.badRequest("Choose which variant to update.");
      const variant = variants.id(variantId);
      if (!variant) throw ApiError.notFound("Variant not found.");
      variant.stock = stock;
    } else {
      if (variantId) throw ApiError.badRequest("This product has no variants.");
      doc.stock = stock;
    }

    try {
      await doc.save();
      revalidateStorefront("products");
      return getAdminProduct(productId);
    } catch (error) {
      if ((error as Error).name === "VersionError" && attempt < 2) continue;
      throw error;
    }
  }
  throw ApiError.conflict("Stock was changed by someone else. Please try again.", "STALE_WRITE");
}
