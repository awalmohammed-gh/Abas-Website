import { env } from "../config/env.js";

export type StorefrontTag = "products" | "categories" | "banners" | "settings";

/**
 * Tells the Next.js storefront to drop cached pages after catalogue changes,
 * so updates show without waiting for the time-based cache to expire.
 * Fire-and-forget: a failure only means the storefront refreshes on its normal schedule.
 */
export function revalidateStorefront(...tags: StorefrontTag[]): Promise<void> {
  if (!env.WEB_REVALIDATE_URL || !env.REVALIDATE_SECRET || env.isTest) return Promise.resolve();
  const unique = [...new Set(tags)];
  return fetch(env.WEB_REVALIDATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-revalidate-secret": env.REVALIDATE_SECRET },
    body: JSON.stringify({ tags: unique }),
    signal: AbortSignal.timeout(4000),
  })
    .then((res) => {
      if (!res.ok) console.warn(`[revalidate] storefront responded ${res.status} for ${unique.join(",")}`);
    })
    .catch((error: unknown) => {
      console.warn(`[revalidate] could not reach storefront: ${(error as Error).message}`);
    });
}
