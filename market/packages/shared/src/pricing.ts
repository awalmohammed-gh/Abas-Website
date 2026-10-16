import type { VariantAttribute } from "./types.js";

interface PricedProduct {
  price: number;
  compareAtPrice?: number | null;
}

interface PricedVariant {
  price?: number | null;
  compareAtPrice?: number | null;
}

/**
 * The effective price of a product, or of one of its variants. A variant price
 * override replaces the product price; the compare-at price only carries over
 * from the product when the variant does not override the price.
 */
export function resolvePrice(
  product: PricedProduct,
  variant?: PricedVariant | null,
): { price: number; compareAtPrice: number | null } {
  if (variant && variant.price !== null && variant.price !== undefined) {
    const compareAt = variant.compareAtPrice ?? null;
    return { price: variant.price, compareAtPrice: compareAt && compareAt > variant.price ? compareAt : null };
  }
  const compareAt = product.compareAtPrice ?? null;
  return { price: product.price, compareAtPrice: compareAt && compareAt > product.price ? compareAt : null };
}

/** "Large / Black" */
export function variantLabel(attributes: readonly VariantAttribute[] | null | undefined): string {
  if (!attributes?.length) return "";
  return attributes.map((a) => a.value).join(" / ");
}

/** Price range across active variants, used for listing cards. */
export function priceRange(
  product: PricedProduct & { variants?: (PricedVariant & { isActive?: boolean })[] },
): { min: number; max: number } {
  const active = (product.variants ?? []).filter((v) => v.isActive !== false);
  if (!active.length) return { min: product.price, max: product.price };
  const prices = active.map((v) => resolvePrice(product, v).price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
