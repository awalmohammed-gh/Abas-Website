import { createHash } from "node:crypto";
import webpush, { WebPushError } from "web-push";
import type { Types } from "mongoose";
import type { NotificationPreferences, PushConfigDTO, PushSubscriberStats } from "@aba-mart/shared";
import { env } from "../config/env.js";
import { CustomerSession, type CustomerSessionDoc } from "../models/CustomerSession.js";
import { Notification, type NotificationDoc } from "../models/Notification.js";
import { PushSubscription, type PushSubscriptionDoc } from "../models/PushSubscription.js";
import { ApiError } from "../utils/ApiError.js";
import { getSettingsDoc } from "./settingsService.js";

if (env.vapid) webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);

const BATCH_SIZE = 200;
const CONCURRENCY = 20;
const MAX_CONSECUTIVE_FAILURES = 5;
const PUSH_TTL_SECONDS = 24 * 60 * 60;

/**
 * Browsers' push services. The server only ever sends to these hosts, so a
 * forged "subscription" cannot make the API call internal or arbitrary URLs.
 */
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^push\.services\.mozilla\.com$/,
  /^([a-z0-9-]+\.)*push\.apple\.com$/,
  /^([a-z0-9-]+\.)*notify\.windows\.com$/,
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && PUSH_SERVICE_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

const hashEndpoint = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

export const DEFAULT_PREFERENCES: NotificationPreferences = { newProducts: true, promotions: false };

export function isPushConfigured(): boolean {
  return env.vapid !== null;
}

export async function getPushConfig(): Promise<PushConfigDTO> {
  const settings = await getSettingsDoc();
  const enabled = isPushConfigured() && (settings.notifications?.enabled ?? true);
  return { enabled, publicKey: enabled ? env.vapid!.publicKey : null };
}

export async function subscribe(
  guest: CustomerSessionDoc,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  preferences: NotificationPreferences | undefined,
): Promise<{ subscribed: true; preferences: NotificationPreferences }> {
  if (!isPushConfigured()) throw new ApiError(503, "PUSH_NOT_CONFIGURED", "Push notifications are not available right now.");
  const settings = await getSettingsDoc();
  if (settings.notifications?.enabled === false) throw new ApiError(409, "NOTIFICATIONS_DISABLED", "The store is not sending notifications right now.");
  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    throw ApiError.badRequest("This browser's push service is not supported.");
  }

  const endpointHash = hashEndpoint(subscription.endpoint);
  const existing = await PushSubscription.findOne({ endpointHash }).lean<PushSubscriptionDoc>();
  // Only the browser knows both the endpoint and its auth secret; a mismatch means
  // someone is trying to take over another browser's subscription.
  if (existing?.isActive && existing.keys.auth !== subscription.keys.auth) {
    throw ApiError.conflict("This subscription could not be updated. Turn notifications off and on again.", "SUBSCRIPTION_CONFLICT");
  }

  const prefs = preferences ?? guest.notificationPrefs ?? DEFAULT_PREFERENCES;
  await PushSubscription.updateOne(
    { endpointHash },
    {
      $set: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        anonymousSubscriberId: guest._id,
        preferences: { newProducts: prefs.newProducts, promotions: prefs.promotions },
        isActive: true,
        failureCount: 0,
        deactivatedAt: null,
        lastError: "",
      },
    },
    { upsert: true },
  );
  return { subscribed: true, preferences: { newProducts: prefs.newProducts, promotions: prefs.promotions } };
}

/** Turns off this visitor's subscription for the given endpoint. Other visitors' subscriptions are untouched. */
export async function unsubscribe(guest: CustomerSessionDoc, endpoint: string): Promise<{ unsubscribed: boolean }> {
  const result = await PushSubscription.updateOne(
    { endpointHash: hashEndpoint(endpoint), anonymousSubscriberId: guest._id, isActive: true },
    { $set: { isActive: false, deactivatedAt: new Date() } },
  );
  return { unsubscribed: result.modifiedCount > 0 };
}

