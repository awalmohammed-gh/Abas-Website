"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FiChevronDown, FiSearch, FiSliders, FiX } from "react-icons/fi";
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
  /** Name of the selected category on /shop, shown as a removable filter. Unset on category pages. */
  categoryLabel?: string;
  total: number | null;
}

/** Search, sort and availability controls. State lives in the URL so results are shareable. */
export function ProductFilters({ basePath, values, categoryLabel, total }: ProductFiltersProps) {
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

  function setQuery(q: string) {
    setSearch(q);
    lastPushed.current = q;
    navigate({ q });
  }

  useEffect(() => {
    if (debouncedSearch === lastPushed.current) return;
    lastPushed.current = debouncedSearch;
    navigate({ q: debouncedSearch });
    // navigate only depends on values captured for this search change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const inStockOnly = values.availability === "in-stock";
  type Chip = { key: "q" | "category" | "stock"; label: string };
  const chips: Chip[] = [];
  if (values.q) chips.push({ key: "q", label: `“${values.q}”` });
  if (categoryLabel && values.category) chips.push({ key: "category", label: categoryLabel });
  if (inStockOnly) chips.push({ key: "stock", label: "In stock" });

  function removeFilter(key: Chip["key"]) {
    if (key === "q") setQuery("");
    else if (key === "category") navigate({ category: "" });
    else navigate({ availability: "all" });
  }

  const control = "h-11 rounded-xl border border-line bg-white text-sm text-ink transition-colors duration-200 hover:border-brand/40";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-card md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="product-search" className="sr-only">
            Filter products
          </label>
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="product-search"
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="h-11 w-full rounded-xl bg-cream pl-11 pr-11 text-sm text-ink placeholder:text-muted focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
          />
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
            {pending ? (
              <Spinner className="mr-1.5 text-brand" label="Updating results" />
            ) : (
              search && (
                <button type="button" onClick={() => setQuery("")} className="rounded-full p-1.5 text-muted hover:bg-brand-50 hover:text-ink" aria-label="Clear search">
                  <FiX className="size-4" />
                </button>
              )
            )}
          </span>
        </div>

        <div className="flex min-w-0 gap-2">
          <div className="relative min-w-0 flex-1 md:w-52 md:flex-none">
            <label htmlFor="filter-sort" className="sr-only">
              Sort by
            </label>
            <FiSliders className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <select
              id="filter-sort"
              value={values.sort}
              onChange={(e) => navigate({ sort: e.target.value as ProductSort })}
              className={cn(control, "w-full cursor-pointer appearance-none truncate pl-10 pr-9 focus:outline-none focus:ring-2 focus:ring-brand/20")}
            >
              {PRODUCT_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {PRODUCT_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          </div>

          <label className={cn(control, "flex shrink-0 cursor-pointer items-center gap-2.5 px-3.5 font-medium has-[:checked]:border-brand/40 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/30")}>
            <input
              type="checkbox"
              role="switch"
              checked={inStockOnly}
              onChange={(e) => navigate({ availability: e.target.checked ? "in-stock" : "all" })}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="relative h-5 w-9 shrink-0 rounded-full bg-line transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:bg-brand peer-checked:after:translate-x-4"
            />
            In stock
          </label>
        </div>
      </div>

      <div className="flex min-h-8 flex-wrap items-center gap-2 text-sm">
        <p aria-live="polite" className="mr-1 font-medium text-ink">
          {total === null ? "" : `${total} product${total === 1 ? "" : "s"}`}
        </p>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => removeFilter(chip.key)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-2 text-xs font-medium text-brand transition-colors hover:bg-brand-100"
            aria-label={`Remove filter: ${chip.label}`}
          >
            <span className="truncate">{chip.label}</span>
            <FiX className="size-3.5 shrink-0" aria-hidden="true" />
          </button>
        ))}
        {chips.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              lastPushed.current = "";
              navigate({ q: "", category: "", availability: "all", sort: "newest" });
            }}
            className="text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
