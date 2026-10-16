import { Schema, model, type Types } from "mongoose";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_STOREFRONT_SETTINGS,
  type ImageAsset,
  type NotificationSettings,
  type SocialLinks,
  type StorefrontSettings,
} from "@aba-mart/shared";
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
  whatsappOrderingEnabled: boolean;
  whatsappGreeting: string;
  whatsappSupportMessage: string;
  notifications: NotificationSettings;
  storefront: StorefrontSettings;
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
    whatsappOrderingEnabled: { type: Boolean, default: true },
    whatsappGreeting: { type: String, default: "", trim: true, maxlength: 120 },
    whatsappSupportMessage: { type: String, default: "", trim: true, maxlength: 300 },
    notifications: {
      enabled: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.enabled },
      newProducts: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.newProducts },
      promotions: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.promotions },
      adminOrderAlerts: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.adminOrderAlerts },
      promptDelaySeconds: { type: Number, default: DEFAULT_NOTIFICATION_SETTINGS.promptDelaySeconds, min: 5, max: 600 },
    },
    storefront: {
      showFeaturedProducts: { type: Boolean, default: DEFAULT_STOREFRONT_SETTINGS.showFeaturedProducts },
      showNewArrivals: { type: Boolean, default: DEFAULT_STOREFRONT_SETTINGS.showNewArrivals },
    },
  },
  { timestamps: true },
);

settingsSchema.index({ key: 1 }, { unique: true });

export const Settings = model<SettingsDoc>("Settings", settingsSchema);
