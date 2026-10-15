/** URL-safe slug: "Men's T-Shirt (Large)" -> "mens-t-shirt-large" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Removes control characters (keeping new lines when allowed) and trims. */
export function cleanText(input: string, { multiline = false }: { multiline?: boolean } = {}): string {
  const withoutControl = multiline
    ? input.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    : input.replace(/[\u0000-\u001F\u007F]/g, " ");
  const collapsed = multiline
    ? withoutControl.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n")
    : withoutControl.replace(/\s+/g, " ");
  return collapsed.trim();
}

/** Escapes a value for safe use inside a RegExp. */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
