import { createHash } from "node:crypto";
import mongoose, { Types, type ClientSession, type QueryFilter } from "mongoose";
import {
  STOCK_DEDUCTING_STATUSES,
  buildOrderMessage,
  buildWhatsAppUrl,
  canTransitionOrder,
  escapeRegExp,
  formatGHS,
  resolvePrice,
  variantLabel,
  type CartQuote,
  type CustomerOrderDTO,
  type DashboardSummary,
  type OrderDTO,
  type OrderStatus,
  type Paginated,
  type QuoteLine,
  type WhatsAppOrderInput,
  type WhatsAppOrderResult,
} from "@aba-mart/shared";
import { nextSequence } from "../models/Counter.js";
import { Order, type OrderDoc, type OrderItemDoc } from "../models/Order.js";
import { Product, type ProductVariantDoc } from "../models/Product.js";
import { CustomerSession, type CustomerSessionDoc } from "../models/CustomerSession.js";
import type { SettingsDoc } from "../models/Settings.js";
import { activeGuestFilter } from "./customerSessionService.js";
import { ApiError } from "../utils/ApiError.js";
import { toOrderDTO, type ProductLean } from "../utils/serialize.js";
import type { AdminOrderQuery } from "../validators/orderSchema.js";
import { inventoryRows, publicVisibilityFilter } from "./productService.js";
import { revalidateStorefront } from "./revalidationService.js";
import { getSettingsDoc } from "./settingsService.js";
import { ensureOrderPreview, newOrderPreview, orderPreviewUrl } from "./orderPreviewService.js";

interface CartLineInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/* -------------------------------------------------------------- Cart quote */

