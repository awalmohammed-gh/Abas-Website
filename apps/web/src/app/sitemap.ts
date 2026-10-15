import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllProductsForSitemap, getCategories } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getAllProductsForSitemap(), getCategories()]);
  const url = (path: string) => `${siteConfig.url}${path}`;

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/contact"), changeFrequency: "monthly", priority: 0.4 },
    ...(categories ?? []).map((category) => ({
      url: url(`/categories/${category.slug}`),
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: url(`/products/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: product.images.slice(0, 1).map((i) => i.url),
    })),
  ];
}
