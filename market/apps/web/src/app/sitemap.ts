import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllProductsForSitemap, getCategories } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  const url = (path: string) => `${siteUrl}${path}`;

  let products: Awaited<ReturnType<typeof getAllProductsForSitemap>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];

  try {
    const [fetchedProducts, fetchedCategories] = await Promise.all([
      getAllProductsForSitemap().catch(() => []),
      getCategories().catch(() => []),
    ]);
    products = fetchedProducts;
    categories = fetchedCategories;
  } catch {
    // Graceful fallback for offline build time
    products = [];
    categories = [];
  }

  const now = new Date();

  return [
    {
      url: url("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: url("/products"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: url("/shop"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: url("/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: url("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...(categories ?? []).map((category) => ({
      url: url(`/categories/${category.slug}`),
      lastModified: category.updatedAt ? new Date(category.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: url(`/products/${product.slug}`),
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: product.images.slice(0, 3).map((img) => img.url),
    })),
  ];
}
