"use client";

import Image from "next/image";
import Link from "next/link";
import { FiArchive, FiEdit2, FiEye, FiEyeOff, FiRotateCcw, FiStar, FiTrash2 } from "react-icons/fi";
import { discountPercent, formatGHS } from "@aba-mart/shared";
import { cn } from "@/lib/utils";
import { priceLabel, StatusBadges, stockLabel, type ProductTableProps } from "./ProductTable";

/** Storefront-style product cards for the admin grid view; same actions as the table. */
export function ProductCards({ products, busyId, onToggleActive, onToggleFeatured, onArchive, onRestore, onDelete, selectedIds, onSelectionChange }: ProductTableProps) {
  const busy = busyId !== null;
  const iconButton = "inline-flex h-10 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-brand/40 hover:bg-brand-50 hover:text-brand disabled:opacity-40";

  return (
    <ul className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => {
        const selected = selectedIds.has(product.id);
        const discount = product.variants.length === 0 ? discountPercent(product.price, product.compareAtPrice) : null;
        return (
          <li key={product.id} className="min-w-0">
            <article className="admin-product-card" data-selected={selected}>
              <div className="admin-product-card-image">
                <Image src={product.images[0]?.url || "/images/placeholders/product.svg"} alt="" fill sizes="(min-width: 1280px) 240px, (min-width: 768px) 30vw, 45vw" className="object-contain" />
                <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                  {discount && <span className="rounded-md bg-[#f53625] px-2 py-1 text-[11px] font-bold leading-none text-white">-{discount}%</span>}
                  <StatusBadges product={product} />
                </div>
                <label className="absolute right-1 top-1 inline-flex size-11 cursor-pointer items-center justify-center rounded-lg">
                  <span className="flex size-7 items-center justify-center rounded-md bg-white/95 shadow-sm">
                    <input type="checkbox" checked={selected} disabled={busy} onChange={(event) => onSelectionChange(product.id, event.target.checked)} aria-label={`Select ${product.name}`} className="size-4.5 accent-brand disabled:cursor-not-allowed" />
                  </span>
                </label>
              </div>

              <div className="flex flex-1 flex-col gap-1 px-1 pt-3">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{product.category?.name ?? "No category"}</p>
                <Link href={`/admin/products/${product.id}/edit`} className="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:text-brand">
                  {product.name}
                </Link>
                <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
                  <span className="font-display text-base font-bold text-[#eb2b13]">{priceLabel(product)}</span>
                  {discount && product.compareAtPrice && <span className="text-xs text-muted line-through">{formatGHS(product.compareAtPrice)}</span>}
                </p>
                <p className="text-xs text-muted">Stock: {stockLabel(product)}</p>
              </div>

              <div className="mt-3 space-y-1.5">
                {product.isArchived ? (
                  <button type="button" disabled={busy} onClick={() => onRestore(product)} className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-brand text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50">
                    <FiRotateCcw className="size-4" aria-hidden="true" /> Restore
                  </button>
                ) : (
                  <Link href={`/admin/products/${product.id}/edit`} className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-brand text-xs font-semibold text-white transition-colors hover:bg-brand-700">
                    <FiEdit2 className="size-4" aria-hidden="true" /> Edit product
                  </Link>
                )}
                <div className={cn("grid gap-1.5", product.isArchived ? "grid-cols-1" : "grid-cols-4")}>
                  {!product.isArchived && (
                    <>
                      <button type="button" disabled={busy} onClick={() => onToggleActive(product)} className={iconButton} aria-label={product.isActive ? `Hide ${product.name} from the store` : `Show ${product.name} in the store`} title={product.isActive ? "Hide from store" : "Show in store"}>
                        {product.isActive ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
                      </button>
                      <button type="button" disabled={busy} onClick={() => onToggleFeatured(product)} className={cn(iconButton, product.isFeatured && "border-accent/60 bg-accent-50 text-accent-700")} aria-pressed={product.isFeatured} aria-label={product.isFeatured ? `Remove ${product.name} from featured` : `Feature ${product.name}`} title={product.isFeatured ? "Unfeature" : "Feature on homepage"}>
                        <FiStar className={cn("size-4", product.isFeatured && "fill-current")} />
                      </button>
                      <button type="button" disabled={busy} onClick={() => onArchive(product)} className={cn(iconButton, "hover:border-danger/40 hover:bg-danger-50 hover:text-danger")} aria-label={`Archive ${product.name}`} title="Archive (remove from store)">
                        <FiArchive className="size-4" />
                      </button>
                    </>
                  )}
                  <button type="button" disabled={busy} onClick={() => onDelete(product)} className={cn(iconButton, "text-danger hover:border-danger/40 hover:bg-danger-50 hover:text-danger")} aria-label={`Permanently delete ${product.name}`} title="Delete permanently">
                    <FiTrash2 className="size-4" />{product.isArchived && <span className="ml-1.5 text-xs font-semibold">Delete permanently</span>}
                  </button>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
