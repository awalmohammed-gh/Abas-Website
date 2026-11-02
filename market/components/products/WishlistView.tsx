"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { FiAlertCircle, FiHeart } from "react-icons/fi";
import type { Paginated, ProductDTO } from "@aba-mart/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import { confirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { clearWishlist, useWishlistIds, WISHLIST_LIMIT } from "@/hooks/useWishlist";
import { api, errorMessage } from "@/lib/api";
import { ProductGrid, ProductGridSkeleton } from "./ProductGrid";

const noopSubscribe = () => () => {};

/** Loads the products saved on this device, newest first, at their current prices and stock. */
export function WishlistView() {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const ids = useWishlistIds();
  const key = ids.join(",");
  const [loaded, setLoaded] = useState<{ ids: Set<string>; items: ProductDTO[] } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Removing an item only hides it; a fetch is needed only for IDs not looked up yet.
  const needsFetch = ids.length > 0 && (!loaded || ids.some((id) => !loaded.ids.has(id)));
  const failed = error?.key === key ? error.message : null;

  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    const requested = key.split(",");
    api
      .get<Paginated<ProductDTO>>(`/products?ids=${key}&limit=${WISHLIST_LIMIT}`, controller.signal)
      .then((result) => setLoaded({ ids: new Set(requested), items: result.items }))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError({ key, message: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [needsFetch, key, attempt]);

  const byId = new Map(loaded?.items.map((product) => [product.id, product]));
  const products = [...ids].reverse().flatMap((id) => byId.get(id) ?? []);
  const unavailable = loaded ? ids.filter((id) => loaded.ids.has(id) && !byId.has(id)).length : 0;

  async function clearAll() {
    if (!(await confirm({ title: "Clear your wishlist?", description: "All saved items will be removed from this device.", confirmLabel: "Clear wishlist", tone: "danger" }))) return;
    try {
      clearWishlist();
    } catch {
      toast.error("Your wishlist could not be changed on this device.");
    }
  }

  const loading = !isClient || (needsFetch && !failed);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-ink sm:text-[15px]">
          {loading ? "" : `${products.length} saved item${products.length === 1 ? "" : "s"}`}
        </p>
        {isClient && ids.length > 0 && (
          <Button variant="secondary" size="sm" onClick={clearAll}>
            Clear wishlist
          </Button>
        )}
      </div>

      {failed ? (
        <EmptyState
          icon={<FiAlertCircle />}
          title="We couldn't load your wishlist"
          description={failed}
          action={<Button onClick={() => { setError(null); setAttempt((value) => value + 1); }}>Try again</Button>}
        />
      ) : loading ? (
        <ProductGridSkeleton count={Math.min(Math.max(ids.length, 4), 8)} className="!gap-3 sm:!gap-4" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<FiHeart />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here for later."
          action={<ButtonLink href="/shop">Browse products</ButtonLink>}
        />
      ) : (
        <ProductGrid products={products} priorityCount={4} className="!gap-3 sm:!gap-4" />
      )}

      {!loading && !failed && unavailable > 0 && (
        <p className="text-sm text-muted">
          {unavailable === 1 ? "1 saved item is" : `${unavailable} saved items are`} no longer available.
        </p>
      )}
    </div>
  );
}