/** Merges duplicate lines so stock checks use the combined quantity. */
function mergeLines(items: CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, CartLineInput>();
  for (const item of items) {
    const key = `${item.productId}:${item.variantId ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity });
  }
  return [...merged.values()];
}

/**
 * Re-prices a cart from the database. The browser only sends product ids,
 * variant ids and quantities; prices and availability always come from here.
 */
export async function quoteCart(items: CartLineInput[]): Promise<CartQuote> {
  const lines = mergeLines(items);
  const ids = [...new Set(lines.map((l) => l.productId))].map((id) => new Types.ObjectId(id));
  const visibility = await publicVisibilityFilter();
  const products = await Product.find({ ...visibility, _id: { $in: ids } }).lean<ProductLean[]>();
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const quoteLines: QuoteLine[] = lines.map((line) => {
    const product = byId.get(line.productId);
    const unavailable = (status: QuoteLine["status"], message: string, extra: Partial<QuoteLine> = {}): QuoteLine => ({
      productId: line.productId,
      variantId: line.variantId ?? null,
      requestedQuantity: line.quantity,
      quantity: 0,
      available: 0,
      name: product?.name ?? "Unavailable item",
      slug: product?.slug ?? "",
      image: product?.images[0]?.url ?? null,
      attributes: [],
      unitPrice: 0,
      compareAtPrice: null,
      lineTotal: 0,
      status,
      message,
      ...extra,
    });

    if (!product) return unavailable("unavailable", "This item is no longer available.");

    let variant: ProductVariantDoc | undefined;
    if (product.variants.length) {
      if (!line.variantId) return unavailable("variant_required", "Please choose an option for this item.");
      variant = product.variants.find((v) => v._id.toString() === line.variantId && v.isActive);
      if (!variant) return unavailable("variant_unavailable", "The option you chose is no longer available.");
    } else if (line.variantId) {
      return unavailable("variant_unavailable", "The option you chose is no longer available.");
    }

    const available = variant ? variant.stock : product.stock;
    const { price, compareAtPrice } = resolvePrice(product, variant);
    const attributes = variant ? variant.attributes.map((a) => ({ name: a.name, value: a.value })) : [];
    const details = { available, unitPrice: price, compareAtPrice, attributes };

    if (available <= 0) return unavailable("out_of_stock", "This item is out of stock.", details);

    const quantity = Math.min(line.quantity, available);
    return {
      productId: line.productId,
      variantId: variant ? variant._id.toString() : null,
      requestedQuantity: line.quantity,
      quantity,
      available,
      name: product.name,
      slug: product.slug,
      image: product.images[0]?.url ?? null,
      attributes,
      unitPrice: price,
      compareAtPrice,
      lineTotal: price * quantity,
      status: quantity < line.quantity ? "quantity_adjusted" : "ok",
      message: quantity < line.quantity ? `Only ${available} available. Reduce the quantity to continue.` : null,
    };
  });

  const subtotal = quoteLines.reduce((sum, l) => sum + l.lineTotal, 0);
  return {
    lines: quoteLines,
    subtotal,
    total: subtotal,
    itemCount: quoteLines.reduce((sum, l) => sum + l.quantity, 0),
    hasIssues: quoteLines.some((l) => l.status !== "ok"),
  };
}

/* ---------------------------------------------------------- WhatsApp order */

function requestHash(input: WhatsAppOrderInput): string {
  const normalized = {
    customer: input.customer,
    items: mergeLines(input.items).sort((a, b) => `${a.productId}${a.variantId}`.localeCompare(`${b.productId}${b.variantId}`)),
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function formatOrderReference(sequence: number): string {
  return `ABA-${String(sequence).padStart(6, "0")}`;
}

function buildResult(order: OrderDoc, storeName: string, whatsappNumber: string, replayed: boolean): WhatsAppOrderResult {
  const dto = toOrderDTO(order);
  const previewUrl = orderPreviewUrl(order);
  const message = buildOrderMessage({
    storeName,
    orderReference: order.orderReference,
    items: dto.items,
    total: order.total,
    customer: order.customer,
    fulfillmentMethod: order.fulfillmentMethod,
    deliveryLocation: order.deliveryLocation,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    previewUrl,
  });
  return {
    order: {
      id: dto.id,
      orderReference: dto.orderReference,
      status: dto.status,
      items: dto.items,
      subtotal: dto.subtotal,
      total: dto.total,
      createdAt: dto.createdAt,
    },
    message,
    whatsappUrl: buildWhatsAppUrl(whatsappNumber, message),
    replayed,
    previewUrl,
  };
}

/**
 * Records a "WhatsApp Pending" order from a validated cart and returns the
 * click-to-chat link. Stock is not touched: opening WhatsApp is not a sale.
 */
export async function createWhatsAppOrder(input: WhatsAppOrderInput, guest: CustomerSessionDoc): Promise<WhatsAppOrderResult> {
  const settings = await getSettingsDoc();
  if (!settings.whatsappNumber) {
    throw new ApiError(503, "WHATSAPP_NOT_CONFIGURED", "WhatsApp ordering is not available yet. Please contact the store directly.");
  }

  const hash = requestHash(input);
  const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean<OrderDoc>();
  if (existing) {
    if (!existing.guestSession?.equals(guest._id) || existing.requestHash !== hash) {
      throw ApiError.conflict("This checkout was already used for a different order. Please try again.", "IDEMPOTENCY_CONFLICT");
    }
    return buildResult(await ensureOrderPreview(existing), settings.storeName, settings.whatsappNumber, true);
  }

  const current = await CustomerSession.findOne(activeGuestFilter(guest)).lean<CustomerSessionDoc>();
  if (!current) throw ApiError.unauthorized("Your guest session has ended.", "GUEST_SESSION_EXPIRED");
  const signature = (items: CartLineInput[]) => JSON.stringify(mergeLines(items).sort((a, b) =>
    `${a.productId}:${a.variantId}`.localeCompare(`${b.productId}:${b.variantId}`)));
  if (signature(input.items) !== signature(current.cart)) {
    throw ApiError.conflict("Your cart changed. Review it before preparing your order.", "CART_CHANGED", { quote: await quoteCart(current.cart) });
  }

  const quote = await quoteCart(input.items);
  if (quote.hasIssues) {
    throw ApiError.conflict("Some items in your cart changed. Please review your cart and try again.", "CART_CHANGED", { quote });
  }
  if (input.expectedTotal !== undefined && input.expectedTotal !== quote.total) {
    throw ApiError.conflict(
      `Prices changed since you opened your cart. The new total is ${formatGHS(quote.total)}.`,
      "PRICE_CHANGED",
      { quote },
    );
  }

  const items: OrderItemDoc[] = quote.lines.map((line) => ({
    product: new Types.ObjectId(line.productId),
    variantId: line.variantId ? new Types.ObjectId(line.variantId) : null,
    name: line.name,
    slug: line.slug,
    attributes: line.attributes,
    image: line.image,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));

  const now = new Date();
  try {
    const order = await mongoose.connection.transaction(async (transaction) => {
      const locked = await CustomerSession.updateOne(
        { ...activeGuestFilter(guest), cartRevision: current.cartRevision },
        { $inc: { cartRevision: 1 }, $set: { lastActiveAt: now } },
        { session: transaction },
      );
      if (!locked.matchedCount) throw ApiError.conflict("Your cart changed. Review it before trying again.", "CART_CHANGED");
      const reference = formatOrderReference(await nextSequence("orderReference"));
      const [created] = await Order.create([{
        orderReference: reference,
        ...newOrderPreview(reference),
        idempotencyKey: input.idempotencyKey,
        requestHash: hash,
        guestSession: guest._id,
        checkoutHandoffStatus: "prepared",
        customer: { name: input.customer.name, phone: input.customer.phone },
        items,
        subtotal: quote.subtotal,
        total: quote.total,
        fulfillmentMethod: input.customer.fulfillmentMethod,
        deliveryLocation: input.customer.fulfillmentMethod === "delivery" ? input.customer.deliveryLocation : "",
        deliveryAddress: input.customer.fulfillmentMethod === "delivery" ? input.customer.deliveryAddress : "",
        notes: input.customer.notes,
        status: "WhatsApp Pending",
        statusHistory: [{ status: "WhatsApp Pending", note: "Order request prepared on the website; awaiting the customer's WhatsApp message", changedAt: now, changedBy: null }],
      }], { session: transaction });
      return created!;
    });
    return buildResult(order.toObject(), settings.storeName, settings.whatsappNumber, false);
  } catch (error) {
    // A concurrent duplicate submission won the race: return the recorded order.
    if ((error as { code?: number }).code === 11000 || (error instanceof ApiError && error.code === "CART_CHANGED")) {
      const winner = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean<OrderDoc>();
      if (winner?.guestSession?.equals(guest._id) && winner.requestHash === hash) return buildResult(await ensureOrderPreview(winner), settings.storeName, settings.whatsappNumber, true);
    }
    throw error;
  }
}

function toCustomerOrder(order: OrderDoc, settings: SettingsDoc): CustomerOrderDTO {
  const dto = toOrderDTO(order);
  return {
    id: dto.id,
    orderReference: dto.orderReference,
    customer: dto.customer,
    items: dto.items,
    itemCount: dto.itemCount,
    subtotal: dto.subtotal,
    total: dto.total,
    fulfillmentMethod: dto.fulfillmentMethod,
    deliveryLocation: dto.deliveryLocation,
    deliveryAddress: dto.deliveryAddress,
    notes: dto.notes,
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    previewUrl: orderPreviewUrl(order),
    checkoutHandoffStatus: order.checkoutHandoffStatus ?? "prepared",
    whatsappUrl: order.status === "WhatsApp Pending" && settings.whatsappNumber
      ? buildResult(order, settings.storeName, settings.whatsappNumber, true).whatsappUrl : null,
    contactUrl: settings.whatsappNumber
      ? buildWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.storeName}, I'd like help with order ${order.orderReference}.`) : null,
  };
}

