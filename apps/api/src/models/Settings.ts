import { Schema, model, type Types } from "mongoose";
import type { ImageAsset, SocialLinks } from "@aba-mart/shared";
import { imageAssetSchema } from "./common.js";

export const SETTINGS_KEY = "store";

export interface SettingsDoc {
  _id: Types.ObjectId;
  key: string;
  storeName: string;
  storeDescription: string;
  logo: ImageAsset | null;
  favicon: ImageAsset | null;
  whatsappNumber: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  openingHours: string;
  announcement: string;
  socialLinks: SocialLinks;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    key: { type: String, required: true, default: SETTINGS_KEY },
    storeName: { type: String, required: true, trim: true, maxlength: 60, default: "ABA Mart" },
    storeDescription: { type: String, default: "", trim: true, maxlength: 500 },
    logo: { type: imageAssetSchema, default: null },
    favicon: { type: imageAssetSchema, default: null },
    whatsappNumber: {
      type: String,
      default: "",
      validate: {
        validator: (v: string) => v === "" || /^[1-9]\d{7,14}$/.test(v),
        message: "WhatsApp number must be international digits without +",
      },
    },
    supportEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 120 },
    supportPhone: { type: String, default: "", trim: true, maxlength: 30 },
    address: { type: String, default: "", trim: true, maxlength: 200 },
    openingHours: { type: String, default: "", trim: true, maxlength: 200 },
    announcement: { type: String, default: "", trim: true, maxlength: 160 },
    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      x: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

settingsSchema.index({ key: 1 }, { unique: true });

export const Settings = model<SettingsDoc>("Settings", settingsSchema);
