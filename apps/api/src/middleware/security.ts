import type { RequestHandler } from "express";
import { rateLimit, type Options } from "express-rate-limit";
import type { ApiErrorBody } from "@aba-mart/shared";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Browsers always send Origin on cross-site state-changing requests. Rejecting
 * unknown origins stops form-post CSRF even before cookies or CORS come into play.
 */
export const originGuard: RequestHandler = (req, _res, next) => {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  const origin = req.get("origin");
  if (origin && !env.CLIENT_ORIGIN.includes(origin.replace(/\/+$/, ""))) {
    return next(ApiError.forbidden("Requests from this website are not allowed.", "ORIGIN_NOT_ALLOWED"));
  }
  next();
};

function limiter(windowMinutes: number, limit: number, message: string, extra: Partial<Options> = {}) {
  const body: ApiErrorBody = { success: false, error: { code: "RATE_LIMITED", message } };
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, res) => {
      res.status(429).json(body);
    },
    ...extra,
  });
}

export const apiLimiter = limiter(15, 1500, "Too many requests. Please slow down and try again shortly.");

export const loginLimiter = limiter(15, 10, "Too many sign-in attempts. Please wait 15 minutes and try again.", {
  skipSuccessfulRequests: true,
});

export const orderLimiter = limiter(15, 30, "Too many order attempts. Please wait a few minutes and try again.");

export const quoteLimiter = limiter(15, 300, "Too many cart checks. Please wait a moment.");

export const uploadLimiter = limiter(15, 100, "Too many uploads. Please wait a few minutes.");
