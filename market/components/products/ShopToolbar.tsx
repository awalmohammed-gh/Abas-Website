"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { FiChevronDown, FiGrid, FiList } from "react-icons/fi";
import { PRODUCT_SORTS, PRODUCT_SORT_LABELS, type ProductSort } from "@aba-mart/shared";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

export type ShopView = "grid" | "list";

interface ShopToolbarProps {
  summary: ReactNode;
  sort: ProductSort;
  /** Prebuilt URLs, so the server keeps owning the query format. */
  sortHrefs: Record<ProductSort, string>;
  view: ShopView;
  viewHrefs: Record<ShopView, string>;
}

/** Result count, sort order and grid/list layout. State lives in the URL so results are shareable. */
export function ShopToolbar({ summary, sort, sortHrefs, view, viewHrefs }: ShopToolbarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toggle = "inline-flex size-9 items-center justify-center rounded-md transition-colors duration-200";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-sm text-ink sm:text-[15px]">{summary}</p>
      <div className="flex items-center gap-2">
        <label className="relative flex h-10 items-center rounded-lg border border-line bg-white pl-3 pr-9 text-sm text-ink transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 hover:border-brand/40">
          <span className="whitespace-nowrap">Sort by:</span>
          <select
            value={sort}
            onChange={(event) => startTransition(() => router.push(sortHrefs[event.target.value as ProductSort], { scroll: false }))}
            className="h-full cursor-pointer appearance-none bg-transparent pl-1 font-medium outline-none"
          >
            {PRODUCT_SORTS.map((option) => (
              <option key={option} value={option}>
                {PRODUCT_SORT_LABELS[option]}
              </option>
            ))}
          </select>
          {pending ? (
            <Spinner className="absolute right-3 text-brand" label="Updating results" />
          ) : (
            <FiChevronDown className="pointer-events-none absolute right-3 size-4 text-muted" aria-hidden="true" />
          )}
        </label>
        <div role="group" aria-label="Product layout" className="flex gap-0.5 rounded-lg border border-line bg-white p-0.5">
          {([["grid", "Grid view", FiGrid], ["list", "List view", FiList]] as const).map(([value, label, Icon]) => (
            <Link
              key={value}
              href={viewHrefs[value]}
              scroll={false}
              aria-label={label}
              aria-current={view === value ? "true" : undefined}
              className={cn(toggle, view === value ? "bg-brand text-white" : "text-muted hover:bg-brand-50 hover:text-brand")}
            >
              <Icon className="size-4" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
