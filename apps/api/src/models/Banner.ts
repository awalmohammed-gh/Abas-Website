import { Schema, model, type Types } from "mongoose";
import type { ImageAsset } from "@aba-mart/shared";
import { imageAssetSchema } from "./common.js";

export interface BannerDoc {
  _id: Types.ObjectId;
  title: string;
  description: string;
  desktopImage: ImageAsset;
  mobileImage: ImageAsset | null;
  buttonText: string;
  buttonLink: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<BannerDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 90 },
    description: { type: String, default: "", trim: true, maxlength: 220 },
    desktopImage: { type: imageAssetSchema, required: true },
    mobileImage: { type: imageAssetSchema, default: null },
    buttonText: { type: String, default: "", trim: true, maxlength: 30 },
    buttonLink: { type: String, default: "", trim: true, maxlength: 300 },
    displayOrder: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

bannerSchema.index({ isActive: 1, displayOrder: 1, createdAt: -1 });

export const Banner = model<BannerDoc>("Banner", bannerSchema);
