"use client";

import { useContext, useSyncExternalStore } from "react";
import { CartContext, type CartContextValue } from "@/contexts/CartContext";

const noopSubscribe = () => () => {};

/**
 * The provider hydrates before streamed Suspense content, so each consumer
 * checks for itself whether it is still hydrating and, if so, renders the
 * same empty cart the server did.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  if (isClient) return context;
  return { ...context, lines: [], hydrated: false, itemCount: 0, subtotal: 0 };
}
