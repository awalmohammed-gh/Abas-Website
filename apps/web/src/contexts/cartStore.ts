import { z } from "zod";
import { LIMITS, objectIdSchema, type CartQuote } from "@aba-mart/shared";
import { cartLineKey, type CartLine, type CartLineInput } from "@/types/cart";

const STORAGE_KEY = "aba-mart:cart:v1";

export interface CartState {
  lines: CartLine[];
  hydrated: boolean;
}

export type CartAction =
  | { type: "add"; line: CartLineInput; quantity: number }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "clear" }
  | { type: "applyQuote"; quote: CartQuote }
  | { type: "replace"; lines: CartLine[] };

const limitFor = (line: Pick<CartLine, "maxQuantity">) => Math.max(0, Math.min(line.maxQuantity, LIMITS.maxLineQuantity));

/** Pure reducer: quantities never exceed the known stock or the per-line limit. */
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const key = cartLineKey(action.line.productId, action.line.variantId);
      const existing = state.lines.find((l) => l.key === key);
      if (existing) {
        const updated = { ...existing, ...action.line, key };
        updated.quantity = Math.min(existing.quantity + action.quantity, limitFor(updated));
        return { ...state, lines: state.lines.map((l) => (l.key === key ? updated : l)) };
      }
      if (state.lines.length >= LIMITS.maxCartLines) return state;
      const line: CartLine = { ...action.line, key, quantity: 0 };
      line.quantity = Math.min(Math.max(1, action.quantity), limitFor(line));
      return line.quantity > 0 ? { ...state, lines: [...state.lines, line] } : state;
    }
    case "setQuantity":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.key === action.key ? { ...l, quantity: Math.min(Math.max(1, Math.floor(action.quantity)), Math.max(1, limitFor(l))) } : l,
        ),
      };
    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.key !== action.key) };
    case "clear":
      return { ...state, lines: [] };
    case "applyQuote": {
      // Refresh display prices and stock from the server's authoritative quote.
      const byKey = new Map(action.quote.lines.map((q) => [cartLineKey(q.productId, q.variantId), q]));
      return {
        ...state,
        lines: state.lines.map((line) => {
          const quoted = byKey.get(line.key);
          if (!quoted) return line;
          return {
            ...line,
            name: quoted.name,
            image: quoted.image ?? line.image,
            unitPrice: quoted.unitPrice || line.unitPrice,
            compareAtPrice: quoted.compareAtPrice,
            maxQuantity: quoted.available,
            quantity: quoted.status === "quantity_adjusted" ? quoted.quantity : line.quantity,
          };
        }),
      };
    }
    case "replace":
      return { ...state, lines: action.lines };
  }
}

/* ------------------------------------------------------------ Persistence */

const storedLineSchema = z.object({
  key: z.string().max(80),
  productId: objectIdSchema,
  variantId: objectIdSchema.nullable(),
  slug: z.string().max(140),
  name: z.string().max(200),
  image: z.string().max(500).nullable(),
  attributes: z.array(z.object({ name: z.string().max(30), value: z.string().max(40) })).max(3),
  unitPrice: z.int().min(0),
  compareAtPrice: z.int().min(0).nullable(),
  maxQuantity: z.int().min(0),
  quantity: z.int().min(1).max(LIMITS.maxLineQuantity),
});

/** Anything malformed or tampered with in localStorage is discarded line by line. */
function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, LIMITS.maxCartLines)
      .map((item) => storedLineSchema.safeParse(item))
      .filter((r) => r.success)
      .map((r) => ({ ...r.data, key: cartLineKey(r.data.productId, r.data.variantId) }));
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Storage full or disabled (private mode): the cart still works for this visit.
  }
}

/* ------------------------------------------------- External store for React */

const SERVER_STATE: CartState = { lines: [], hydrated: false };
let state: CartState | null = null;
const listeners = new Set<() => void>();

function current(): CartState {
  if (!state) state = { lines: readStorage(), hydrated: true };
  return state;
}

function emit() {
  for (const listener of listeners) listener();
}

export const cartStore = {
  getSnapshot: (): CartState => current(),
  getServerSnapshot: (): CartState => SERVER_STATE,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        state = { lines: readStorage(), hydrated: true };
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  dispatch(action: CartAction): void {
    const next = cartReducer(current(), action);
    if (next === state) return;
    state = next;
    writeStorage(next.lines);
    emit();
  },
};
