import type { VariantAttribute } from "@aba-mart/shared";

/**
 * One line in the customer's cart. Prices and stock here are display
 * snapshots only: the API re-prices and re-checks everything at checkout.
 */
export interface CartLine {
  key: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  image: string | null;
  attributes: VariantAttribute[];
  unitPrice: number;
  compareAtPrice: number | null;
  maxQuantity: number;
  quantity: number;
}

export type CartLineInput = Omit<CartLine, "key" | "quantity">;

export const cartLineKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? "base"}`;
