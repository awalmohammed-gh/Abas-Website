import type { CategoryDTO } from "@aba-mart/shared";

export const STOREFRONT_CATEGORY_LIMIT = 5;

/** Display labels are curated; links retain the existing API's category slugs and IDs. */
const COLLECTIONS = [
  { name: "Liquid Soap", aliases: ["liquid soap", "liquid soaps"] },
  { name: "Dishwashing Liquid", aliases: ["dishwashing liquid"] },
  { name: "Buggy Jeans", aliases: ["buggy jeans", "baggy jeans", "trousers jeans"] },
  { name: "Short", aliases: ["short", "shorts", "jeans short"] },
  { name: "T-shirt", aliases: ["t shirt", "t shirts", "t shirts tops"] },
] as const;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function storefrontCategories(categories: readonly CategoryDTO[] | null | undefined): CategoryDTO[] {
  const active = (categories ?? []).filter(category => category.isActive);
  return COLLECTIONS.flatMap(collection => {
    for (const alias of collection.aliases) {
      const match = active.filter(category => normalize(category.name) === alias || normalize(category.slug) === alias)
        .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0) || a.displayOrder - b.displayOrder || a.slug.localeCompare(b.slug))[0];
      if (match) return [{ ...match, name: collection.name }];
    }
    return [];
  });
}
