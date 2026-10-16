import type { Types } from "mongoose";
import type {
  AdminProductDTO,
  BannerDTO,
  CategoryDTO,
  CategorySummary,
  ImageAsset,
  OrderDTO,
  ProductDTO,
  ProductVariantDTO,
  StoreSettingsDTO,
} from "@aba-mart/shared";
import { DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_STOREFRONT_SETTINGS } from "@aba-mart/shared";
import type { BannerDoc } from "../models/Banner.js";
import type { CategoryDoc } from "../models/Category.js";
import type { OrderDoc } from "../models/Order.js";
import type { ProductDoc, ProductVariantDoc } from "../models/Product.js";
import type { SettingsDoc } from "../models/Settings.js";

export const toISO = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

const image = (asset: ImageAsset | null | undefined): ImageAsset | null =>
  asset
    ? {
        url: asset.url,
        publicId: asset.publicId,
        ...(asset.alt ? { alt: asset.alt } : {}),
        ...(asset.width ? { width: asset.width } : {}),
        ...(asset.height ? { height: asset.height } : {}),
      }
    : null;

type PopulatedCategory = Pick<CategoryDoc, "_id" | "name" | "slug">;
export type ProductLean = Omit<ProductDoc, "category" | "variants"> & {
  category: Types.ObjectId | PopulatedCategory | null;
  variants: ProductVariantDoc[];
};

function categorySummary(category: ProductLean["category"]): CategorySummary | null {
  if (!category || !("name" in category)) return null;
  return { id: category._id.toString(), name: category.name, slug: category.slug };
}

function variantDTO(variant: ProductVariantDoc): ProductVariantDTO {
  return {
    id: variant._id.toString(),
    attributes: variant.attributes.map((a) => ({ name: a.name, value: a.value })),
    sku: variant.sku ?? null,
    price: variant.price ?? null,
    compareAtPrice: variant.compareAtPrice ?? null,
    stock: variant.stock,
    isActive: variant.isActive,
  };
}

/** Public product shape: inactive variants are hidden. */
export function toProductDTO(product: ProductLean): ProductDTO {
  const variants = product.variants.filter((v) => v.isActive).map(variantDTO);
  return {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: categorySummary(product.category),
    subCategory: product.subCategory ?? "",
    price: product.price,
    compareAtPrice: product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice : null,
    images: product.images.map((i) => image(i)!),
    options: product.options.map((o) => ({ name: o.name, values: [...o.values] })),
    variants,
    stock: product.stock,
    inStock: product.stock > 0,
    isFeatured: product.isFeatured,
    createdAt: toISO(product.createdAt)!,
    updatedAt: toISO(product.updatedAt)!,
  };
}

export function toAdminProductDTO(product: ProductLean): AdminProductDTO {
  return {
    ...toProductDTO(product),
    compareAtPrice: product.compareAtPrice ?? null,
    variants: product.variants.map(variantDTO),
    isActive: product.isActive,
    isArchived: product.isArchived,
    archivedAt: toISO(product.archivedAt),
    lowStockThreshold: product.lowStockThreshold,
  };
}

export function toCategoryDTO(category: CategoryDoc, productCount?: number): CategoryDTO {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: image(category.image),
    isActive: category.isActive,
    displayOrder: category.displayOrder,
    ...(productCount !== undefined ? { productCount } : {}),
    createdAt: toISO(category.createdAt)!,
    updatedAt: toISO(category.updatedAt)!,
  };
}

export function toBannerDTO(banner: BannerDoc): BannerDTO {
  return {
    id: banner._id.toString(),
    title: banner.title,
    description: banner.description,
    desktopImage: image(banner.desktopImage)!,
    mobileImage: image(banner.mobileImage),
    buttonText: banner.buttonText,
    buttonLink: banner.buttonLink,
    displayOrder: banner.displayOrder,
    isActive: banner.isActive,
    createdAt: toISO(banner.createdAt)!,
    updatedAt: toISO(banner.updatedAt)!,
  };
}

export function toSettingsDTO(settings: SettingsDoc): StoreSettingsDTO {
  return {
    storeName: settings.storeName,
    storeDescription: settings.storeDescription,
    logo: image(settings.logo),
    favicon: image(settings.favicon),
    whatsappNumber: settings.whatsappNumber,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    address: settings.address,
    openingHours: settings.openingHours,
    announcement: settings.announcement,
    socialLinks: {
      facebook: settings.socialLinks?.facebook ?? "",
      instagram: settings.socialLinks?.instagram ?? "",
      tiktok: settings.socialLinks?.tiktok ?? "",
      x: settings.socialLinks?.x ?? "",
      youtube: settings.socialLinks?.youtube ?? "",
    },
    // Records saved before these fields existed are read with the defaults.
    whatsappOrderingEnabled: settings.whatsappOrderingEnabled ?? true,
    whatsappGreeting: settings.whatsappGreeting ?? "",
    whatsappSupportMessage: settings.whatsappSupportMessage ?? "",
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings.notifications },
    storefront: { ...DEFAULT_STOREFRONT_SETTINGS, ...settings.storefront },
    updatedAt: toISO(settings.updatedAt),
  };
}

export function toOrderDTO(order: OrderDoc): OrderDTO {
  return {
    id: order._id.toString(),
    orderReference: order.orderReference,
    customer: { name: order.customer.name, phone: order.customer.phone },
    items: order.items.map((item) => ({
      productId: item.product.toString(),
      variantId: item.variantId ? item.variantId.toString() : null,
      name: item.name,
      slug: item.slug,
      attributes: item.attributes.map((a) => ({ name: a.name, value: a.value })),
      image: item.image ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: order.subtotal,
    total: order.total,
    fulfillmentMethod: order.fulfillmentMethod,
    deliveryLocation: order.deliveryLocation,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    status: order.status,
    inventoryAdjusted: order.inventoryAdjusted,
    statusHistory: order.statusHistory.map((change) => ({
      status: change.status,
      note: change.note,
      changedAt: toISO(change.changedAt)!,
      changedBy: change.changedBy ? change.changedBy.toString() : null,
    })),
    createdAt: toISO(order.createdAt)!,
    updatedAt: toISO(order.updatedAt)!,
  };
}