export async function hasActiveSubscription(guestId: Types.ObjectId): Promise<boolean> {
  return (await PushSubscription.exists({ anonymousSubscriberId: guestId, isActive: true })) !== null;
}

export async function updateSubscriptionPreferences(guestId: Types.ObjectId, preferences: NotificationPreferences): Promise<void> {
  await PushSubscription.updateMany({ anonymousSubscriberId: guestId }, { $set: { preferences } });
}

export async function getSubscriberStats(): Promise<PushSubscriberStats> {
  const [active, inactive, newProducts, promotions] = await Promise.all([
    PushSubscription.countDocuments({ isActive: true }),
    PushSubscription.countDocuments({ isActive: false }),
    PushSubscription.countDocuments({ isActive: true, "preferences.newProducts": true }),
    PushSubscription.countDocuments({ isActive: true, "preferences.promotions": true }),
  ]);
  return { configured: isPushConfigured(), active, inactive, newProducts, promotions };
}

/* ------------------------------------------------------------------ Delivery */

/** Which active subscriptions may receive a notification of this type. Promotions require opt-in. */
async function eligibleFilter(notification: Pick<NotificationDoc, "type" | "audience" | "guestSession">) {
  const filter: Record<string, unknown> = { isActive: true };
  if (notification.audience === "customer") {
    if (notification.type !== "order_update" || !notification.guestSession || !await CustomerSession.exists({ _id: notification.guestSession, expiresAt: { $gt: new Date() } })) return { _id: { $exists: false } };
    filter.anonymousSubscriberId = notification.guestSession;
  } else if (notification.audience === "admin" || notification.type === "order_update") {
    return { _id: { $exists: false } };
  }
  if (notification.type === "new_product") filter["preferences.newProducts"] = true;
  if (notification.type === "promotion") filter["preferences.promotions"] = true;
  return filter;
}

function payloadFor(notification: NotificationDoc, icon: string): string {
  // Lock-screen text for private orders stays generic; details require the guest cookie.
  return JSON.stringify({
    title: notification.type === "order_update" ? "Your order has an update" : notification.title,
    body: notification.type === "order_update" ? "Open My orders to view the latest status." : notification.message,
    url: notification.targetUrl || "/",
    tag: `aba-${notification._id.toString()}`,
    icon,
  });
}

/** Short, credential-free description of a failed send for the admin delivery report. */
function describeError(error: unknown): string {
  if (error instanceof WebPushError) return `Push service responded ${error.statusCode}`;
  const code = (error as { code?: string }).code;
  return code ? `Network error (${code})` : "Unexpected error while sending";
}

type SendOutcome = "accepted" | "failed" | "expired";

async function sendOne(subscription: PushSubscriptionDoc, payload: string): Promise<{ outcome: SendOutcome; error?: string }> {
  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    await PushSubscription.updateOne({ _id: subscription._id }, { $set: { isActive: false, deactivatedAt: new Date(), lastError: "Unsupported push service" } });
    return { outcome: "expired", error: "Unsupported push service" };
  }
  try {
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload, {
      TTL: PUSH_TTL_SECONDS,
      urgency: "normal",
      timeout: 10_000,
    });
    await PushSubscription.updateOne({ _id: subscription._id }, { $set: { failureCount: 0, lastSuccessAt: new Date() } });
    return { outcome: "accepted" };
  } catch (error) {
    const message = describeError(error);
    const status = error instanceof WebPushError ? error.statusCode : 0;
    // 404/410: the browser unsubscribed or the subscription expired.
    if (status === 404 || status === 410) {
      await PushSubscription.updateOne(
        { _id: subscription._id },
        { $set: { isActive: false, deactivatedAt: new Date(), lastFailureAt: new Date(), lastError: message } },
      );
      return { outcome: "expired", error: message };
    }
    const updated = await PushSubscription.findOneAndUpdate(
      { _id: subscription._id },
      { $inc: { failureCount: 1 }, $set: { lastFailureAt: new Date(), lastError: message } },
      { returnDocument: "after", projection: { failureCount: 1 } },
    ).lean<{ failureCount: number }>();
    if ((updated?.failureCount ?? 0) >= MAX_CONSECUTIVE_FAILURES) {
      await PushSubscription.updateOne({ _id: subscription._id }, { $set: { isActive: false, deactivatedAt: new Date() } });
      return { outcome: "expired", error: message };
    }
    return { outcome: "failed", error: message };
  }
}

