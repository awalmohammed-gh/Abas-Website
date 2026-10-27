import mongoose, { Types, type ClientSession } from "mongoose";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  formatGHS,
  type AdminNotificationDTO,
  type AdminNotificationSummary,
  type CustomerNotificationDTO,
  type CustomerNotificationType,
  type NotificationAudience,
  type NotificationFeedDTO,
  type NotificationInput,
  type NotificationPreferences,
  type NotificationType,
  type OrderStatus,
  type Paginated,
} from "@aba-mart/shared";
import type { AuthenticatedAdmin } from "../middleware/adminAuth.js";
import { CustomerSession, type CustomerSessionDoc } from "../models/CustomerSession.js";
import { Notification, type NotificationDoc } from "../models/Notification.js";
import { NotificationReadState } from "../models/NotificationReadState.js";
import { Order, type OrderDoc } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Counter } from "../models/Counter.js";
import { ApiError } from "../utils/ApiError.js";
import { toISO } from "../utils/serialize.js";
import { DEFAULT_PREFERENCES, hasActiveSubscription, isPushConfigured, schedulePushDeliveries, updateSubscriptionPreferences } from "./pushService.js";
import { getSettingsDoc } from "./settingsService.js";

const FEED_LIMIT = 20;
const FEED_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
const ADMIN_UNREAD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const guestRecipient = (guest: CustomerSessionDoc) => `guest:${guest._id.toString()}`;
const adminRecipient = (admin: AuthenticatedAdmin) => `admin:${admin.id}`;

function notExpired(now: Date) {
  return { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };
}

async function readIds(recipientId: string, ids: Types.ObjectId[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = await NotificationReadState.find({ recipientId, notification: { $in: ids } }, { notification: 1 }).lean<{ notification: Types.ObjectId }[]>();
  return new Set(rows.map((row) => row.notification.toString()));
}

/* ------------------------------------------------------------------ Customers */

/**
 * The customer notification feed. Works without a guest session (public items
 * only); with one it adds this visitor's read state and preferences. Nothing in
 * it is private to another visitor: order updates require their owning session.
 */
export async function getCustomerFeed(guest: CustomerSessionDoc | null, all = false): Promise<NotificationFeedDTO> {
  const [settings, latestProduct, deletions] = await Promise.all([
    getSettingsDoc(),
    Product.findOne().sort({ updatedAt: -1 }).select("updatedAt").lean<{ updatedAt: Date }>(),
    Counter.findById("catalog-deletions").lean(),
  ]);
  const catalogVersion = `${latestProduct ? toISO(latestProduct.updatedAt) : "empty"}:${deletions?.seq ?? 0}`;
  const store = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings.notifications };
  const settingsVersion = toISO(settings.updatedAt);
  const available = { newProducts: store.newProducts, promotions: store.promotions };
  const preferences = guest ? { ...DEFAULT_PREFERENCES, ...guest.notificationPrefs } : null;
  const promptDelaySeconds = store.promptDelaySeconds;

  if (!store.enabled) {
    return { enabled: false, items: [], unreadCount: 0, preferences, available, settingsVersion, catalogVersion, promptDelaySeconds };
  }

  const prefs = preferences ?? DEFAULT_PREFERENCES;
  const types: CustomerNotificationType[] = ["announcement", "important"];
  if (store.newProducts && prefs.newProducts) types.push("new_product");
  // Promotions only reach visitors who opted in.
  if (store.promotions && prefs.promotions) types.push("promotion");

  const audiences: NotificationAudience[] = ["public"];
  if (guest && (await hasActiveSubscription(guest._id))) audiences.push("push_subscribers");

  const now = new Date();
  const dismissed = guest ? await NotificationReadState.find({ recipientId: guestRecipient(guest), dismissedAt: { $type: "date" } }, { notification: 1 }).lean<{ notification: Types.ObjectId }[]>() : [];
  const docs = await Notification.find({
    status: "published",
    $and: [
      { $or: [
        { audience: { $in: audiences }, type: { $in: types } },
        ...(guest ? [{ audience: "customer" as const, type: "order_update" as const, guestSession: guest._id }] : []),
      ] },
      notExpired(now),
    ],
    _id: { $nin: dismissed.map((row) => row.notification) },
    publishedAt: { $gte: new Date(now.getTime() - FEED_WINDOW_MS) },
  })
    .sort({ publishedAt: -1 })
    .limit(all ? 0 : FEED_LIMIT)
    .lean<NotificationDoc[]>();

  const read = guest ? await readIds(guestRecipient(guest), docs.map((d) => d._id)) : new Set<string>();
  const items: CustomerNotificationDTO[] = docs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message,
    type: doc.type as CustomerNotificationType,
    targetUrl: doc.targetUrl,
    publishedAt: toISO(doc.publishedAt)!,
    read: read.has(doc._id.toString()),
  }));
  return { enabled: true, items, unreadCount: items.filter((i) => !i.read).length, preferences, available, settingsVersion, catalogVersion, promptDelaySeconds };
}

