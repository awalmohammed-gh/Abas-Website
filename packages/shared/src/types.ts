import type { AdminRole, FulfillmentMethod, OrderStatus } from "./constants.js";

/* ------------------------------------------------------------------ API */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* --------------------------------------------------------------- Images */

export interface ImageAsset {
  url: string;
  publicId: string;
  alt?: string;
  width?: number;
  height?: number;
}

/* ------------------------------------------------------------- Catalog */

export interface ProductOption {
  name: string;
  values: string[];
}

export interface VariantAttribute {
  name: string;
  value: string;
}

export interface ProductVariantDTO {
  id: string;
  attributes: VariantAttribute[];
  sku: string | null;
  /** Selling price override in pesewas; null means "use the product price". */
  price: number | null;
  compareAtPrice: number | null;
  stock: number;
  isActive: boolean;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: CategorySummary | null;
  /** Optional finer grouping inside the category, e.g. "Jeans" or "Shower Gel". Empty when not set. */
  subCategory: string;
  /** Current selling price in pesewas. */
  price: number;
  /** Original price before discount in pesewas, if discounted. */
  compareAtPrice: number | null;
  images: ImageAsset[];
  options: ProductOption[];
  variants: ProductVariantDTO[];
  stock: number;
  inStock: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductDTO extends ProductDTO {
  isActive: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  lowStockThreshold: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: ImageAsset | null;
  isActive: boolean;
  displayOrder: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------- Banners */

export interface BannerDTO {
  id: string;
  title: string;
  description: string;
  desktopImage: ImageAsset;
  mobileImage: ImageAsset | null;
  buttonText: string;
  buttonLink: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------ Settings */

export interface SocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
  x: string;
  youtube: string;
}

export interface StoreSettingsDTO {
  storeName: string;
  storeDescription: string;
  logo: ImageAsset | null;
  favicon: ImageAsset | null;
  /** International digits without "+", e.g. 233241234567. Empty when not configured. */
  whatsappNumber: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  openingHours: string;
  announcement: string;
  socialLinks: SocialLinks;
  updatedAt: string | null;
}

/* -------------------------------------------------------------- Orders */

export interface OrderItemDTO {
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  attributes: VariantAttribute[];
  image: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderStatusChange {
  status: OrderStatus;
  note: string;
  changedAt: string;
  changedBy: string | null;
}

export interface OrderDTO {
  id: string;
  orderReference: string;
  customer: {
    name: string;
    phone: string;
  };
  items: OrderItemDTO[];
  itemCount: number;
  subtotal: number;
  total: number;
  fulfillmentMethod: FulfillmentMethod;
  deliveryLocation: string;
  deliveryAddress: string;
  notes: string;
  status: OrderStatus;
  inventoryAdjusted: boolean;
  statusHistory: OrderStatusChange[];
  createdAt: string;
  updatedAt: string;
}

/** What the storefront receives after a WhatsApp order is recorded. */
export interface WhatsAppOrderResult {
  order: {
    id: string;
    orderReference: string;
    status: OrderStatus;
    items: OrderItemDTO[];
    subtotal: number;
    total: number;
    createdAt: string;
  };
  message: string;
  whatsappUrl: string;
  /** True when this response is a replay of an order already recorded with the same idempotency key. */
  replayed: boolean;
  previewUrl: string;
}

export interface OrderPreviewDTO {
  storeName: string;
  orderReference: string;
  items: Pick<OrderItemDTO, "name" | "image" | "attributes" | "quantity" | "unitPrice" | "lineTotal">[];
  total: number;
  createdAt: string;
  expiresAt: string;
}

export interface GuestSessionDTO {
  csrfToken: string;
  expiresAt: string;
}

export type CustomerOrderDTO = Pick<OrderDTO,
  "id" | "orderReference" | "customer" | "items" | "itemCount" | "subtotal" | "total" |
  "fulfillmentMethod" | "deliveryLocation" | "deliveryAddress" | "notes" | "status" | "createdAt" | "updatedAt"
> & {
  checkoutHandoffStatus: "prepared" | "initiated";
  whatsappUrl: string | null;
  contactUrl: string | null;
  previewUrl: string;
};

/* ---------------------------------------------------------- Cart quote */

export type QuoteLineStatus =
  | "ok"
  | "quantity_adjusted"
  | "out_of_stock"
  | "unavailable"
  | "variant_required"
  | "variant_unavailable";

export interface QuoteLine {
  productId: string;
  variantId: string | null;
  requestedQuantity: number;
  /** Quantity that can actually be ordered right now (0 when it cannot). */
  quantity: number;
  available: number;
  name: string;
  slug: string;
  image: string | null;
  attributes: VariantAttribute[];
  unitPrice: number;
  compareAtPrice: number | null;
  lineTotal: number;
  status: QuoteLineStatus;
  message: string | null;
}

export interface CartQuote {
  lines: QuoteLine[];
  subtotal: number;
  total: number;
  itemCount: number;
  hasIssues: boolean;
}

/* --------------------------------------------------------------- Admin */

export interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface AdminSession {
  admin: AdminUserDTO;
  csrfToken: string;
  expiresAt: string;
}

export interface InventoryRow {
  productId: string;
  productName: string;
  productSlug: string;
  image: string | null;
  categoryName: string | null;
  variantId: string | null;
  variantLabel: string | null;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  state: "in_stock" | "low_stock" | "out_of_stock";
}

export interface DashboardSummary {
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
  };
  orders: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    /** Sum of totals of orders an admin has marked Completed, in pesewas. */
    completedValue: number;
  };
  recentOrders: OrderDTO[];
  lowStockItems: InventoryRow[];
}