export async function listCustomerOrders(guest: CustomerSessionDoc, page: number): Promise<Paginated<CustomerOrderDTO>> {
  const filter = { guestSession: guest._id };
  const limit = 12;
  const [orders, total, settings] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean<OrderDoc[]>(),
    Order.countDocuments(filter),
    getSettingsDoc(),
  ]);
  const previews = await Promise.all(orders.map(ensureOrderPreview));
  return { items: previews.map((order) => toCustomerOrder(order, settings)), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getCustomerOrder(guest: CustomerSessionDoc, id: string): Promise<CustomerOrderDTO> {
  const order = await Order.findOne({ _id: id, guestSession: guest._id }).lean<OrderDoc>();
  if (!order) throw ApiError.notFound("Order not found.");
  return toCustomerOrder(await ensureOrderPreview(order), await getSettingsDoc());
}

/** Clears only the ordered quantities, once, after the browser initiates WhatsApp. */
export async function recordHandoff(guest: CustomerSessionDoc, id: string): Promise<void> {
  await mongoose.connection.transaction(async (transaction) => {
    const session = await CustomerSession.findOne(activeGuestFilter(guest)).session(transaction);
    if (!session) throw ApiError.unauthorized("Your guest session has ended.", "GUEST_SESSION_EXPIRED");
    const order = await Order.findOne({ _id: id, guestSession: guest._id }).session(transaction);
    if (!order) throw ApiError.notFound("Order not found.");
    if (order.checkoutHandoffStatus === "initiated") return;
    if (order.status !== "WhatsApp Pending") throw ApiError.conflict("This order is no longer awaiting a WhatsApp handoff.", "ORDER_NOT_PENDING");
    const ordered = new Map(order.items.map((item) => [`${item.product}:${item.variantId ?? "base"}`, item.quantity]));
    session.cart = session.cart.map((item) => ({
      productId: item.productId, variantId: item.variantId,
      quantity: Math.max(0, item.quantity - (ordered.get(`${item.productId}:${item.variantId ?? "base"}`) ?? 0)),
    })).filter((item) => item.quantity > 0);
    session.cartRevision += 1;
    await session.save({ session: transaction });
    order.checkoutHandoffStatus = "initiated";
    await order.save({ session: transaction });
  });
}

/* -------------------------------------------------------- Admin: listing */

export async function listOrders(query: AdminOrderQuery): Promise<Paginated<OrderDTO>> {
  const filter: QueryFilter<OrderDoc> = {};
  if (query.status !== "all") filter.status = query.status;
  if (query.q) {
    const pattern = new RegExp(escapeRegExp(query.q), "i");
    const digits = query.q.replace(/\D/g, "");
    filter.$or = [
      { orderReference: pattern },
      { "customer.name": pattern },
      ...(digits.length >= 4 ? [{ "customer.phone": new RegExp(escapeRegExp(digits.replace(/^0/, ""))) }] : []),
    ];
  }

  const [docs, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<OrderDoc[]>(),
    Order.countDocuments(filter),
  ]);
  return { items: docs.map(toOrderDTO), total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

export async function getOrder(id: string): Promise<OrderDTO> {
  const order = await Order.findById(id).lean<OrderDoc>();
  if (!order) throw ApiError.notFound("Order not found.");
  return toOrderDTO(order);
}

/* ---------------------------------------------- Admin: status & inventory */

interface StockLine {
  productId: string;
  variantId: string | null;
  quantity: number;
  name: string;
}

function stockLines(items: OrderItemDoc[]): StockLine[] {
  const merged = new Map<string, StockLine>();
  for (const item of items) {
    const variantId = item.variantId ? item.variantId.toString() : null;
    const key = `${item.product.toString()}:${variantId ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { productId: item.product.toString(), variantId, quantity: item.quantity, name: item.name });
  }
  return [...merged.values()];
}

/** Deducts (direction -1) or restores (+1) stock inside the caller's transaction. */
async function adjustStock(items: OrderItemDoc[], direction: -1 | 1, session: ClientSession): Promise<void> {
  const shortages: { name: string; requested: number; available: number }[] = [];

  for (const line of stockLines(items)) {
    const product = await Product.findById(line.productId).session(session);
    if (!product) {
      if (direction === -1) shortages.push({ name: line.name, requested: line.quantity, available: 0 });
      continue;
    }
    const variants = product.variants as Types.DocumentArray<ProductVariantDoc>;

    if (line.variantId) {
      const variant = variants.id(line.variantId);
      if (!variant) {
        if (direction === -1) shortages.push({ name: line.name, requested: line.quantity, available: 0 });
        continue;
      }
      if (direction === -1 && variant.stock < line.quantity) {
        shortages.push({ name: `${line.name} (${variantLabel(variant.attributes)})`, requested: line.quantity, available: variant.stock });
        continue;
      }
      variant.stock += direction * line.quantity;
    } else {
      if (direction === -1 && product.stock < line.quantity) {
        shortages.push({ name: line.name, requested: line.quantity, available: product.stock });
        continue;
      }
      product.stock += direction * line.quantity;
    }
    await product.save({ session });
  }

  if (shortages.length) {
    const summary = shortages.map((s) => `${s.name}: ${s.available} in stock, ${s.requested} ordered`).join("; ");
    throw ApiError.conflict(`Not enough stock to confirm this order. ${summary}.`, "INSUFFICIENT_STOCK", { shortages });
  }
}

/**
 * Moves an order to a new status. Stock is deducted once when an order is
 * first confirmed and restored if a confirmed order is cancelled. The whole
 * change runs in a transaction, and repeating the same update is a no-op.
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  note: string,
  adminId: string,
): Promise<{ order: OrderDTO; changed: boolean }> {
  let changed = false;
  let stockTouched = false;

  const result = await mongoose.connection.transaction(async (session) => {
    changed = false;
    stockTouched = false;
    const order = await Order.findById(id).session(session);
    if (!order) throw ApiError.notFound("Order not found.");

    if (order.status === status) return order.toObject();
    if (!canTransitionOrder(order.status, status)) {
      throw ApiError.conflict(`An order that is "${order.status}" cannot be changed to "${status}".`, "INVALID_STATUS_TRANSITION");
    }

    const now = new Date();
    if (STOCK_DEDUCTING_STATUSES.includes(status) && !order.inventoryAdjusted) {
      await adjustStock(order.items, -1, session);
      order.inventoryAdjusted = true;
      order.inventoryAdjustedAt = now;
      stockTouched = true;
    }
    if (status === "Cancelled" && order.inventoryAdjusted) {
      await adjustStock(order.items, 1, session);
      order.inventoryAdjusted = false;
      order.inventoryRestoredAt = now;
      stockTouched = true;
    }

    order.status = status;
    order.statusHistory.push({ status, note, changedAt: now, changedBy: new Types.ObjectId(adminId) });
    await order.save({ session });
    changed = true;
    return order.toObject();
  });

  if (stockTouched) revalidateStorefront("products");
  return { order: toOrderDTO(result as OrderDoc), changed };
}

/* --------------------------------------------------------------- Dashboard */

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [products, orderGroups, recent] = await Promise.all([
    Product.find({ isArchived: false })
      .select("name slug images category variants stock lowStockThreshold isActive")
      .populate("category", "name slug")
      .lean<ProductLean[]>(),
    Order.aggregate<{ _id: OrderStatus; count: number; value: number }>([
      { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$total" } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(6).lean<OrderDoc[]>(),
  ]);

  const rows = products.flatMap(inventoryRows);
  const lowStockItems = rows
    .filter((r) => r.isActive && r.state !== "in_stock")
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8);

  const outOfStockProducts = new Set(products.filter((p) => p.stock <= 0).map((p) => p._id.toString()));
  const lowStockProducts = new Set(
    rows.filter((r) => r.state === "low_stock" && !outOfStockProducts.has(r.productId)).map((r) => r.productId),
  );

  const count = (status: OrderStatus) => orderGroups.find((g) => g._id === status)?.count ?? 0;
  const inProgressStatuses: OrderStatus[] = ["Processing", "Ready for Pickup", "Out for Delivery"];

  return {
    products: {
      total: products.length,
      active: products.filter((p) => p.isActive).length,
      outOfStock: outOfStockProducts.size,
      lowStock: lowStockProducts.size,
    },
    orders: {
      total: orderGroups.reduce((sum, g) => sum + g.count, 0),
      pending: count("WhatsApp Pending"),
      confirmed: count("Confirmed"),
      inProgress: inProgressStatuses.reduce((sum, s) => sum + count(s), 0),
      completed: count("Completed"),
      cancelled: count("Cancelled"),
      completedValue: orderGroups.find((g) => g._id === "Completed")?.value ?? 0,
    },
    recentOrders: recent.map(toOrderDTO),
    lowStockItems,
  };
}

