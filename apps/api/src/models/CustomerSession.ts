import { Schema, model, type Types } from "mongoose";

export interface GuestCartItem {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface CustomerSessionDoc {
  _id: Types.ObjectId;
  sessionIdHash: string;
  cart: GuestCartItem[];
  cartRevision: number;
  expiresAt: Date;
  lastActiveAt: Date;
  recoveryTokenHash: string | null;
  recoveryExpiresAt: Date | null;
  purgeAfter: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<CustomerSessionDoc>({
  sessionIdHash: { type: String, required: true },
  cart: {
    type: [new Schema<GuestCartItem>({
      productId: { type: String, required: true },
      variantId: { type: String, default: null },
      quantity: { type: Number, required: true, min: 1, max: 99 },
    }, { _id: false })],
    default: [],
  },
  cartRevision: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  lastActiveAt: { type: Date, required: true },
  recoveryTokenHash: { type: String, default: null },
  recoveryExpiresAt: { type: Date, default: null },
  purgeAfter: { type: Date, required: true },
}, { timestamps: true });

schema.index({ sessionIdHash: 1 }, { unique: true });
schema.index({ recoveryTokenHash: 1 }, { unique: true, partialFilterExpression: { recoveryTokenHash: { $type: "string" } } });
schema.index({ purgeAfter: 1 }, { expireAfterSeconds: 0 });

export const CustomerSession = model<CustomerSessionDoc>("CustomerSession", schema);
