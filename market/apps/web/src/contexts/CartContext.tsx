"use client";

import { createContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartQuote } from "@aba-mart/shared";
import type { CartLine, CartLineInput } from "@/types/cart";
import { cartStore } from "./cartStore";

export interface CartContextValue {
  lines: CartLine[];
  hydrated: boolean;
  pending: boolean;
  error: string | null;
  quote: CartQuote | null;
  itemCount: number;
  subtotal: number;
  addItem: (line: CartLineInput, quantity?: number) => Promise<void>;
  setQuantity: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
  applyQuote: (quote: CartQuote) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

const actions = {
  addItem: cartStore.addItem,
  setQuantity: cartStore.setQuantity,
  removeItem: cartStore.removeItem,
  clear: cartStore.clear,
  refresh: cartStore.refresh,
  applyQuote: cartStore.applyQuote,
};

export function CartProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const value = useMemo<CartContextValue>(() => ({
    ...state,
    itemCount: state.lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: state.quote?.subtotal ?? 0,
    ...actions,
  }), [state]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
