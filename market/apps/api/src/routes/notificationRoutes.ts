import { Router } from "express";
import { z } from "zod";
import {
  NOTIFICATION_TYPES,
  notificationInputSchema,
  notificationPreferencesSchema,
  notificationReadSchema,
  notificationDeleteSchema,
  adminNotificationDeleteSchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "@aba-mart/shared";
import { adminOnly, requireRole } from "../middleware/adminAuth.js";
import { requireCustomer, requireCustomerCsrf } from "../middleware/customerSession.js";
import { publishLimiter, pushLimiter, quoteLimiter } from "../middleware/security.js";
import { parseQuery, validateBody, validateIdParam } from "../middleware/validate.js";
import { resolveCustomerSession } from "../services/customerSessionService.js";
import * as notifications from "../services/notificationService.js";
import * as push from "../services/pushService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/respond.js";

/* ----------------------------------------------------------------- Customers */

export const notificationRouter = Router();
notificationRouter.use(quoteLimiter, (_req, res, next) => {
  // Read state and preferences are per visitor: never cache in shared caches.
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Origin, Cookie");
  next();
});

/** Public announcements, plus this visitor's read state when a guest session cookie is present. */
notificationRouter.get("/public", asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.getCustomerFeed(await resolveCustomerSession(req)));
}));

notificationRouter.post("/read", requireCustomer, requireCustomerCsrf, validateBody(notificationReadSchema), asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.markCustomerRead(req.customerSession!, req.body as z.output<typeof notificationReadSchema>));
}));

notificationRouter.post("/delete", requireCustomer, requireCustomerCsrf, validateBody(notificationDeleteSchema), asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.deleteCustomerNotifications(req.customerSession!, req.body as z.output<typeof notificationDeleteSchema>));
}));

notificationRouter.put("/preferences", pushLimiter, requireCustomer, requireCustomerCsrf, validateBody(notificationPreferencesSchema), asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.updateCustomerPreferences(req.customerSession!, req.body as z.output<typeof notificationPreferencesSchema>));
}));

export const pushRouter = Router();
pushRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

/** The VAPID public key is public by design; the private key never leaves the server. */
pushRouter.get("/config", asyncHandler(async (_req, res) => sendSuccess(res, await push.getPushConfig())));

pushRouter.post("/subscribe", pushLimiter, requireCustomer, requireCustomerCsrf, validateBody(pushSubscriptionSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.output<typeof pushSubscriptionSchema>;
  sendSuccess(res, await push.subscribe(req.customerSession!, body.subscription, body.preferences), 201);
}));

pushRouter.delete("/unsubscribe", pushLimiter, requireCustomer, requireCustomerCsrf, validateBody(pushUnsubscribeSchema), asyncHandler(async (req, res) => {
  sendSuccess(res, await push.unsubscribe(req.customerSession!, (req.body as z.output<typeof pushUnsubscribeSchema>).endpoint));
}));

/* --------------------------------------------------------------------- Admin */

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  scope: z.enum(["all", "alerts", "customer"]).default("all"),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

const canManage = requireRole("super_admin", "admin");

export const adminNotificationRouter = Router();
adminNotificationRouter.use(...adminOnly);

adminNotificationRouter.get("/", asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.listAdminNotifications(req.admin!, parseQuery(listQuerySchema, req.query)));
}));
adminNotificationRouter.get("/summary", asyncHandler(async (req, res) => sendSuccess(res, await notifications.getAdminSummary(req.admin!))));
adminNotificationRouter.get("/subscribers", asyncHandler(async (_req, res) => sendSuccess(res, await push.getSubscriberStats())));
adminNotificationRouter.post("/read", validateBody(notificationReadSchema), asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.markAdminRead(req.admin!, req.body as z.output<typeof notificationReadSchema>));
}));

adminNotificationRouter.post("/", canManage, publishLimiter, validateBody(notificationInputSchema), asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.createNotification(req.admin!, req.body as z.output<typeof notificationInputSchema>), 201);
}));
adminNotificationRouter.post("/delete", canManage, validateBody(adminNotificationDeleteSchema), asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.deleteAdminNotifications(req.body as z.output<typeof adminNotificationDeleteSchema>));
}));
adminNotificationRouter.put("/:id", canManage, validateIdParam, validateBody(notificationInputSchema), asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.updateDraft(req.admin!, String(req.params.id), req.body as z.output<typeof notificationInputSchema>));
}));
adminNotificationRouter.post("/:id/publish", canManage, publishLimiter, validateIdParam, asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.publishNotification(req.admin!, String(req.params.id)));
}));
adminNotificationRouter.post("/:id/end", canManage, validateIdParam, asyncHandler(async (req, res) => {
  sendSuccess(res, await notifications.endNotification(req.admin!, String(req.params.id)));
}));
adminNotificationRouter.delete("/:id", canManage, validateIdParam, asyncHandler(async (req, res) => {
  await notifications.deleteNotification(String(req.params.id));
  sendSuccess(res, { deleted: true });
}));
