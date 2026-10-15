"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { PRODUCT_SORTS, PRODUCT_SORT_LABELS, type ProductSort } from "@aba-mart/shared";
import { Spinner } from "@/components/ui/Spinner";
import { useDebounce } from "@/hooks/useDebounce";
import { buildQuery, cn } from "@/lib/utils";

export interface FilterValues {
  q: string;
  category: string;
  sort: ProductSort;
  availability: "all" | "in-stock";
}

interface ProductFiltersProps {
  basePath: string;
  values: FilterValues;
  categories?: { name: string; slug: string }[];
  total: number | null;
}

/** Search, category, sort and availability controls. State lives in the URL so results are shareable. */
export function ProductFilters({ basePath, values, categories, total }: ProductFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(values.q);
  const debouncedSearch = useDebounce(search.trim(), 400);
  const lastPushed = useRef(values.q);

  function navigate(next: Partial<FilterValues>) {
    const merged = { ...values, ...next };
    const categoryInPath = basePath.startsWith("/categories/");
    const target = merged.category && !categoryInPath ? "/shop" : basePath;
    const href = `${target}${buildQuery({
      q: merged.q,
      category: categoryInPath ? undefined : merged.category,
      sort: merged.sort === "newest" ? undefined : merged.sort,
      availability: merged.availability === "in-stock" ? "in-stock" : undefined,
    })}`;
    startTransition(() => router.push(href, { scroll: false }));
  }

  useEffect(() => {
    if (debouncedSearch === lastPushed.current) return;
    lastPushed.current = debouncedSearch;
    navigate({ q: debouncedSearch });
    // navigate only depends on values captured for this search change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const activeFilters = Number(!!values.q) + Number(!!values.category && !!categories) + Number(values.availability === "in-stock");

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-white p-3 sm:p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <div className="relative">
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="product-search"
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="h-11 w-full rounded-xl border border-line bg-cream pl-10 pr-10 text-sm focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
          {pending && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 text-brand" label="Updating results" />}
        </div>

        <div className="grid grid-cols-2 gap-3 md:flex">
          {categories && (
            <div>
              <label htmlFor="filter-category" className="sr-only">
                Category
              </label>
              <select
                id="filter-category"
                value={values.category}
                onChange={(e) => navigate({ category: e.target.value })}
                className="h-11 w-full cursor-pointer rounded-xl border border-line bg-white px-3 text-sm md:w-48"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={cn(!categories && "col-span-2")}>
            <label htmlFor="filter-sort" className="sr-only">
              Sort by
            </label>
            <select
              id="filter-sort"
              value={values.sort}
              onChange={(e) => navigate({ sort: e.target.value as ProductSort })}
              className="h-11 w-full cursor-pointer rounded-xl border border-line bg-white px-3 text-sm md:w-48"
            >
              {PRODUCT_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {PRODUCT_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 text-sm font-medium text-ink has-[:checked]:border-brand has-[:checked]:bg-brand-50">
          <input
            type="checkbox"
            checked={values.availability === "in-stock"}
            onChange={(e) => navigate({ availability: e.target.checked ? "in-stock" : "all" })}
            className="size-4 accent-brand"
          />
          In stock only
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <p aria-live="polite">{total === null ? "" : `${total} product${total === 1 ? "" : "s"}`}</p>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              lastPushed.current = "";
              navigate({ q: "", category: "", availability: "all", sort: "newest" });
            }}
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            <FiX className="size-4" aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
