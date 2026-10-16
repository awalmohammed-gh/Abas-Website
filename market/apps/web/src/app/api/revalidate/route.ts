import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

const ALLOWED_TAGS = new Set(["products", "categories", "banners", "settings"]);

function sameSecret(expected: string, provided: string): boolean {
  // Hash both so the comparison is constant-time regardless of length.
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(provided).digest();
  return timingSafeEqual(a, b);
}

/**
 * Called by the API after catalogue changes so storefront pages refresh
 * immediately instead of waiting for their cache lifetime to pass.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const provided = request.headers.get("x-revalidate-secret") ?? "";
  if (!secret || !provided || !sameSecret(secret, provided)) {
    return Response.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === "string" && ALLOWED_TAGS.has(t)) : [];
  if (!tags.length) return Response.json({ revalidated: false, error: "No valid tags" }, { status: 400 });

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
