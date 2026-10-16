import { LIMITS, type CartQuote } from "@aba-mart/shared";
import { CustomerSession, type CustomerSessionDoc, type GuestCartItem } from "../models/CustomerSession.js";
import { ApiError } from "../utils/ApiError.js";
import { activeGuestFilter } from "./customerSessionService.js";
import { quoteCart } from "./orderService.js";

export const cartKey = (item: Pick<GuestCartItem, "productId" | "variantId">) => `${item.productId}:${item.variantId ?? "base"}`;

export async function getCart(session: CustomerSessionDoc): Promise<CartQuote> {
  const current = await CustomerSession.findOne(activeGuestFilter(session)).lean<CustomerSessionDoc>();
  if (!current) throw ApiError.unauthorized("Your guest session has ended.", "GUEST_SESSION_EXPIRED");
  return quoteCart(current.cart);
}

export async function mutateCart(
  session: CustomerSessionDoc,
  transform: (items: GuestCartItem[]) => GuestCartItem[],
  validate = true,
): Promise<CartQuote> {
  // Compare-and-swap prevents concurrent tabs from overwriting one another's changes.
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await CustomerSession.findOne(activeGuestFilter(session)).lean<CustomerSessionDoc>();
    if (!current) throw ApiError.unauthorized("Your guest session has ended.", "GUEST_SESSION_EXPIRED");
    const items = transform(current.cart.map((item) => ({ ...item })));
    if (items.length > LIMITS.maxCartLines || items.some((item) => item.quantity > LIMITS.maxLineQuantity)) {
      throw ApiError.conflict("Your cart has reached the item or quantity limit.", "CART_LIMIT");
    }
    const quote = await quoteCart(items);
    if (validate && quote.hasIssues) {
      throw ApiError.conflict("An item or quantity is no longer available. Please review your cart.", "CART_CHANGED", { quote });
    }
    const result = await CustomerSession.updateOne(
      { ...activeGuestFilter(session), cartRevision: current.cartRevision },
      { $set: { cart: items, lastActiveAt: new Date() }, $inc: { cartRevision: 1 } },
    );
    if (result.modifiedCount) return quote;
  }
  throw ApiError.conflict("Your cart changed in another tab. Please try again.", "CART_CHANGED");
}
