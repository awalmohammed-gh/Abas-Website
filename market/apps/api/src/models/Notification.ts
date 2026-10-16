import { Schema, model, type Types } from "mongoose";
import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_TYPES,
  type NotificationAudience,
  type NotificationType,
  type PushDeliveryStatus,
} from "@aba-mart/shared";

export interface PushDeliveryDoc {
  status: PushDeliveryStatus;
  targeted: number;
  accepted: number;
  failed: number;
  deactivated: number;
  /** Last subscription _id processed, so an interrupted delivery resumes instead of starting over. */
  cursor: Types.ObjectId | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  /** Last few distinct, credential-free error descriptions. */
  recentErrors: string[];
}

export interface NotificationDoc {
  _id: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  audience: NotificationAudience;
  targetUrl: string;
  status: "draft" | "published";
  sendPush: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdBy: Types.ObjectId | null;
  createdByName: string;
  /** Set on admin order alerts. */
  order: Types.ObjectId | null;
  /** Private order updates are visible only to this guest session. */
  guestSession: Types.ObjectId | null;
  /** Prevents the same system event from creating two notifications. */
  dedupeKey: string | null;
  push: PushDeliveryDoc;
  createdAt: Date;
  updatedAt: Date;
}

const pushDeliverySchema = new Schema<PushDeliveryDoc>(
  {
    status: { type: String, enum: ["not_sent", "queued", "sending", "completed", "failed"], default: "not_sent" },
    targeted: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    deactivated: { type: Number, default: 0 },
    cursor: { type: Schema.Types.ObjectId, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    recentErrors: { type: [String], default: [] },
  },
  { _id: false },
);

const notificationSchema = new Schema<NotificationDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, default: "", trim: true, maxlength: 300 },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    audience: { type: String, enum: NOTIFICATION_AUDIENCES, required: true },
    targetUrl: { type: String, default: "", maxlength: 300 },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    sendPush: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    createdByName: { type: String, default: "" },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    guestSession: { type: Schema.Types.ObjectId, ref: "CustomerSession", default: null },
    dedupeKey: { type: String, default: null },
    push: { type: pushDeliverySchema, default: () => ({}) },
  },
  { timestamps: true },
);

// Customer feed: equality on status, $in on audience and type, newest first.
notificationSchema.index({ status: 1, audience: 1, type: 1, publishedAt: -1 });
notificationSchema.index({ guestSession: 1, audience: 1, status: 1, publishedAt: -1 });
// Admin list, newest first.
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } });
// Push worker picks up queued or interrupted deliveries.
notificationSchema.index({ "push.status": 1, publishedAt: 1 });

export const Notification = model<NotificationDoc>("Notification", notificationSchema);
