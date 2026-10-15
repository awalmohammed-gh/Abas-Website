import { Schema, model, type Types } from "mongoose";
import {
  FULFILLMENT_METHODS,
  ORDER_STATUSES,
  type FulfillmentMethod,
  type OrderStatus,
  type VariantAttribute,
} from "@aba-mart/shared";
import { integerValidator } from "./common.js";

/** Snapshot of a product at the moment the order was recorded. */
export interface OrderItemDoc {
  product: Types.ObjectId;
  variantId: Types.ObjectId | null;
  name: string;
  slug: string;
  attributes: VariantAttribute[];
  image: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderStatusChangeDoc {
  status: OrderStatus;
  note: string;
  changedAt: Date;
  changedBy: Types.ObjectId | null;
}

export interface OrderDoc {
  _id: Types.ObjectId;
  orderReference: string;
  idempotencyKey: string;
  requestHash: string;
  source: "whatsapp";
  customer: { name: string; phone: string };
  items: OrderItemDoc[];
  subtotal: number;
  total: number;
  fulfillmentMethod: FulfillmentMethod;
  deliveryLocation: string;
  deliveryAddress: string;
  notes: string;
  status: OrderStatus;
  /** True while stock for this order is deducted. Guards against double deduction. */
  inventoryAdjusted: boolean;
  inventoryAdjustedAt: Date | null;
  inventoryRestoredAt: Date | null;
  statusHistory: OrderStatusChangeDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItemDoc>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    attributes: {
      type: [new Schema<VariantAttribute>({ name: String, value: String }, { _id: false })],
      default: [],
    },
    image: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1, validate: integerValidator },
    unitPrice: { type: Number, required: true, min: 0, validate: integerValidator },
    lineTotal: { type: Number, required: true, min: 0, validate: integerValidator },
  },
  { _id: false },
);

const statusChangeSchema = new Schema<OrderStatusChangeDoc>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, default: "" },
    changedAt: { type: Date, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDoc>(
  {
    orderReference: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    source: { type: String, enum: ["whatsapp"], default: "whatsapp" },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, required: true, trim: true, maxlength: 20 },
    },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items: unknown[]) => items.length > 0, message: "An order needs at least one item" },
    },
    subtotal: { type: Number, required: true, min: 0, validate: integerValidator },
    total: { type: Number, required: true, min: 0, validate: integerValidator },
    fulfillmentMethod: { type: String, enum: FULFILLMENT_METHODS, required: true },
    deliveryLocation: { type: String, default: "", maxlength: 120 },
    deliveryAddress: { type: String, default: "", maxlength: 300 },
    notes: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ORDER_STATUSES, default: "WhatsApp Pending" },
    inventoryAdjusted: { type: Boolean, default: false },
    inventoryAdjustedAt: { type: Date, default: null },
    inventoryRestoredAt: { type: Date, default: null },
    statusHistory: { type: [statusChangeSchema], default: [] },
  },
  { timestamps: true, optimisticConcurrency: true },
);

orderSchema.index({ orderReference: 1 }, { unique: true });
orderSchema.index({ idempotencyKey: 1 }, { unique: true });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });

export const Order = model<OrderDoc>("Order", orderSchema);
