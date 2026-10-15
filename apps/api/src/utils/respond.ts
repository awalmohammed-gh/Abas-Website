import type { Response } from "express";
import type { ApiSuccess } from "@aba-mart/shared";

export function sendSuccess<T>(res: Response, data: T, status = 200): Response<ApiSuccess<T>> {
  return res.status(status).json({ success: true, data });
}

/** Short shared caching for public catalogue reads. Admin and order routes are never cached. */
export function setPublicCache(res: Response, seconds = 30): void {
  res.setHeader("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
}
