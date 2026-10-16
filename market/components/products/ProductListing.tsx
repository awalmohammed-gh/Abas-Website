import { FiAlertCircle, FiSearch } from "react-icons/fi";
import { PRODUCT_SORTS, SLUG_PATTERN, type CategoryDTO, type ProductSort } from "@aba-mart/shared";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategories, getProducts } from "@/lib/catalog";
import { buildQuery, firstParam } from "@/lib/utils";
import { Pagination } from "./Pagination";
import { ProductFilters, type FilterValues } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";

const PAGE_SIZE = 12;
type SearchParams = Record<string, string | string[] | undefined>;

/** Turns untrusted URL parameters into safe filter values. */
export function parseFilters(params: SearchParams): FilterValues & { page: number } {
  const q = (firstParam(params.q) ?? "").trim().slice(0, 100);
  const category = firstParam(params.category) ?? "";
  const sort = firstParam(params.sort) as ProductSort | undefined;
  const page = Number.parseInt(firstParam(params.page) ?? "1", 10);
  return {
    q,
    category: SLUG_PATTERN.test(category) ? category : "",
    sort: sort && PRODUCT_SORTS.includes(sort) ? sort : "newest",
    availability: firstParam(params.availability) === "in-stock" ? "in-stock" : "all",
    page: Number.isFinite(page) && page > 0 && page < 10_000 ? page : 1,
  };
}

interface ProductListingProps {
  searchParams: Promise<SearchParams>;
  /** When set, the listing is locked to this category (category pages). */
  category?: CategoryDTO;
}

export async function ProductListing({ searchParams, category }: ProductListingProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const effectiveCategory = category?.slug ?? filters.category;
  const basePath = category ? `/categories/${category.slug}` : "/shop";

  const [result, categories] = await Promise.all([
    getProducts({
      q: filters.q || undefined,
      category: effectiveCategory || undefined,
      sort: filters.sort,
      availability: filters.availability,
      page: filters.page,
      limit: PAGE_SIZE,
    }),
    category ? Promise.resolve(null) : getCategories(),
  ]);

  const hrefFor = (page: number) =>
    `${basePath}${buildQuery({
      q: filters.q,
      category: category ? undefined : filters.category,
      sort: filters.sort === "newest" ? undefined : filters.sort,
      availability: filters.availability === "in-stock" ? "in-stock" : undefined,
      page: page > 1 ? page : undefined,
    })}`;

  const hasFilters = !!filters.q || filters.availability === "in-stock" || (!category && !!filters.category);

  return (
    <div className="space-y-6">
      <ProductFilters
        basePath={basePath}
        values={{ ...filters, category: category ? category.slug : filters.category }}
        categories={category ? undefined : (categories ?? []).map((c) => ({ name: c.name, slug: c.slug }))}
        total={result?.total ?? null}
      />

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
            priorityCount={4}
            empty={
              <EmptyState
                icon={<FiSearch />}
                title={hasFilters ? "No products match your search" : category ? `No products in ${category.name} yet` : "No products yet"}
                description={
                  hasFilters
                    ? "Try a different word, another category, or include out-of-stock items."
                    : "New stock is being added. Check back soon or message us on WhatsApp."
                }
                action={hasFilters ? <ButtonLink href={basePath} variant="secondary">Clear filters</ButtonLink> : <ButtonLink href="/">Back to home</ButtonLink>}
              />
            }
          />
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} />
        </>
      )}
    </div>
  );
}
