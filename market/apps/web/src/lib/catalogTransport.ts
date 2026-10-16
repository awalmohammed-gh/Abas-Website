import type { ApiResponse } from "@aba-mart/shared";

export type FetchResult<T> = { ok: true; data: T } | { ok: false; status: number };

/** Resolve bindings when making the request: they are unavailable during a Vercel build. */
export function getServerApiUrl(): string {
  const service = process.env.API_SERVICE_URL;
  return (service
    ? new URL("api", service.endsWith("/") ? service : `${service}/`).href
    : process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  ).replace(/\/+$/, "");
}

export async function fetchCatalogApi<T>(path: string): Promise<FetchResult<T>> {
  // A protected preview's API and service bindings do not exist while it builds.
  if (process.env.NEXT_PHASE === "phase-production-build" && process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
    return { ok: false, status: 0 };
  }

  let result: FetchResult<T> = { ok: false, status: 0 };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(`${getServerApiUrl()}${path}`, {
        headers: { Accept: "application/json" },
        // MongoDB permits 15 seconds to select a server, plus API initialization time.
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      const body = (await res.json()) as ApiResponse<T> | null;
      if (res.ok && body?.success) return { ok: true, data: body.data };
      result = { ok: false, status: res.status };
    } catch {
      result = { ok: false, status: 0 };
    }
    // Retry interrupted connections and temporary server failures, never missing or forbidden data.
    if (result.status !== 0 && result.status !== 408 && result.status !== 429 && result.status < 500) break;
  }
  console.error("[catalog] API read failed", { path: path.split("?")[0], status: result.status });
  return result;
}

/** Failed prerenders remain stable for the build but revalidate after one second. */
export function catalogCacheLife(result: FetchResult<unknown>, building: boolean) {
  if (result.ok || result.status === 404) return "minutes" as const;
  return building ? { stale: 30, revalidate: 1, expire: 300 } : "seconds" as const;
}
