import { Schema, model, type Types } from "mongoose";
import { LIMITS, type ImageAsset, type ProductOption, type VariantAttribute } from "@aba-mart/shared";
import { imageAssetSchema, integerValidator } from "./common.js";

export interface ProductVariantDoc {
  _id: Types.ObjectId;
  attributes: VariantAttribute[];
  sku: string | null;
  /** Selling price override in pesewas. */
  price: number | null;
  compareAtPrice: number | null;
  stock: number;
  isActive: boolean;
}

export interface ProductDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: Types.ObjectId;
  subCategory: string;
  /** Selling price in pesewas. */
  price: number;
  /** Original price in pesewas, shown struck through when higher than price. */
  compareAtPrice: number | null;
  images: ImageAsset[];
  options: ProductOption[];
  variants: Types.DocumentArray<ProductVariantDoc> | ProductVariantDoc[];
  /** For products with variants this is kept equal to the sum of active variant stock. */
  stock: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  isActive: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<ProductVariantDoc>({
  attributes: {
    type: [
      new Schema<VariantAttribute>(
        {
          name: { type: String, required: true, trim: true, maxlength: 30 },
          value: { type: String, required: true, trim: true, maxlength: 40 },
        },
        { _id: false },
      ),
    ],
    default: [],
  },
  sku: { type: String, default: null, trim: true, maxlength: 60 },
  price: { type: Number, default: null, min: 0, validate: integerValidator },
  compareAtPrice: { type: Number, default: null, min: 0, validate: integerValidator },
  stock: { type: Number, required: true, min: 0, validate: integerValidator },
  isActive: { type: Boolean, default: true },
});

const optionSchema = new Schema<ProductOption>(
  {
    name: { type: String, required: true, trim: true, maxlength: 30 },
    values: { type: [String], default: [] },
  },
  { _id: false },
);

const productSchema = new Schema<ProductDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 140 },
    description: { type: String, default: "", maxlength: 5000 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subCategory: { type: String, default: "", trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0, max: LIMITS.maxPriceInPesewas, validate: integerValidator },
    compareAtPrice: { type: Number, default: null, min: 0, validate: integerValidator },
    images: { type: [imageAssetSchema], default: [] },
    options: { type: [optionSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    stock: { type: Number, default: 0, min: 0, validate: integerValidator },
    lowStockThreshold: { type: Number, default: LIMITS.defaultLowStockThreshold, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    // Concurrent stock edits fail with a VersionError instead of silently overwriting each other.
    optimisticConcurrency: true,
  },
);

productSchema.pre("validate", function syncVariantStock() {
  const variants = this.variants as ProductVariantDoc[];
  if (variants.length) {
    this.stock = variants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0);
  }
});

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ isArchived: 1, isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ isArchived: 1, isActive: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ isArchived: 1, isActive: 1, price: 1 });
productSchema.index({ name: "text", description: "text" }, { weights: { name: 5, description: 1 } });

export const Product = model<ProductDoc>("Product", productSchema);
