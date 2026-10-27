"use client";

import Image from "next/image";
import Link from "next/link";
import { FiArchive, FiEdit2, FiEye, FiEyeOff, FiRotateCcw, FiStar, FiTrash2 } from "react-icons/fi";
import { formatGHS, priceRange, type AdminProductDTO } from "@aba-mart/shared";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface ProductTableProps {
  products: AdminProductDTO[];
  busyId: string | null;
  onToggleActive: (product: AdminProductDTO) => void;
  onToggleFeatured: (product: AdminProductDTO) => void;
  onArchive: (product: AdminProductDTO) => void;
  onRestore: (product: AdminProductDTO) => void;
  onDelete: (product: AdminProductDTO) => void;
}

function StatusBadges({ product }: { product: AdminProductDTO }) {
  return (
    <div className="flex flex-wrap gap-1">
      {product.isArchived ? (
        <Badge tone="neutral">Archived</Badge>
      ) : product.isActive ? (
        <Badge tone="success">Active</Badge>
      ) : (
        <Badge tone="neutral">Hidden</Badge>
      )}
      {product.isFeatured && <Badge tone="accent">Featured</Badge>}
    </div>
  );
}

function stockLabel(product: AdminProductDTO) {
  const tone = product.stock <= 0 ? "text-danger" : product.stock <= product.lowStockThreshold ? "text-accent-700" : "text-ink";
  return (
    <span className={cn("font-semibold", tone)}>
      {product.stock}
      {product.variants.length > 0 && <span className="ml-1 text-xs font-normal text-muted">({product.variants.length} variants)</span>}
    </span>
  );
}

function priceLabel(product: AdminProductDTO) {
  const range = priceRange(product);
  return range.min === range.max ? formatGHS(range.min) : `${formatGHS(range.min)} – ${formatGHS(range.max)}`;
}

export function ProductTable({ products, busyId, onToggleActive, onToggleFeatured, onArchive, onRestore, onDelete }: ProductTableProps) {
  const actions = (product: AdminProductDTO) => {
    const busy = busyId !== null;
    const iconButton = "inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand disabled:opacity-40";
    const deleteButton = (
      <button type="button" disabled={busy} onClick={() => onDelete(product)} aria-label={`Permanently delete ${product.name}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger-50 disabled:opacity-40">
        <FiTrash2 className="size-4" aria-hidden="true" /> Delete
      </button>
    );
    if (product.isArchived) {
      return (
        <div className="flex w-full flex-wrap items-center justify-end gap-1 md:w-auto">
        <button type="button" disabled={busy} onClick={() => onRestore(product)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-brand-50">
          <FiRotateCcw className="size-4" aria-hidden="true" /> Restore
        </button>
        {deleteButton}
        </div>
      );
    }
    return (
      <div className="flex w-full flex-wrap items-center justify-end gap-1 md:w-auto md:flex-nowrap">
        <Link href={`/admin/products/${product.id}/edit`} className={iconButton} aria-label={`Edit ${product.name}`} title="Edit">
          <FiEdit2 className="size-4" />
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleActive(product)}
          className={iconButton}
          aria-label={product.isActive ? `Hide ${product.name} from the store` : `Show ${product.name} in the store`}
          title={product.isActive ? "Hide from store" : "Show in store"}
        >
          {product.isActive ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleFeatured(product)}
          className={cn(iconButton, product.isFeatured && "text-accent-700")}
          aria-pressed={product.isFeatured}
          aria-label={product.isFeatured ? `Remove ${product.name} from featured` : `Feature ${product.name}`}
          title={product.isFeatured ? "Unfeature" : "Feature on homepage"}
        >
          <FiStar className={cn("size-4", product.isFeatured && "fill-current")} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onArchive(product)}
          className={cn(iconButton, "hover:bg-danger-50 hover:text-danger")}
          aria-label={`Archive ${product.name}`}
          title="Archive (remove from store)"
        >
          <FiArchive className="size-4" />
        </button>
        {deleteButton}
      </div>
    );
  };

  const thumb = (product: AdminProductDTO) => (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-cream-200">
      <Image src={product.images[0]?.url || "/images/placeholders/product.svg"} alt="" fill sizes="48px" className="object-cover" />
    </div>
  );

  return (
    <>
      {/* Phones and small tablets: cards */}
      <ul className="divide-y divide-line md:hidden">
        {products.map((product) => (
          <li key={product.id} className="space-y-3 p-4">
            <div className="flex gap-3">
              {thumb(product)}
              <div className="min-w-0 flex-1">
                <Link href={`/admin/products/${product.id}/edit`} className="line-clamp-2 font-semibold text-ink hover:text-brand">
                  {product.name}
                </Link>
                <p className="text-xs text-muted">{product.category?.name ?? "No category"}</p>
                <p className="mt-1 text-sm">
                  {priceLabel(product)} · Stock {stockLabel(product)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadges product={product} />
              {actions(product)}
            </div>
          </li>
        ))}
      </ul>

      {/* Tablets and up: table */}
      <div className="hidden min-w-0 max-w-full overflow-x-auto overscroll-x-contain md:block" role="region" aria-label="Products table" tabIndex={0}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-cream/60 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Product</th>
              <th scope="col" className="px-3 py-3 font-semibold">Price</th>
              <th scope="col" className="px-3 py-3 font-semibold">Stock</th>
              <th scope="col" className="px-3 py-3 font-semibold">Status</th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-cream/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {thumb(product)}
                    <div className="min-w-0">
                      <Link href={`/admin/products/${product.id}/edit`} className="line-clamp-1 font-semibold text-ink hover:text-brand">
                        {product.name}
                      </Link>
                      <p className="text-xs text-muted">{product.category?.name ?? "No category"}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {priceLabel(product)}
                  {product.compareAtPrice && product.variants.length === 0 && (
                    <span className="ml-1.5 text-xs text-muted line-through">{formatGHS(product.compareAtPrice)}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3">{stockLabel(product)}</td>
                <td className="px-3 py-3">
                  <StatusBadges product={product} />
                </td>
                <td className="px-5 py-3">{actions(product)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