async function markRead(recipientId: string, ids: Types.ObjectId[]): Promise<number> {
  if (!ids.length) return 0;
  const now = new Date();
  const result = await NotificationReadState.bulkWrite(
    ids.map((id) => ({
      updateOne: {
        filter: { recipientId, notification: id },
        update: { $setOnInsert: { recipientId, notification: id, readAt: now } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return result.upsertedCount;
}

/** Marks notifications read for this visitor only. Ids outside their feed are ignored. */
export async function markCustomerRead(guest: CustomerSessionDoc, input: { ids?: string[]; all?: boolean }): Promise<{ marked: number }> {
  const feed = await getCustomerFeed(guest);
  const visible = new Set(feed.items.map((i) => i.id));
  const ids = (input.all ? [...visible] : (input.ids ?? []).filter((id) => visible.has(id))).map((id) => new Types.ObjectId(id));
  return { marked: await markRead(guestRecipient(guest), ids) };
}

/** Dismisses only the caller's inbox copies, including public announcements. */
export async function deleteCustomerNotifications(guest: CustomerSessionDoc, input: { ids?: string[]; all?: boolean }): Promise<{ deleted: number }> {
  const feed = await getCustomerFeed(guest, true);
  const wanted = new Set(input.ids ?? []);
  const ids = feed.items.filter((item) => input.all || wanted.has(item.id)).map((item) => new Types.ObjectId(item.id));
  if (!ids.length) return { deleted: 0 };
  const now = new Date();
  await NotificationReadState.bulkWrite(ids.map((notification) => ({ updateOne: {
    filter: { recipientId: guestRecipient(guest), notification },
    update: { $set: { readAt: now, dismissedAt: now }, $setOnInsert: { recipientId: guestRecipient(guest), notification } },
    upsert: true,
  } })), { ordered: false });
  return { deleted: ids.length };
}

export async function updateCustomerPreferences(guest: CustomerSessionDoc, preferences: NotificationPreferences): Promise<NotificationPreferences> {
  const next = { newProducts: preferences.newProducts, promotions: preferences.promotions };
  const result = await CustomerSession.updateOne({ _id: guest._id, expiresAt: { $gt: new Date() } }, { $set: { notificationPrefs: next } });
  if (!result.matchedCount) throw ApiError.unauthorized("Your guest session has ended. Reload the page.", "GUEST_SESSION_EXPIRED");
  await updateSubscriptionPreferences(guest._id, next);
  return next;
}

/* --------------------------------------------------------------------- Admin */

async function orderStatuses(docs: NotificationDoc[]): Promise<Map<string, OrderStatus>> {
  const ids = docs.map((d) => d.order).filter((id): id is Types.ObjectId => id !== null);
  if (!ids.length) return new Map();
  const orders = await Order.find({ _id: { $in: ids } }, { status: 1 }).lean<Pick<OrderDoc, "_id" | "status">[]>();
  return new Map(orders.map((o) => [o._id.toString(), o.status]));
}

function toAdminDTO(doc: NotificationDoc, read: Set<string>, statuses: Map<string, OrderStatus>): AdminNotificationDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message,
    type: doc.type,
    audience: doc.audience,
    targetUrl: doc.targetUrl,
    status: doc.status,
    sendPush: doc.sendPush,
    publishedAt: toISO(doc.publishedAt),
    expiresAt: toISO(doc.expiresAt),
    createdAt: toISO(doc.createdAt)!,
    createdBy: doc.createdBy ? { id: doc.createdBy.toString(), name: doc.createdByName } : null,
    orderId: doc.order?.toString() ?? null,
    orderStatus: doc.order ? statuses.get(doc.order.toString()) ?? null : null,
    read: read.has(doc._id.toString()),
    push: {
      status: doc.push?.status ?? "not_sent",
      targeted: doc.push?.targeted ?? 0,
      accepted: doc.push?.accepted ?? 0,
      failed: doc.push?.failed ?? 0,
      deactivated: doc.push?.deactivated ?? 0,
      startedAt: toISO(doc.push?.startedAt),
      finishedAt: toISO(doc.push?.finishedAt),
      errors: doc.push?.recentErrors ?? [],
    },
  };
}

async function toAdminDTOs(docs: NotificationDoc[], admin: AuthenticatedAdmin): Promise<AdminNotificationDTO[]> {
  const [read, statuses] = await Promise.all([readIds(adminRecipient(admin), docs.map((d) => d._id)), orderStatuses(docs)]);
  return docs.map((doc) => toAdminDTO(doc, read, statuses));
}

export interface AdminNotificationQuery {
  page: number;
  limit: number;
  scope: "all" | "alerts" | "customer";
  type?: NotificationType;
}

function adminScopeFilter(scope: AdminNotificationQuery["scope"]): Record<string, unknown> {
  return scope === "alerts" ? { audience: "admin" } : scope === "customer" ? { audience: { $in: ["public", "push_subscribers", "customer"] } } : {};
}

export async function listAdminNotifications(admin: AuthenticatedAdmin, query: AdminNotificationQuery): Promise<Paginated<AdminNotificationDTO>> {
  const filter = adminScopeFilter(query.scope);
  if (query.type) filter.type = query.type;
  const [docs, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean<NotificationDoc[]>(),
    Notification.countDocuments(filter),
  ]);
  return { items: await toAdminDTOs(docs, admin), page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

/** Small, cheap payload for the dashboard bell, polled every few seconds. */
export async function getAdminSummary(admin: AuthenticatedAdmin): Promise<AdminNotificationSummary> {
  const since = new Date(Date.now() - ADMIN_UNREAD_WINDOW_MS);
  const recent = await Notification.find({ status: "published", audience: "admin", publishedAt: { $gte: since } }, { _id: 1 })
    .sort({ publishedAt: -1 })
    .limit(500)
    .lean<{ _id: Types.ObjectId }[]>();
  const read = await readIds(adminRecipient(admin), recent.map((d) => d._id));
  const latest = await Notification.find({ status: "published", audience: "admin" }).sort({ publishedAt: -1 }).limit(6).lean<NotificationDoc[]>();
  return { unreadCount: recent.filter((d) => !read.has(d._id.toString())).length, latest: await toAdminDTOs(latest, admin) };
}

export async function markAdminRead(admin: AuthenticatedAdmin, input: { ids?: string[]; all?: boolean }): Promise<{ marked: number }> {
  let ids: Types.ObjectId[];
  if (input.all) {
    const since = new Date(Date.now() - ADMIN_UNREAD_WINDOW_MS);
    ids = (await Notification.find({ status: "published", audience: "admin", publishedAt: { $gte: since } }, { _id: 1 }).limit(500).lean<{ _id: Types.ObjectId }[]>()).map((d) => d._id);
  } else {
    ids = (input.ids ?? []).map((id) => new Types.ObjectId(id));
  }
  return { marked: await markRead(adminRecipient(admin), ids) };
}

async function assertPublishable(type: NotificationType): Promise<void> {
  const settings = await getSettingsDoc();
  const store = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings.notifications };
  if (!store.enabled) throw ApiError.conflict("Customer notifications are switched off in Settings → Notifications.", "NOTIFICATIONS_DISABLED");
  if (type === "new_product" && !store.newProducts) throw ApiError.conflict("New-product notifications are switched off in Settings → Notifications.", "NOTIFICATION_TYPE_DISABLED");
  if (type === "promotion" && !store.promotions) throw ApiError.conflict("Promotional notifications are switched off in Settings → Notifications.", "NOTIFICATION_TYPE_DISABLED");
}

async function getAdminNotification(admin: AuthenticatedAdmin, id: string): Promise<AdminNotificationDTO> {
  const doc = await Notification.findById(id).lean<NotificationDoc>();
  if (!doc) throw ApiError.notFound("Notification not found.");
  return (await toAdminDTOs([doc], admin))[0]!;
}

export async function createNotification(admin: AuthenticatedAdmin, input: NotificationInput): Promise<AdminNotificationDTO> {
  if (input.publish) await assertPublishable(input.type);
  const created = await Notification.create({
    title: input.title,
    message: input.message,
    type: input.type,
    audience: input.audience,
    targetUrl: input.targetUrl,
    sendPush: input.sendPush,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    createdBy: new Types.ObjectId(admin.id),
    createdByName: admin.name,
    status: "draft",
  });
  if (input.publish) return publishNotification(admin, created._id.toString());
  return getAdminNotification(admin, created._id.toString());
}

export async function updateDraft(admin: AuthenticatedAdmin, id: string, input: NotificationInput): Promise<AdminNotificationDTO> {
  const result = await Notification.updateOne(
    { _id: id, status: "draft", audience: { $in: ["public", "push_subscribers"] } },
    {
      $set: {
        title: input.title,
        message: input.message,
        type: input.type,
        audience: input.audience,
        targetUrl: input.targetUrl,
        sendPush: input.sendPush,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    },
    { runValidators: true },
  );
  if (!result.matchedCount) throw ApiError.conflict("Only unpublished drafts can be edited.", "NOT_A_DRAFT");
  if (input.publish) return publishNotification(admin, id);
  return getAdminNotification(admin, id);
}

/**
 * Publishes a draft once. The status change is atomic, so double clicks or
 * retries never publish (or push) the same notification twice.
 */
export async function publishNotification(admin: AuthenticatedAdmin, id: string): Promise<AdminNotificationDTO> {
  const doc = await Notification.findById(id).lean<NotificationDoc>();
  if (!doc) throw ApiError.notFound("Notification not found.");
  if (doc.audience === "admin" || doc.audience === "customer") throw ApiError.badRequest("System order notifications cannot be published to everyone.");
  if (doc.status === "published") return getAdminNotification(admin, id);
  if (doc.expiresAt && doc.expiresAt <= new Date()) throw ApiError.conflict("This notification's end date has passed. Edit the draft first.", "NOTIFICATION_EXPIRED");
  await assertPublishable(doc.type);

  const push = doc.sendPush && isPushConfigured() ? "queued" : "not_sent";
  const result = await Notification.updateOne(
    { _id: id, status: "draft" },
    { $set: { status: "published", publishedAt: new Date(), "push.status": push } },
  );
  if (result.modifiedCount && push === "queued") schedulePushDeliveries();
  return getAdminNotification(admin, id);
}

/** Stops showing a published notification in customer feeds from now on. */
export async function endNotification(admin: AuthenticatedAdmin, id: string): Promise<AdminNotificationDTO> {
  const result = await Notification.updateOne({ _id: id, status: "published", audience: { $in: ["public", "push_subscribers"] } }, { $set: { expiresAt: new Date() } });
  if (!result.matchedCount) throw ApiError.notFound("Published notification not found.");
  return getAdminNotification(admin, id);
}

export async function deleteNotification(id: string): Promise<void> {
  const result = await deleteAdminNotifications({ ids: [id], scope: "all" });
  if (result.skipped) throw ApiError.conflict("This notification is still being sent. Try again when delivery finishes.", "PUSH_IN_PROGRESS");
  if (!result.deleted) throw ApiError.notFound("Notification not found.");
}

/** Deletes selected records or every record in a scope; active deliveries are skipped. */
export async function deleteAdminNotifications(input: { ids?: string[]; all?: boolean; scope: AdminNotificationQuery["scope"] }): Promise<{ deleted: number; skipped: number }> {
  return mongoose.connection.transaction(async (session) => {
    const filter = { ...adminScopeFilter(input.scope), ...(input.all ? {} : { _id: { $in: input.ids ?? [] } }) };
    const docs = await Notification.find(filter, { _id: 1, "push.status": 1 }).session(session).lean<NotificationDoc[]>();
    const ids = docs.filter((doc) => doc.push?.status !== "queued" && doc.push?.status !== "sending").map((doc) => doc._id);
    const result = await Notification.deleteMany({ _id: { $in: ids } }, { session });
    await NotificationReadState.deleteMany({ notification: { $in: ids } }, { session });
    return { deleted: result.deletedCount, skipped: docs.length - ids.length };
  });
}

/** Runs in the order transaction: failed changes and retries cannot create ghost updates. */
export async function createCustomerOrderUpdate(order: OrderDoc, session: ClientSession): Promise<void> {
  if (!order.guestSession) return;
  const settings = await getSettingsDoc();
  const sendPush = isPushConfigured() && settings.notifications?.enabled !== false;
  await Notification.create([{
    title: `Order ${order.orderReference}: ${order.status}`,
    message: `Your order is now ${order.status.toLowerCase()}. Open My orders for the latest details.`,
    type: "order_update",
    audience: "customer",
    guestSession: order.guestSession,
    order: order._id,
    targetUrl: `/my-orders?open=${order._id.toString()}`,
    status: "published",
    publishedAt: new Date(),
    dedupeKey: `order-update:${order._id.toString()}:${order.statusHistory.length}`,
    sendPush,
    createdByName: "System",
    push: { status: sendPush ? "queued" : "not_sent" },
  }], { session });
}

/* -------------------------------------------------------------- Order alerts */

/**
 * Tells admins a customer prepared a WhatsApp checkout request. This is not a
 * received or confirmed order: click-to-chat cannot tell us the message was sent.
 * The dedupe key makes repeated calls for the same order harmless.
 */
export async function createPendingCheckoutAlert(order: Pick<OrderDoc, "_id" | "orderReference" | "total" | "items" | "fulfillmentMethod">): Promise<void> {
  const settings = await getSettingsDoc();
  if (settings.notifications?.adminOrderAlerts === false) return;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const now = new Date();
  await Notification.updateOne(
    { dedupeKey: `checkout-pending:${order._id.toString()}` },
    {
      $setOnInsert: {
        title: `New pending checkout request · ${order.orderReference}`,
        message: `${itemCount} item${itemCount === 1 ? "" : "s"} · ${formatGHS(order.total)} · ${order.fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"}. Waiting for the customer's WhatsApp message. Not confirmed; stock has not been deducted.`,
        type: "order_alert",
        audience: "admin",
        targetUrl: `/admin/orders?open=${order._id.toString()}`,
        status: "published",
        sendPush: false,
        publishedAt: now,
        order: order._id,
        createdBy: null,
        createdByName: "System",
        push: { status: "not_sent", targeted: 0, accepted: 0, failed: 0, deactivated: 0, cursor: null, startedAt: null, finishedAt: null, recentErrors: [] },
      },
    },
    { upsert: true },
  );
}
