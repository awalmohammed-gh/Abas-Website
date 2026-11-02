import Link from "next/link";
import { FiAlertCircle, FiSearch } from "react-icons/fi";
import { PRODUCT_SORTS, type ProductSort } from "@aba-mart/shared";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategories, getProducts } from "@/lib/catalog";
import { buildQuery, firstParam } from "@/lib/utils";
import { Pagination } from "./Pagination";
import { ProductGrid, ProductGridSkeleton } from "./ProductGrid";
import { parseFilters } from "./ProductListing";
import { ShopToolbar, type ShopView } from "./ShopToolbar";

const PAGE_SIZE = 12;
type SearchParams = Record<string, string | string[] | undefined>;

/** The /shop catalogue: result count, sort, grid or list layout and pagination. */
export async function ShopListing({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const view: ShopView = firstParam(params.view) === "list" ? "list" : "grid";

  const [result, categories] = await Promise.all([
    getProducts({
      q: filters.q || undefined,
      category: filters.category || undefined,
      sort: filters.sort,
      availability: filters.availability,
      onSale: filters.onSale || undefined,
      page: filters.page,
      limit: PAGE_SIZE,
    }),
    filters.category ? getCategories() : Promise.resolve(null),
  ]);

  /** Shop URL with the current state; any override starts from page 1 unless it sets a page. */
  const hrefWith = (next: { sort?: ProductSort; view?: ShopView; page?: number } = {}) => {
    const sort = next.sort ?? filters.sort;
    const nextView = next.view ?? view;
    return `/shop${buildQuery({
      q: filters.q,
      category: filters.category,
      sort: sort === "newest" ? undefined : sort,
      availability: filters.availability === "in-stock" ? "in-stock" : undefined,
      onSale: filters.onSale || undefined,
      view: nextView === "list" ? "list" : undefined,
      page: next.page && next.page > 1 ? next.page : undefined,
    })}`;
  };

  const categoryName = filters.category ? (categories?.find((c) => c.slug === filters.category)?.name ?? filters.category) : "";
  const activeFilters = [
    filters.q && `“${filters.q}”`,
    categoryName,
    filters.onSale && "Special offers",
    filters.availability === "in-stock" && "In stock",
  ].filter(Boolean) as string[];

  let summary = "";
  if (result) {
    const first = result.total ? (result.page - 1) * PAGE_SIZE + 1 : 0;
    const last = Math.min(result.page * PAGE_SIZE, result.total);
    summary = `Showing ${first}–${last} of ${result.total} product${result.total === 1 ? "" : "s"}`;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <ShopToolbar
        summary={summary}
        sort={filters.sort}
        sortHrefs={Object.fromEntries(PRODUCT_SORTS.map((sort) => [sort, hrefWith({ sort })])) as Record<ProductSort, string>}
        view={view}
        viewHrefs={{ grid: hrefWith({ view: "grid", page: filters.page }), list: hrefWith({ view: "list", page: filters.page }) }}
      />
      {activeFilters.length > 0 && (
        <p className="-mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>Filtered by</span>
          {activeFilters.map((label) => <span key={label} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand">{label}</span>)}
          <Link href={view === "list" ? "/shop?view=list" : "/shop"} className="text-xs font-semibold text-ink underline-offset-2 hover:underline">Clear</Link>
        </p>
      )}

      {result === null ? (
        <EmptyState
          icon={<FiAlertCircle />}
          title="We couldn't load products"
          description="The store is having trouble reaching our catalogue. Please refresh the page in a moment."
        />
      ) : (
        <>
          <ProductGrid
            products={result.items}
            layout={view}
            priorityCount={4}
            className={view === "grid" ? "!gap-3 sm:!gap-4" : undefined}
            empty={
              <EmptyState
                icon={<FiSearch />}
                title={activeFilters.length ? "No products match your search" : "No products yet"}
                description={activeFilters.length ? "Try a different word, or clear the filters to see everything." : "New stock is being added. Check back soon or message us on WhatsApp."}
                action={activeFilters.length ? <ButtonLink href="/shop" variant="secondary">Clear filters</ButtonLink> : <ButtonLink href="/">Back to home</ButtonLink>}
              />
            }
          />
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(page) => hrefWith({ page })} />
        </>
      )}
    </div>
  );
}

export function ShopListingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton h-5 w-56" />
        <div className="skeleton h-10 w-60" />
      </div>
      <ProductGridSkeleton className="!gap-3 sm:!gap-4" />
    </div>
  );
}
