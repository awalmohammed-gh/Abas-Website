import { Schema, model, type Types } from "mongoose";
import type { NotificationPreferences } from "@aba-mart/shared";

/**
 * A browser's Web Push subscription. The endpoint and keys are bearer
 * credentials for sending to that browser: they are never returned by the API.
 */
export interface PushSubscriptionDoc {
  _id: Types.ObjectId;
  endpoint: string;
  /** sha256 of the endpoint, used for lookups and uniqueness. */
  endpointHash: string;
  keys: { p256dh: string; auth: string };
  /** Guest session (CustomerSession _id) that created or last refreshed the subscription. */
  anonymousSubscriberId: Types.ObjectId;
  preferences: NotificationPreferences;
  isActive: boolean;
  failureCount: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastError: string;
  /** When set, the record is deleted 30 days later. */
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionDoc>(
  {
    endpoint: { type: String, required: true, maxlength: 1000 },
    endpointHash: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true, maxlength: 120 },
      auth: { type: String, required: true, maxlength: 60 },
    },
    anonymousSubscriberId: { type: Schema.Types.ObjectId, ref: "CustomerSession", required: true },
    preferences: {
      newProducts: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    failureCount: { type: Number, default: 0 },
    lastSuccessAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
    lastError: { type: String, default: "", maxlength: 300 },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

pushSubscriptionSchema.index({ endpointHash: 1 }, { unique: true });
// Delivery walks active subscriptions in _id order.
pushSubscriptionSchema.index({ isActive: 1, _id: 1 });
pushSubscriptionSchema.index({ anonymousSubscriberId: 1, isActive: 1 });
// Expired-subscription cleanup.
pushSubscriptionSchema.index({ deactivatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const PushSubscription = model<PushSubscriptionDoc>("PushSubscription", pushSubscriptionSchema);
