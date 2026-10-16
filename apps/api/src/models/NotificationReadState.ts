import { Schema, model, type Types } from "mongoose";

/**
 * One row per recipient per notification they have read. Public announcements
 * are stored once; only read receipts are per recipient.
 */
export interface NotificationReadStateDoc {
  _id: Types.ObjectId;
  notification: Types.ObjectId;
  /** "guest:<CustomerSession id>" or "admin:<Admin id>". */
  recipientId: string;
  readAt: Date;
  dismissedAt: Date | null;
}

const readStateSchema = new Schema<NotificationReadStateDoc>({
  notification: { type: Schema.Types.ObjectId, ref: "Notification", required: true },
  recipientId: { type: String, required: true, maxlength: 40 },
  readAt: { type: Date, required: true },
  dismissedAt: { type: Date, default: null },
});

readStateSchema.index({ recipientId: 1, notification: 1 }, { unique: true });
readStateSchema.index({ notification: 1 });
readStateSchema.index({ recipientId: 1, dismissedAt: 1, notification: 1 });
// Old receipts are not needed once their notifications have left the feeds.
readStateSchema.index({ readAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const NotificationReadState = model<NotificationReadStateDoc>("NotificationReadState", readStateSchema);
