import { Router } from "express";
import * as orders from "../controllers/orderController.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { orderLimiter, quoteLimiter } from "../middleware/security.js";
import { validateBody, validateIdParam } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { orderStatusUpdateSchema, quoteRequestSchema, whatsappOrderSchema } from "../validators/orderSchema.js";

export const orderRouter = Router();
orderRouter.post("/quote", quoteLimiter, validateBody(quoteRequestSchema), asyncHandler(orders.quoteCart));
orderRouter.post("/whatsapp", orderLimiter, validateBody(whatsappOrderSchema), asyncHandler(orders.createWhatsAppOrder));

export const adminOrderRouter = Router();
adminOrderRouter.use(...adminOnly);
adminOrderRouter.get("/", asyncHandler(orders.adminListOrders));
adminOrderRouter.get("/:id", validateIdParam, asyncHandler(orders.adminGetOrder));
adminOrderRouter.patch(
  "/:id/status",
  validateIdParam,
  validateBody(orderStatusUpdateSchema),
  asyncHandler(orders.adminUpdateOrderStatus),
);

export const adminDashboardRouter = Router();
adminDashboardRouter.use(...adminOnly);
adminDashboardRouter.get("/", asyncHandler(orders.adminDashboard));
