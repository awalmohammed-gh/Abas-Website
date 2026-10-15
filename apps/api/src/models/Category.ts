import { Schema, model, type Types } from "mongoose";
import type { ImageAsset } from "@aba-mart/shared";
import { imageAssetSchema } from "./common.js";

export interface CategoryDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  image: ImageAsset | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 140 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    image: { type: imageAssetSchema, default: null },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1, displayOrder: 1, name: 1 });

export const Category = model<CategoryDoc>("Category", categorySchema);
