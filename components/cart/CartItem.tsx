"use client";

import Link from "next/link";
import { FiAlertTriangle, FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { LIMITS, formatGHS, type QuoteLine } from "@aba-mart/shared";
import { ProductImage } from "@/components/products/ProductImage";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import type { CartLine } from "@/types/cart";

export function CartItem({ line, issue }: { line: CartLine; issue?: QuoteLine | null }) {
  const { setQuantity, removeItem, pending } = useCart();
  const max = Math.min(line.maxQuantity, LIMITS.maxLineQuantity);
  const blocked = issue && issue.status !== "ok" && issue.status !== "quantity_adjusted";

  return (
    <li className={cn("flex gap-3 py-5 sm:gap-4", blocked && "opacity-90")}>
      <Link href={`/products/${line.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-cream-200 sm:size-24">
        <ProductImage src={line.image} alt={line.name} sizes="96px" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${line.slug}`} className="line-clamp-2 font-semibold text-ink hover:text-brand">
              {line.name}
            </Link>
            {line.attributes.length > 0 && (
              <p className="mt-0.5 text-sm text-muted">{line.attributes.map((a) => `${a.name}: ${a.value}`).join(" · ")}</p>
            )}
            <p className="mt-0.5 text-sm text-muted">
              {formatGHS(line.unitPrice)} each
              {line.compareAtPrice && <span className="ml-1.5 line-through">{formatGHS(line.compareAtPrice)}</span>}
            </p>
          </div>
          <p className="shrink-0 font-display font-bold text-ink">{formatGHS(line.unitPrice * line.quantity)}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center rounded-xl border border-line bg-white" role="group" aria-label={`Quantity for ${line.name}`}>
            <button
              type="button"
              onClick={() => void setQuantity(line.key, Math.min(line.quantity - 1, max)).catch(() => undefined)}
              disabled={pending || line.quantity <= 1 || !!blocked}
              className="flex size-10 items-center justify-center text-ink disabled:opacity-35"
              aria-label="Decrease quantity"
            >
              <FiMinus />
            </button>
            <span className="w-9 text-center text-sm font-semibold" aria-live="polite">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => void setQuantity(line.key, line.quantity + 1).catch(() => undefined)}
              disabled={pending || line.quantity >= max || !!blocked}
              className="flex size-10 items-center justify-center text-ink disabled:opacity-35"
              aria-label="Increase quantity"
            >
              <FiPlus />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void removeItem(line.key).catch(() => undefined)}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-danger-50 hover:text-danger"
          >
            <FiTrash2 className="size-4" aria-hidden="true" /> Remove
          </button>
        </div>

        {issue?.message && (
          <p
            className={cn(
              "flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
              blocked ? "bg-danger-50 text-danger" : "bg-accent-50 text-accent-700",
            )}
            role="status"
          >
            <FiAlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" /> {issue.message}
            {blocked && " Remove it to continue."}
          </p>
        )}
        {!issue && line.quantity >= max && max > 0 && <p className="text-xs text-muted">Maximum available quantity in cart.</p>}
      </div>
    </li>
  );
}
