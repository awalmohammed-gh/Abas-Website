"use client";

import { createContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartQuote } from "@aba-mart/shared";
import type { CartLine, CartLineInput } from "@/types/cart";
import { cartStore } from "./cartStore";

export interface CartContextValue {
  lines: CartLine[];
  /** False until the saved cart has been read in the browser. */
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (line: CartLineInput, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  applyQuote: (quote: CartQuote) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

const actions = {
  addItem: (line: CartLineInput, quantity = 1) => cartStore.dispatch({ type: "add", line, quantity }),
  setQuantity: (key: string, quantity: number) => cartStore.dispatch({ type: "setQuantity", key, quantity }),
  removeItem: (key: string) => cartStore.dispatch({ type: "remove", key }),
  clear: () => cartStore.dispatch({ type: "clear" }),
  applyQuote: (quote: CartQuote) => cartStore.dispatch({ type: "applyQuote", quote }),
};

/** Cart state is a reducer-driven store persisted to localStorage and shared through context. */
export function CartProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      hydrated: state.hydrated,
      itemCount: state.lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: state.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
      ...actions,
    }),
    [state],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
