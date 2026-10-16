export const ORDER_STATUSES = [
  "WhatsApp Pending",
  "Confirmed",
  "Processing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Allowed manual status changes. Opening WhatsApp never confirms an order, so
 * every order starts as "WhatsApp Pending" and an admin moves it forward.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  "WhatsApp Pending": ["Confirmed", "Cancelled"],
  Confirmed: ["Processing", "Ready for Pickup", "Out for Delivery", "Cancelled"],
  Processing: ["Ready for Pickup", "Out for Delivery", "Cancelled"],
  "Ready for Pickup": ["Out for Delivery", "Completed", "Cancelled"],
  "Out for Delivery": ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

/**
 * Inventory policy: stock is deducted exactly once, when an order first moves
 * from "WhatsApp Pending" into "Confirmed". It is restored if a confirmed order
 * is later cancelled. Pending orders never touch stock.
 */
export const STOCK_DEDUCTING_STATUSES: readonly OrderStatus[] = [
  "Confirmed",
  "Processing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
];

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export const FULFILLMENT_METHODS = ["delivery", "pickup"] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

export const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
};

export const ADMIN_ROLES = ["super_admin", "admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PRODUCT_SORTS = ["newest", "price-asc", "price-desc", "name-asc"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "name-asc": "Name: A to Z",
};

export const UPLOAD_FOLDERS = ["products", "categories", "banners", "branding"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

/* ------------------------------------------------------------ Notifications */

export const NOTIFICATION_TYPES = ["new_product", "promotion", "announcement", "important", "order_alert", "order_update"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Types an admin can publish to customers. Order alerts are created by the system for admins only. */
export const CUSTOMER_NOTIFICATION_TYPES = ["new_product", "promotion", "announcement", "important"] as const;
export type CustomerNotificationType = (typeof CUSTOMER_NOTIFICATION_TYPES)[number] | "order_update";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  new_product: "New product",
  promotion: "Promotion",
  announcement: "Store announcement",
  important: "Important update",
  order_alert: "Order alert",
  order_update: "Order update",
};

/**
 * public: in-app feed for every visitor (promotions only for visitors who opted in) and push to opted-in subscribers.
 * push_subscribers: push only, plus the feed of visitors whose browser is subscribed.
 * admin: dashboard only.
 * customer: a system order update for one owning guest session; never a broadcast.
 */
export const NOTIFICATION_AUDIENCES = ["public", "push_subscribers", "admin", "customer"] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const NOTIFICATION_POLL_MS = {
  admin: 15_000,
  customer: 15_000,
} as const;

export const LIMITS = {
  maxCartLines: 50,
  maxLineQuantity: 99,
  maxProductImages: 8,
  maxProductOptions: 3,
  maxOptionValues: 30,
  maxVariants: 100,
  maxPriceInPesewas: 100_000_000, // GHS 1,000,000.00
  maxStock: 1_000_000,
  defaultLowStockThreshold: 5,
} as const;
