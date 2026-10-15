import { Schema } from "mongoose";
import type { ImageAsset } from "@aba-mart/shared";

export const imageAssetSchema = new Schema<ImageAsset>(
  {
    url: { type: String, required: true, trim: true, maxlength: 500 },
    publicId: { type: String, required: true, trim: true, maxlength: 300 },
    alt: { type: String, trim: true, maxlength: 160 },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
  },
  { _id: false },
);

export const integerValidator = {
  validator: (value: unknown) => value === null || value === undefined || Number.isSafeInteger(value),
  message: "{PATH} must be a whole number",
};
