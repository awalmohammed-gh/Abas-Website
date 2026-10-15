import type { CartQuote } from "@aba-mart/shared";
import { errorMessage } from "@/lib/api";
import { saveLastOrder } from "@/components/cart/lastOrderStore";
import { ensureGuestSession, GUEST_CHANGED_EVENT, guestApi } from "@/lib/guest-api";
import { cartLineKey, type CartLine, type CartLineInput } from "@/types/cart";

export interface CartState {
  lines: CartLine[];
  quote: CartQuote | null;
  hydrated: boolean;
  pending: boolean;
  error: string | null;
}

const SERVER_STATE: CartState = { lines: [], quote: null, hydrated: false, pending: false, error: null };
let state = SERVER_STATE;
let generation = 0;
let requestVersion = 0;
let queue: Promise<unknown> = Promise.resolve();
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();

function emit(update: Partial<CartState>) {
  state = { ...state, ...update };
  listeners.forEach((listener) => listener());
}

function acceptQuote(quote: CartQuote) {
  const lines: CartLine[] = quote.lines.map((line) => ({
    key: cartLineKey(line.productId, line.variantId),
    productId: line.productId, variantId: line.variantId,
    slug: line.slug, name: line.name, image: line.image, attributes: line.attributes,
    unitPrice: line.unitPrice, compareAtPrice: line.compareAtPrice,
    maxQuantity: line.available, quantity: line.requestedQuantity,
  }));
  emit({ lines, quote, hydrated: true, error: null });
}

async function refresh(): Promise<void> {
  const visit = generation;
  const version = ++requestVersion;
  try {
    await ensureGuestSession(true);
    const quote = await guestApi.get<CartQuote>("/cart");
    if (visit === generation && version === requestVersion) acceptQuote(quote);
  } catch (error) {
    if (visit === generation && version === requestVersion) emit({ hydrated: true, error: errorMessage(error) });
  }
}

function mutate(path: string, method: "post" | "patch" | "delete", body?: unknown): Promise<void> {
  const visit = generation;
  const work = queue.catch(() => undefined).then(async () => {
    if (visit !== generation) throw new Error("Your guest session changed. Please try again.");
    ++requestVersion;
    emit({ pending: true, error: null });
    try {
      const quote = await (method === "delete" ? guestApi.delete<CartQuote>(path) : guestApi[method]<CartQuote>(path, body));
      if (visit !== generation) throw new Error("Your guest session changed. Please try again.");
      ++requestVersion;
      acceptQuote(quote);
      channel?.postMessage("refresh");
    } catch (error) {
      if (visit === generation) emit({ error: errorMessage(error) });
      throw error;
    } finally {
      if (visit === generation) emit({ pending: false });
    }
  });
  queue = work;
  return work;
}

function sessionChanged() {
  saveLastOrder(null);
  generation += 1;
  requestVersion += 1;
  emit({ ...SERVER_STATE });
  void refresh();
}

/** Server-owned cart; no cart or ownership secret is read from browser storage. */
export const cartStore = {
  getSnapshot: (): CartState => state,
  getServerSnapshot: (): CartState => SERVER_STATE,
  refresh,
  applyQuote: acceptQuote,
  addItem: (line: CartLineInput, quantity = 1) => mutate("/cart/items", "post", {
    productId: line.productId, variantId: line.variantId, quantity,
  }),
  setQuantity: (key: string, quantity: number) => mutate(`/cart/items/${encodeURIComponent(key)}`, "patch", { quantity }),
  removeItem: (key: string) => mutate(`/cart/items/${encodeURIComponent(key)}`, "delete"),
  clear: () => mutate("/cart", "delete"),
  notifySessionChanged: () => channel?.postMessage("session"),
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1) {
      void refresh();
      window.addEventListener("focus", refresh);
      window.addEventListener(GUEST_CHANGED_EVENT, sessionChanged);
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("aba-guest-cart");
        channel.onmessage = (event) => {
          if (event.data === "session") {
            window.dispatchEvent(new Event(GUEST_CHANGED_EVENT));
          } else {
            void refresh();
          }
        };
      }
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        generation += 1;
        requestVersion += 1;
        state = SERVER_STATE;
        window.removeEventListener("focus", refresh);
        window.removeEventListener(GUEST_CHANGED_EVENT, sessionChanged);
        channel?.close();
        channel = null;
      }
    };
  },
};