async function deliver(notification: NotificationDoc): Promise<void> {
  const settings = await getSettingsDoc();
  const icon = settings.favicon?.url ?? "/images/brand/aba-mart-logo-transparent.png";
  const filter = await eligibleFilter(notification);

  if (notification.push.status === "queued") {
    const targeted = await PushSubscription.countDocuments(filter);
    await Notification.updateOne(
      { _id: notification._id, "push.status": "queued" },
      { $set: { "push.status": "sending", "push.targeted": targeted, "push.startedAt": new Date() } },
    );
  }

  const payload = payloadFor(notification, icon);
  let cursor = notification.push.cursor;
  for (;;) {
    const batch = await PushSubscription.find({ ...filter, ...(cursor ? { _id: { $gt: cursor } } : {}) })
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .lean<PushSubscriptionDoc[]>();
    if (!batch.length) break;

    const counts = { accepted: 0, failed: 0, deactivated: 0 };
    const errors = new Set<string>();
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const results = await Promise.all(batch.slice(i, i + CONCURRENCY).map((sub) => sendOne(sub, payload)));
      for (const result of results) {
        if (result.outcome === "accepted") counts.accepted++;
        else {
          counts.failed++;
          if (result.outcome === "expired") counts.deactivated++;
          if (result.error) errors.add(result.error);
        }
      }
    }

    cursor = batch[batch.length - 1]!._id;
    await Notification.updateOne(
      { _id: notification._id },
      {
        $inc: { "push.accepted": counts.accepted, "push.failed": counts.failed, "push.deactivated": counts.deactivated },
        $set: { "push.cursor": cursor },
        ...(errors.size ? { $push: { "push.recentErrors": { $each: [...errors], $slice: -5 } } } : {}),
      },
    );
    if (batch.length < BATCH_SIZE) break;
  }

  await Notification.updateOne({ _id: notification._id }, { $set: { "push.status": "completed", "push.finishedAt": new Date() } });
}

let running = false;
let rerun = false;

/**
 * Sends queued pushes in the background, oldest first, in batches. Publishing
 * returns immediately; progress is recorded on the notification. If the server
 * restarts mid-delivery, resumePushDeliveries() continues from the saved cursor.
 */
export function schedulePushDeliveries(): void {
  if (!isPushConfigured() || env.isTest) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  void (async () => {
    try {
      do {
        rerun = false;
        for (;;) {
          const next = await Notification.findOne({ "push.status": { $in: ["queued", "sending"] } })
            .sort({ publishedAt: 1 })
            .lean<NotificationDoc>();
          if (!next) break;
          try {
            await deliver(next);
          } catch (error) {
            console.error("[push] delivery failed:", (error as Error).message);
            await Notification.updateOne(
              { _id: next._id },
              { $set: { "push.status": "failed", "push.finishedAt": new Date() }, $push: { "push.recentErrors": { $each: ["Delivery stopped unexpectedly"], $slice: -5 } } },
            );
          }
        }
      } while (rerun);
    } catch (error) {
      console.error("[push] worker error:", (error as Error).message);
    } finally {
      running = false;
    }
  })();
}

/** Test hook: runs queued deliveries to completion in the foreground. */
export async function runPushDeliveriesNow(): Promise<void> {
  for (;;) {
    const next = await Notification.findOne({ "push.status": { $in: ["queued", "sending"] } }).sort({ publishedAt: 1 }).lean<NotificationDoc>();
    if (!next) return;
    await deliver(next);
  }
}

export const resumePushDeliveries = schedulePushDeliveries;
