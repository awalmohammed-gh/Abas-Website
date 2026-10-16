import { createHash, createHmac, randomBytes } from "node:crypto";
import { cloudinaryImageUrl, type OrderPreviewDTO } from "@aba-mart/shared";
import { env } from "../config/env.js";
import { Order, type OrderDoc } from "../models/Order.js";
import { ApiError } from "../utils/ApiError.js";
import { getSettingsDoc } from "./settingsService.js";

const PREVIEW_MS = 7 * 24 * 60 * 60 * 1000;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const tokenFor = (reference: string, nonce: string, expiresAt: Date) => createHmac("sha256", env.JWT_SECRET)
  .update(`order-preview:${reference}:${nonce}:${expiresAt.getTime()}`).digest("base64url");

/** Separate purpose from admin/guest authentication; no account or session IDs enter the link. */
export function newOrderPreview(reference: string) {
  const previewNonce = randomBytes(32).toString("base64url");
  const previewExpiresAt = new Date(Date.now() + PREVIEW_MS);
  return { previewNonce, previewExpiresAt, previewTokenHash: hash(tokenFor(reference, previewNonce, previewExpiresAt)) };
}

export function orderPreviewUrl(order: OrderDoc): string {
  if (!order.previewNonce || !order.previewExpiresAt) throw new Error("Order preview was not initialized");
  const origin = env.STOREFRONT_URL ?? env.CLIENT_ORIGIN[0]!;
  const token = tokenFor(order.orderReference, order.previewNonce, order.previewExpiresAt);
  return new URL(`/order-preview/${token}`, origin).href;
}

/** Owners can renew expired links; old tokens remain invalid after renewal. */
export async function ensureOrderPreview(order: OrderDoc): Promise<OrderDoc> {
  if (order.previewNonce && order.previewTokenHash && order.previewExpiresAt && order.previewExpiresAt.getTime() > Date.now() &&
    hash(tokenFor(order.orderReference, order.previewNonce, order.previewExpiresAt)) === order.previewTokenHash) return order;
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, previewNonce: order.previewNonce ?? null },
    { $set: newOrderPreview(order.orderReference) },
    { returnDocument: "after" },
  ).lean<OrderDoc>();
  if (updated) return updated;
  const winner = await Order.findById(order._id).lean<OrderDoc>();
  if (!winner) throw ApiError.notFound("Order not found.");
  return winner;
}

/** Deliberate allowlist: no customer details, MongoDB IDs, admin notes or private history. */
export async function getOrderPreview(token: string): Promise<OrderPreviewDTO> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw ApiError.notFound("This order preview is not available.");
  const order = await Order.findOne({ previewTokenHash: hash(token) }).lean<OrderDoc>();
  if (!order) throw ApiError.notFound("This order preview is not available.");
  if (!order.previewExpiresAt || order.previewExpiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, "PREVIEW_EXPIRED", "This order preview has expired. Ask the customer to share a fresh link from My orders.");
  }
  const settings = await getSettingsDoc();
  return {
    storeName: settings.storeName,
    orderReference: order.orderReference,
    items: order.items.map((item) => ({
      name: item.name, image: cloudinaryImageUrl(item.image),
      attributes: item.attributes.map((attribute) => ({ name: attribute.name, value: attribute.value })),
      quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal,
    })),
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.previewExpiresAt.toISOString(),
  };
}
