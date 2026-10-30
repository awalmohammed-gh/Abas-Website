import type { CategoryDTO } from "@aba-mart/shared";

export const STOREFRONT_CATEGORY_LIMIT = 6;

/** Keep discovery links compact, and surface new admin-created categories immediately. */
export function storefrontCategories(categories: readonly CategoryDTO[] | null | undefined): CategoryDTO[] {
  return (categories ?? [])
    .filter((category) => category.isActive)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "en"))
    .slice(0, STOREFRONT_CATEGORY_LIMIT);
}
