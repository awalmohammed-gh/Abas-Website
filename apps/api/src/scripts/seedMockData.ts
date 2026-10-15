/**
 * Loads the starter catalogue from /data into the database.
 *
 *   npm run seed:mock             add categories and products (skips ones that already exist)
 *   npm run seed:mock -- --remove remove the seeded catalogue again
 *
 * Images are uploaded to Cloudinary under fixed ids, so running it twice
 * doesn't create duplicates. Existing products are never overwritten, so edits
 * made in the admin portal are kept.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Types } from "mongoose";
import { productInputSchema, slugify } from "@aba-mart/shared";
import { env } from "../config/env.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Category } from "../models/Category.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { deleteImages, uploadLocalImage } from "../services/imageService.js";
import { revalidateStorefront } from "../services/revalidationService.js";
import { getSettingsDoc } from "../services/settingsService.js";
import { Settings, SETTINGS_KEY } from "../models/Settings.js";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, type MockProduct } from "./mockCatalog.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const dataDir = process.env.MOCK_DATA_DIR ? path.resolve(process.env.MOCK_DATA_DIR) : path.join(repoRoot, "data");
const toPesewas = (cedis: number) => Math.round(cedis * 100);
const imageName = (file: string) => `mock-${path.parse(file).name}`;

/** Spreads the mock stock total across sizes (any remainder goes to the first sizes). */
function splitStock(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  return Array.from({ length: parts }, (_, i) => base + (i < total % parts ? 1 : 0));
}

function productPayload(mock: MockProduct, categoryId: string, image: { url: string; publicId: string; width?: number; height?: number }) {
  const regular = toPesewas(mock.price);
  const discount = mock.offerPrice !== null ? toPesewas(mock.offerPrice) : null;
  const stocks = splitStock(mock.stock, Math.max(1, mock.sizes.length));
  return productInputSchema.parse({
    name: mock.name,
    slug: slugify(mock.name),
    description: mock.description,
    category: categoryId,
    price: discount ?? regular,
    compareAtPrice: discount !== null ? regular : null,
    images: [{ ...image, alt: mock.name }],
    options: mock.sizes.length ? [{ name: "Size", values: mock.sizes }] : [],
    variants: mock.sizes.map((size, i) => ({ attributes: [{ name: "Size", value: size }], stock: stocks[i]! })),
    stock: mock.sizes.length ? 0 : mock.stock,
    isFeatured: mock.bestseller,
    isActive: true,
  });
}

async function seed(): Promise<void> {
  if (!existsSync(dataDir)) throw new Error(`Mock data folder not found: ${dataDir} (set MOCK_DATA_DIR)`);

  // Categories
  const categoryIds = new Map<string, string>();
  for (const mock of MOCK_CATEGORIES) {
    const existing = await Category.findOne({ slug: mock.slug });
    if (existing) {
      categoryIds.set(mock.slug, existing.id as string);
      continue;
    }
    const created = await Category.create({ ...mock, isActive: true });
    categoryIds.set(mock.slug, created.id as string);
    console.log(`+ category ${mock.name}`);
  }

  // Products
  let added = 0;
  for (const mock of MOCK_PRODUCTS) {
    const slug = slugify(mock.name);
    if (await Product.exists({ slug })) {
      console.log(`= ${mock.name} (already exists, left unchanged)`);
      continue;
    }
    const file = path.join(dataDir, mock.image);
    if (!existsSync(file)) throw new Error(`Missing image ${file}`);
    const image = await uploadLocalImage(file, "products", imageName(mock.image));
    const input = productPayload(mock, categoryIds.get(mock.category)!, image);

    const doc = new Product({ ...input, category: new Types.ObjectId(input.category), slug });
    await doc.save();
    added++;
    console.log(`+ ${mock.name}`);
  }

  // Category tiles use the first product photo in each category.
  for (const mock of MOCK_CATEGORIES) {
    const category = await Category.findOne({ slug: mock.slug });
    if (!category || category.image) continue;
    const first = await Product.findOne({ category: category._id, isArchived: false }).sort({ createdAt: 1 }).lean();
    if (first?.images[0]) {
      category.image = first.images[0];
      await category.save();
    }
  }

  // Make sure checkout has a WhatsApp number to send orders to.
  const settings = await getSettingsDoc();
  if (!settings.whatsappNumber && env.STORE_WHATSAPP_NUMBER) {
    await Settings.updateOne({ key: SETTINGS_KEY }, { $set: { whatsappNumber: env.STORE_WHATSAPP_NUMBER } });
    console.log(`WhatsApp number set to +${env.STORE_WHATSAPP_NUMBER}`);
  }

  console.log(`\nDone: ${added} product(s) added.`);
}

async function remove(): Promise<void> {
  const slugs = MOCK_PRODUCTS.map((p) => slugify(p.name));
  const products = await Product.find({ slug: { $in: slugs } });
  let deleted = 0;
  let archived = 0;
  for (const product of products) {
    // Products that appear in orders are archived, so order history stays intact.
    if (await Order.exists({ "items.product": product._id })) {
      product.isArchived = true;
      product.isActive = false;
      product.archivedAt = new Date();
      await product.save();
      archived++;
    } else {
      await deleteImages(product.images.filter((i) => i.publicId.includes("/mock-")).map((i) => i.publicId));
      await product.deleteOne();
      deleted++;
    }
  }
  for (const mock of MOCK_CATEGORIES) {
    const category = await Category.findOne({ slug: mock.slug });
    if (category && !(await Product.exists({ category: category._id }))) {
      await category.deleteOne();
      console.log(`- category ${mock.name}`);
    }
  }
  console.log(`\nRemoved ${deleted} product(s), archived ${archived} that appear in orders.`);
}

async function main(): Promise<void> {
  await connectDatabase();
  try {
    if (process.argv.includes("--remove")) await remove();
    else await seed();
    await revalidateStorefront("products", "categories", "settings");
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error: unknown) => {
  console.error("Seeding failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
