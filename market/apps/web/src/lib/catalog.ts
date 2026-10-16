/**
 * Server-side, cached reads of the public catalogue for storefront pages.
 * Results are tagged so the API can invalidate them after admin changes
 * (see app/api/revalidate). Failed reads are cached only briefly.
 */
import { cacheLife, cacheTag } from "next/cache";
import type {
  BannerDTO,
  CategoryDTO,
  Paginated,
  ProductDTO,
  ProductSort,
  StoreSettingsDTO,
} from "@aba-mart/shared";
import { fallbackSettings } from "@/config/site";
import { buildQuery } from "@/lib/utils";
import { catalogCacheLife, fetchCatalogApi as fetchApi, type FetchResult } from "@/lib/catalogTransport";

const building = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Keeps successful results for minutes; failures expire quickly so the page recovers on its own.
 * Failed build-time reads stay stable across prerender passes and revalidate after one second.
 */
function lifetimeFor(result: FetchResult<unknown>): void {
  const lifetime = catalogCacheLife(result, building);
  if (lifetime === "minutes") cacheLife("minutes");
  else if (lifetime === "seconds") cacheLife("seconds");
  else cacheLife(lifetime);
}

/**
 * Settings for <head> metadata. Unlike getSettings(), a failed read is still
 * cached briefly (with default branding) so metadata never forces otherwise
 * static pages to render at request time - e.g. when building while the API is offline.
 */
export async function getMetadataSettings(): Promise<StoreSettingsDTO> {
  "use cache";
  cacheTag("settings");
  const result = await fetchApi<StoreSettingsDTO>("/settings/public");
  // Metadata must stay prerenderable even when the API is unavailable.
  if (result.ok) cacheLife("minutes");
  else cacheLife({ stale: 30, revalidate: 1, expire: 300 });
  return result.ok ? result.data : fallbackSettings;
}

export async function getSettings(): Promise<StoreSettingsDTO> {
  "use cache";
  cacheTag("settings");
  const result = await fetchApi<StoreSettingsDTO>("/settings/public");
  lifetimeFor(result);
  return result.ok ? result.data : fallbackSettings;
}

/** Active categories, or null when they could not be loaded. */
export async function getCategories(): Promise<CategoryDTO[] | null> {
  "use cache";
  cacheTag("categories");
  const result = await fetchApi<CategoryDTO[]>("/categories");
  lifetimeFor(result);
  return result.ok ? result.data : null;
}

export async function getBanners(): Promise<BannerDTO[]> {
  "use cache";
  cacheTag("banners");
  const result = await fetchApi<BannerDTO[]>("/banners");
  lifetimeFor(result);
  return result.ok ? result.data : [];
}

export interface ProductQuery {
  q?: string;
  category?: string;
  sort?: ProductSort;
  availability?: "all" | "in-stock";
  featured?: boolean;
  onSale?: boolean;
  exclude?: string;
  page?: number;
  limit?: number;
}

/** A page of visible products, or null when the catalogue could not be loaded. */
export async function getProducts(query: ProductQuery = {}): Promise<Paginated<ProductDTO> | null> {
  "use cache";
  cacheTag("products");
  const result = await fetchApi<Paginated<ProductDTO>>(
    `/products${buildQuery({
      q: query.q,
      category: query.category,
      sort: query.sort && query.sort !== "newest" ? query.sort : undefined,
      availability: query.availability === "in-stock" ? "in-stock" : undefined,
      featured: query.featured,
      onSale: query.onSale,
      exclude: query.exclude,
      page: query.page && query.page > 1 ? query.page : undefined,
      limit: query.limit,
    })}`,
  );
  lifetimeFor(result);
  return result.ok ? result.data : null;
}

export type ProductLookup =
  | { status: "found"; product: ProductDTO; related: ProductDTO[] }
  | { status: "not-found" }
  | { status: "error" };

export async function getProduct(slug: string): Promise<ProductLookup> {
  "use cache";
  cacheTag("products");
  const result = await fetchApi<{ product: ProductDTO; related: ProductDTO[] }>(`/products/${encodeURIComponent(slug)}`);
  lifetimeFor(result);
  if (result.ok) return { status: "found", ...result.data };
  return result.status === 404 || result.status === 400 ? { status: "not-found" } : { status: "error" };
}

export async function getCategory(slug: string): Promise<CategoryDTO | null | "error"> {
  const categories = await getCategories();
  if (!categories) return "error";
  return categories.find((c) => c.slug === slug) ?? null;
}

/** Every visible product (paged through) for the sitemap. */
export async function getAllProductsForSitemap(): Promise<ProductDTO[]> {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  const all: ProductDTO[] = [];
  for (let page = 1; page <= 50; page++) {
    const result = await fetchApi<Paginated<ProductDTO>>(`/products?limit=48&page=${page}`);
    if (!result.ok) break;
    all.push(...result.data.items);
    if (page >= result.data.totalPages) break;
  }
  return all;
}
