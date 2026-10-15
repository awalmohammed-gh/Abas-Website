import type { Request, Response } from "express";
import type { OrderStatus, WhatsAppOrderInput } from "@aba-mart/shared";
import { parseQuery } from "../middleware/validate.js";
import * as orderService from "../services/orderService.js";
import { sendSuccess } from "../utils/respond.js";
import { adminOrderQuerySchema } from "../validators/orderSchema.js";

export async function quoteCart(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const { items } = req.body as { items: { productId: string; variantId?: string | null; quantity: number }[] };
  sendSuccess(res, await orderService.quoteCart(items));
}

export async function createWhatsAppOrder(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const result = await orderService.createWhatsAppOrder(req.body as WhatsAppOrderInput, req.customerSession!);
  sendSuccess(res, result, result.replayed ? 200 : 201);
}

export async function adminListOrders(req: Request, res: Response) {
  sendSuccess(res, await orderService.listOrders(parseQuery(adminOrderQuerySchema, req.query)));
}

export async function adminGetOrder(req: Request, res: Response) {
  sendSuccess(res, await orderService.getOrder(String(req.params.id)));
}

export async function adminUpdateOrderStatus(req: Request, res: Response) {
  const { status, note } = req.body as { status: OrderStatus; note: string };
  sendSuccess(res, await orderService.updateOrderStatus(String(req.params.id), status, note, req.admin!.id));
}

export async function adminDashboard(_req: Request, res: Response) {
  sendSuccess(res, await orderService.getDashboardSummary());
}
